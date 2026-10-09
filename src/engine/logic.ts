/**
 * Logic / action execution engine — STUB (SPEC §4).
 *
 * OUT of foundation scope: compiling user JS via AsyncFunction, running action
 * pipelines, lifecycle hooks, and the acorn+magic-string loop watchdog. A later
 * worker implements all of it. The foundation defines the stable interface so
 * the renderer/engine can call into it today without knowing the implementation.
 *
 * The no-op implementation here intentionally does nothing in Interface mode
 * (SPEC §5: DOM-event logic/actions are OFF in Interface — only inner UI state).
 */

import type { Action, Ctx, Mode } from '@/contracts'

export interface CompileOptions {
  /** Time budget per invocation in ms; watchdog enforces it (SPEC §4). */
  budgetMs?: number
  /** Human label for error attribution. */
  source?: string
}

export interface LogicEngine {
  /**
   * Instrument + compile user code into an async callable (SPEC §4).
   * STUB: returns a no-op. The real engine injects loop budget checks via
   * acorn + magic-string and wraps in an AsyncFunction with `ctx` injected.
   */
  compile(code: string, opts?: CompileOptions): (ctx: Ctx) => Promise<unknown>
  /** Run an ordered action pipeline for one event (SPEC §2). STUB: no-op. */
  runActions(actions: Action[], ctx: Ctx): Promise<void>
}

export interface CreateLogicEngineOptions {
  mode: Mode
  /** Called when compile/runtime throws, for Console + onPageError wiring. */
  onError?: (error: unknown, source?: string) => void
}

export function createLogicEngine(opts: CreateLogicEngineOptions): LogicEngine {
  const enabled = opts.mode === 'preview'

  return {
    compile(code, compileOpts) {
      void code
      void compileOpts
      // STUB — foundation returns an inert callable. Later worker replaces with
      // acorn/magic-string instrumentation + AsyncFunction compilation.
      return async () => {
        if (!enabled) return undefined
        return undefined
      }
    },
    async runActions(actions, ctx) {
      void ctx
      if (!enabled) return // SPEC §5: actions OFF in Interface mode.
      // STUB — later worker executes the pipeline sequentially per SPEC §2.
      for (const _action of actions) {
        void _action
      }
    },
  }
}
