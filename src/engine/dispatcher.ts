/**
 * Action dispatcher (SPEC §2, LOCKED).
 *
 * One event may fire an ORDERED pipeline of actions; the dispatcher runs them
 * strictly sequentially, awaiting each before the next (SPEC §2). Two kinds:
 *
 *  - **Declarative built-ins** — `navigate`, `open_modal`, `open_form`, `refetch`,
 *    `toast`, `emit`, `close`, `submit`. `navigate`/`emit` go through the `ctx`
 *    contract (SPEC §4); the UI-effect ones are delegated to host-provided
 *    {@link ActionEffects} handlers so this module stays free of Vue/UI deps.
 *  - **Imperative** — `{type:'run', code}` is compiled by the logic engine and
 *    invoked with `ctx` (watchdog-guarded, SPEC §4).
 *
 * A failing action reports via `onError` (→ Console + inline, SPEC §9) and stops
 * the remaining pipeline, so a user sees exactly which action broke.
 */

import type { Action, Ctx } from '@/contracts'
import type { LogicEngine } from './logic'

/** Host-provided side-effects for declarative actions that touch UI/services. */
export interface ActionEffects {
  toast?(message: string, level?: 'info' | 'success' | 'warning' | 'error'): void
  openModal?(modal: string, props?: Record<string, unknown>): void
  openForm?(form: string, props?: Record<string, unknown>): void
  close?(target?: string): void
  refetch?(target?: string): void
  submit?(target?: string): void
}

/** Context for one dispatch, for labeling/attribution. */
export interface DispatchMeta {
  blockId?: string
  event?: string
}

export interface ActionDispatcher {
  /**
   * Run an ordered action pipeline for one event (SPEC §2). Resolves when the
   * whole pipeline completes; rejects if an action throws (after reporting it).
   */
  dispatch(
    actions: Action[],
    ctx: Ctx,
    effects?: ActionEffects,
    meta?: DispatchMeta,
  ): Promise<void>
}

export interface CreateDispatcherOptions {
  logic: LogicEngine
  onError?: (error: unknown, source?: string) => void
}

function sourceLabel(meta: DispatchMeta | undefined, index: number, type: string): string {
  const where = meta?.blockId ? `${meta.blockId}` : 'action'
  const ev = meta?.event ? `:${meta.event}` : ''
  return `${where}${ev}[${index}:${type}]`
}

export function createActionDispatcher(opts: CreateDispatcherOptions): ActionDispatcher {
  const { logic } = opts

  async function handle(
    action: Action,
    ctx: Ctx,
    effects: ActionEffects | undefined,
    source: string,
  ): Promise<void> {
    switch (action.type) {
      case 'navigate':
        ctx.navigate(action.to, action.params)
        return
      case 'emit':
        ctx.emit(action.event, action.payload)
        return
      case 'toast':
        effects?.toast?.(action.message, action.level)
        return
      case 'open_modal':
        effects?.openModal?.(action.modal, action.props)
        return
      case 'open_form':
        effects?.openForm?.(action.form, action.props)
        return
      case 'close':
        effects?.close?.(action.target)
        return
      case 'refetch':
        effects?.refetch?.(action.target)
        return
      case 'submit':
        effects?.submit?.(action.target)
        return
      case 'run':
        await logic.run(action.code, ctx, { source })
        return
      default: {
        // Exhaustiveness guard — unknown action types are reported, not fatal.
        const unknown = action as { type?: string }
        opts.onError?.(
          new Error(`[dispatcher] unknown action type "${unknown.type}"`),
          source,
        )
      }
    }
  }

  return {
    async dispatch(actions, ctx, effects, meta) {
      if (!actions?.length) return
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const source = sourceLabel(meta, i, action.type)
        try {
          await handle(action, ctx, effects, source)
        } catch (err) {
          // `run` already reported via logic.onError; report others here. Either
          // way, stop the pipeline so the failure point is unambiguous (SPEC §9).
          if (action.type !== 'run') opts.onError?.(err, source)
          throw err
        }
      }
    },
  }
}
