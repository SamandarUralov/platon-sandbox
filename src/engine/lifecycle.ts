/**
 * Page lifecycle runner (SPEC §2/§4/§5, LOCKED ordering).
 *
 * Runs a page's lifecycle hook code strings via the logic engine, in a fixed
 * order, each awaited before the next so a hook may perform async work (e.g. a
 * query) that the following hook depends on. Lifecycle hooks are PREVIEW-only
 * (SPEC §5) — the caller (PageRenderer) only constructs/invokes this when the
 * mode's capabilities enable lifecycle.
 *
 * If any hook throws, `onPageError` is invoked with the error (if the page
 * defines it) and the error is reported (Console + inline, SPEC §9). `onPageError`
 * itself is never re-entrant: a throw inside it is reported but not looped back.
 */

import type { Ctx, PageLifecycle } from '@/contracts'
import type { LogicEngine } from './logic'

/** Hooks run, in order, when a page is entered/mounted. */
export const INIT_SEQUENCE = ['onPageInit', 'onBeforeRender', 'onPageReady'] as const
/** Hooks run, in order, on an explicit data refresh. */
export const REFRESH_SEQUENCE = ['onBeforeRefresh', 'onAfterRefresh'] as const
/** Hooks run, in order, when a page is left/unmounted. */
export const LEAVE_SEQUENCE = ['onBeforeLeave', 'onPageLeave'] as const

export type LifecycleHookName = keyof PageLifecycle

export interface LifecycleRunner {
  /** Run a single named hook if the page defines it. Returns its result. */
  runHook(name: LifecycleHookName, ctx: Ctx): Promise<unknown>
  /** Run the page-enter sequence in order (onPageInit → onBeforeRender → onPageReady). */
  runInit(ctx: Ctx): Promise<void>
  /** Run the refresh sequence in order (onBeforeRefresh → onAfterRefresh). */
  runRefresh(ctx: Ctx): Promise<void>
  /** Run the leave sequence in order (onBeforeLeave → onPageLeave). */
  runLeave(ctx: Ctx): Promise<void>
}

export interface CreateLifecycleRunnerOptions {
  logic: LogicEngine
  lifecycle: PageLifecycle | undefined
  /** Page id for error attribution. */
  pageId?: string
  onError?: (error: unknown, source?: string) => void
}

export function createLifecycleRunner(opts: CreateLifecycleRunnerOptions): LifecycleRunner {
  const { logic, lifecycle } = opts

  function label(name: string): string {
    return opts.pageId ? `${opts.pageId}:${name}` : name
  }

  async function runOne(name: LifecycleHookName, ctx: Ctx): Promise<unknown> {
    const code = lifecycle?.[name]
    if (!code) return undefined
    return logic.run(code, ctx, { source: label(name) })
  }

  /** Run a hook; on failure, route to onPageError + report. */
  async function runGuarded(name: LifecycleHookName, ctx: Ctx): Promise<unknown> {
    try {
      return await runOne(name, ctx)
    } catch (err) {
      await handleError(err, name, ctx)
      throw err
    }
  }

  async function handleError(err: unknown, origin: string, ctx: Ctx): Promise<void> {
    opts.onError?.(err, label(origin))
    const onPageError = lifecycle?.onPageError
    if (!onPageError || origin === 'onPageError') return
    // Expose the triggering error to the handler via page state.
    ctx.state.page.__error = err instanceof Error ? err.message : String(err)
    try {
      await logic.run(onPageError, ctx, { source: label('onPageError') })
    } catch (handlerErr) {
      opts.onError?.(handlerErr, label('onPageError'))
    }
  }

  async function runSequence(names: readonly LifecycleHookName[], ctx: Ctx): Promise<void> {
    for (const name of names) {
      await runGuarded(name, ctx)
    }
  }

  return {
    runHook: runGuarded,
    runInit: (ctx) => runSequence(INIT_SEQUENCE, ctx),
    runRefresh: (ctx) => runSequence(REFRESH_SEQUENCE, ctx),
    runLeave: (ctx) => runSequence(LEAVE_SEQUENCE, ctx),
  }
}
