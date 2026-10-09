/**
 * Synchronous user-module evaluator (SPEC §4).
 *
 * Shared machinery for code whose **default export** is a value we want (custom
 * components → a component definition; global hooks → a hook factory). The code
 * is instrumented (import rewrite + loop watchdog), has `export default X`
 * rewritten to `return (X)`, and is run once in a plain `Function` with imports
 * resolved through the engine import map. `ctx` is NOT injected — these modules
 * are definition-time, not request-time logic.
 */

import type { ImportMap } from '@/importmap'
import {
  CompileError,
  createRequire,
  createWatchdog,
  instrument,
  REQUIRE_FN,
  TICK_FN,
} from './instrument'

/** Budget for module *definition* evaluation (module top-level). */
export const MODULE_BUDGET_MS = 500

type ModuleFn = (require: (s: string) => unknown, tick: () => void) => unknown

export interface EvaluateModuleOptions {
  importMap?: ImportMap
  /** Human label for error attribution. */
  label?: string
  budgetMs?: number
}

/**
 * Evaluate a user ESM module and return its default export. Throws
 * {@link CompileError} on a parse/eval failure.
 */
export function evaluateUserModule(code: string, opts: EvaluateModuleOptions = {}): unknown {
  const requireFn = createRequire(opts.importMap)
  const label = opts.label ?? 'module'
  let factory: ModuleFn
  try {
    const { code: body } = instrument(code, { module: true, rewriteExports: true })
    factory = new Function(REQUIRE_FN, TICK_FN, body) as ModuleFn
  } catch (err) {
    throw err instanceof CompileError
      ? err
      : new CompileError(
          `failed to compile ${label}: ${err instanceof Error ? err.message : String(err)}`,
          err,
        )
  }

  const tick = createWatchdog(opts.budgetMs ?? MODULE_BUDGET_MS)
  try {
    return factory(requireFn, tick)
  } catch (err) {
    throw err instanceof CompileError
      ? err
      : new CompileError(
          `failed to evaluate ${label}: ${err instanceof Error ? err.message : String(err)}`,
          err,
        )
  }
}
