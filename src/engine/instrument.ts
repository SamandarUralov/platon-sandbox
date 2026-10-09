/**
 * User-code instrumentation + watchdog (SPEC §4, LOCKED).
 *
 * Two jobs, both done at compile time so the result is a plain function body the
 * logic engine can wrap in an `AsyncFunction`:
 *
 *  1. **Watchdog** — parse the code with acorn and, using magic-string, inject a
 *     budget check (`__pl_tick()`) at the top of every loop body (`for`,
 *     `for..in`, `for..of`, `while`, `do..while`). The injected call throws once a
 *     per-invocation time budget (~100ms, SPEC §4) is exceeded — the only reliable
 *     way to break a synchronous infinite loop on the main thread.
 *
 *  2. **Import rewriting** — user code uses real ESM `import`, but an
 *     `AsyncFunction` body cannot contain import declarations. We strip them and
 *     emit `const … = __pl_require('spec')` preamble lines that resolve through the
 *     engine's import map (SPEC §4 locked aliases). `ctx` is injected, never
 *     imported, so it is left untouched.
 *
 * This module is pure (no Vue, no engine deps) so it is trivially unit-testable.
 */

import { parse } from 'acorn'
import MagicString from 'magic-string'
import type { ImportMap, ModuleNamespace } from '@/importmap'

/** Name of the injected per-invocation watchdog tick function. */
export const TICK_FN = '__pl_tick'
/** Name of the injected import resolver function. */
export const REQUIRE_FN = '__pl_require'

/** Thrown by the watchdog when a user-code invocation exceeds its time budget. */
export class WatchdogError extends Error {
  readonly budgetMs: number
  constructor(budgetMs: number) {
    super(
      `[watchdog] execution budget of ${budgetMs}ms exceeded — ` +
        `likely an infinite loop in user code (SPEC §4)`,
    )
    this.name = 'WatchdogError'
    this.budgetMs = budgetMs
  }
}

/** Raised when user code fails to parse/instrument (surfaced as a compile error). */
export class CompileError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'CompileError'
    this.cause = cause
  }
}

/**
 * Build a fresh watchdog `tick` for ONE invocation. The budget is measured from
 * the moment this is created, so every lifecycle hook / action gets its own
 * ~100ms window (SPEC §4). `now` is injectable for deterministic tests.
 */
export function createWatchdog(budgetMs: number, now: () => number = Date.now): () => void {
  const start = now()
  return function tick(): void {
    if (now() - start > budgetMs) throw new WatchdogError(budgetMs)
  }
}

interface AcornNode {
  type: string
  start: number
  end: number
  body?: AcornNode | AcornNode[]
  [key: string]: unknown
}

const LOOP_TYPES = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
])

/** Walk the AST depth-first, invoking `visit` on every node. */
function walk(node: AcornNode, visit: (n: AcornNode) => void): void {
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'start' || key === 'end' || key === 'type') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && typeof (child as AcornNode).type === 'string') {
          walk(child as AcornNode, visit)
        }
      }
    } else if (value && typeof value === 'object' && typeof (value as AcornNode).type === 'string') {
      walk(value as AcornNode, visit)
    }
  }
}

interface ImportBinding {
  specifier: string
  /** Preamble line that recreates the binding from `__pl_require`. */
  preamble: string
}

/** Turn one ImportDeclaration node into a `const … = __pl_require()` preamble. */
function importPreamble(node: AcornNode): ImportBinding {
  const specifier = String((node.source as { value: string }).value)
  const specifiers = (node.specifiers as AcornNode[] | undefined) ?? []
  if (specifiers.length === 0) {
    // Side-effect import: `import 'x'` → resolve for effects, bind nothing.
    return { specifier, preamble: `${REQUIRE_FN}(${JSON.stringify(specifier)});` }
  }

  const named: string[] = []
  const bindings: string[] = []
  for (const spec of specifiers) {
    const local = (spec.local as { name: string }).name
    if (spec.type === 'ImportDefaultSpecifier') {
      named.push(`default: ${local}`)
    } else if (spec.type === 'ImportNamespaceSpecifier') {
      // `import * as ns from 'x'` → bind the whole namespace object.
      bindings.push(`const ${local} = ${REQUIRE_FN}(${JSON.stringify(specifier)});`)
    } else {
      const imported = (spec.imported as { name: string }).name
      named.push(imported === local ? local : `${imported}: ${local}`)
    }
  }
  if (named.length) {
    bindings.unshift(
      `const { ${named.join(', ')} } = ${REQUIRE_FN}(${JSON.stringify(specifier)});`,
    )
  }
  return { specifier, preamble: bindings.join('\n') }
}

export interface InstrumentResult {
  /** Instrumented function body (imports stripped, loop checks injected). */
  code: string
  /** Specifiers the code imported (for eager resolution/validation). */
  imports: string[]
}

export interface InstrumentOptions {
  /** Treat as an ES module so `import` declarations are allowed/stripped. */
  module?: boolean
  /**
   * Rewrite `export` so the body is usable inside a plain `Function`:
   * `export default X` → `return (X)`, `export const a = …` → `const a = …`,
   * bare `export { … }` is dropped. Used when compiling custom components, whose
   * code is an ESM module we evaluate for its default export (SPEC §4).
   */
  rewriteExports?: boolean
}

/**
 * Instrument user code: inject loop watchdog checks and rewrite imports.
 * Throws {@link CompileError} on a parse failure.
 */
export function instrument(code: string, opts: InstrumentOptions = {}): InstrumentResult {
  const asModule = opts.module ?? true
  let ast: AcornNode
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      sourceType: asModule ? 'module' : 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    }) as unknown as AcornNode
  } catch (err) {
    throw new CompileError(
      `failed to parse user code: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  }

  const s = new MagicString(code)
  const imports: string[] = []
  const preambles: string[] = []

  walk(ast, (node) => {
    // 1. Loop watchdog injection.
    if (LOOP_TYPES.has(node.type)) {
      const body = node.body as AcornNode | undefined
      if (!body) return
      if (body.type === 'BlockStatement') {
        // Insert right after the opening brace.
        s.appendLeft(body.start + 1, ` ${TICK_FN}();`)
      } else {
        // Single-statement body (e.g. `while (x) doThing()`): wrap in a block so
        // we have somewhere to put the check without changing semantics.
        s.appendLeft(body.start, `{ ${TICK_FN}(); `)
        s.appendRight(body.end, ` }`)
      }
      return
    }
    // 2. Import rewriting (module mode only).
    if (node.type === 'ImportDeclaration') {
      const { specifier, preamble } = importPreamble(node)
      imports.push(specifier)
      preambles.push(preamble)
      // Remove the import declaration from the body.
      s.remove(node.start, node.end)
      return
    }
    // 3. Export rewriting (opt-in, for component modules).
    if (opts.rewriteExports) {
      if (node.type === 'ExportDefaultDeclaration') {
        const decl = node.declaration as AcornNode
        // Replace the `export default` keywords with a `return`, keep the value.
        s.overwrite(node.start, decl.start, 'return (')
        s.appendRight(decl.end, ')')
      } else if (node.type === 'ExportNamedDeclaration') {
        const decl = node.declaration as AcornNode | undefined
        if (decl) {
          // `export const/function/class …` → strip just the `export ` keyword.
          s.remove(node.start, decl.start)
        } else {
          // Bare `export { a, b }` (optionally `from '…'`) → drop entirely.
          s.remove(node.start, node.end)
        }
      }
    }
  })

  const instrumented = s.toString()
  const preamble = preambles.length ? preambles.join('\n') + '\n' : ''
  return { code: preamble + instrumented, imports }
}

/**
 * Build the `__pl_require` resolver bound to an import map (SPEC §4). Returns the
 * resolved namespace for a specifier, throwing if the specifier is unknown.
 */
export function createRequire(importMap: ImportMap | undefined): (spec: string) => ModuleNamespace {
  return function require(spec: string): ModuleNamespace {
    const ns = importMap?.resolve(spec)
    if (!ns) {
      throw new CompileError(
        `cannot resolve import "${spec}" — not in the import map (SPEC §4 locked aliases)`,
      )
    }
    return ns
  }
}
