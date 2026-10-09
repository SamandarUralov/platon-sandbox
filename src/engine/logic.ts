/**
 * Logic execution engine (SPEC §4, LOCKED).
 *
 * Compiles user JS — lifecycle hooks and `{type:'run'}` actions — into an async
 * callable invoked with the injected `ctx` (SPEC §4 contract). Each piece of code
 * is:
 *   1. instrumented (loop watchdog + import rewriting, see `./instrument`);
 *   2. wrapped in an `AsyncFunction(ctx, __pl_tick, __pl_require, <body>)`;
 *   3. invoked with a FRESH per-call watchdog so every invocation gets its own
 *      ~100ms time budget (SPEC §4).
 *
 * Compile-time failures (syntax/parse) are reported via `onError` and produce a
 * callable that re-throws — so a broken hook surfaces inline rather than crashing
 * the interpreter (SPEC §9). Execution is mode-agnostic here; the wiring layer
 * (event wiring, lifecycle runner) decides WHEN to run per SPEC §5.
 */

import type { Ctx, Mode } from '@/contracts'
import type { ImportMap } from '@/importmap'
import {
  CompileError,
  createRequire,
  createWatchdog,
  instrument,
  REQUIRE_FN,
  TICK_FN,
} from './instrument'

/** Default per-invocation time budget (SPEC §4: ~100ms per function). */
export const DEFAULT_BUDGET_MS = 100

/** `AsyncFunction` constructor (not a global; grabbed off an async fn's proto). */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...callArgs: unknown[]) => Promise<unknown>

export interface CompileOptions {
  /** Time budget per invocation in ms; watchdog enforces it (SPEC §4). */
  budgetMs?: number
  /** Human label for error attribution (hook name, block id, …). */
  source?: string
}

/** A compiled, ready-to-run piece of user code. */
export type CompiledFn = (ctx: Ctx) => Promise<unknown>

export interface LogicEngine {
  /**
   * Instrument + compile user code into an async callable (SPEC §4). The returned
   * function injects a fresh watchdog per call and resolves imports through the
   * engine's import map. Never throws at compile time — a parse error yields a
   * callable that reports + rethrows on invocation.
   */
  compile(code: string, opts?: CompileOptions): CompiledFn
  /** Compile and immediately run, convenience for one-shot hook/action code. */
  run(code: string, ctx: Ctx, opts?: CompileOptions): Promise<unknown>
}

export interface CreateLogicEngineOptions {
  mode: Mode
  /** Import map used to resolve user `import` statements (SPEC §4). */
  importMap?: ImportMap
  /** Default budget for compiled code; overridable per compile. */
  budgetMs?: number
  /** Called when compile/runtime throws, for Console + onPageError wiring. */
  onError?: (error: unknown, source?: string) => void
}

export function createLogicEngine(opts: CreateLogicEngineOptions): LogicEngine {
  const requireFn = createRequire(opts.importMap)
  const defaultBudget = opts.budgetMs ?? DEFAULT_BUDGET_MS

  function compile(code: string, compileOpts: CompileOptions = {}): CompiledFn {
    const budgetMs = compileOpts.budgetMs ?? defaultBudget
    const source = compileOpts.source

    let invoke: (...args: unknown[]) => Promise<unknown>
    try {
      const { code: body } = instrument(code, { module: true })
      invoke = new AsyncFunction('ctx', TICK_FN, REQUIRE_FN, body)
    } catch (err) {
      // Compile-time failure (SPEC §9): report now, return a re-throwing callable.
      const error =
        err instanceof CompileError
          ? err
          : new CompileError(err instanceof Error ? err.message : String(err), err)
      opts.onError?.(error, source)
      return async () => {
        throw error
      }
    }

    return async (ctx: Ctx) => {
      const tick = createWatchdog(budgetMs)
      try {
        return await invoke(ctx, tick, requireFn)
      } catch (err) {
        opts.onError?.(err, source)
        throw err
      }
    }
  }

  return {
    compile,
    run(code, ctx, compileOpts) {
      return compile(code, compileOpts)(ctx)
    },
  }
}
