import { describe, it, expect } from 'vitest'
import type { Action, Ctx } from '@/contracts'
import { createLogicEngine } from '../logic'
import { createActionDispatcher, type ActionEffects } from '../dispatcher'

function makeCtx(log: string[]): Ctx & { __log: string[] } {
  const ctx = {
    blocks: { get: () => undefined, set: () => {} },
    state: { page: {}, global: {} },
    query: { run: async () => null },
    navigate: (to: string) => log.push(`navigate:${to}`),
    http: {} as Ctx['http'],
    user: { role: null, roles: [] },
    emit: (event: string) => log.push(`emit:${event}`),
    __log: log,
  }
  return ctx
}

describe('action dispatcher — sequential pipeline (SPEC §2)', () => {
  it('runs built-in + run actions strictly in order, awaiting async run', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const effects: ActionEffects = { toast: (m) => log.push(`toast:${m}`) }
    const logic = createLogicEngine({ mode: 'preview' })
    const dispatcher = createActionDispatcher({ logic })

    const actions: Action[] = [
      { type: 'toast', message: 'A' },
      { type: 'run', code: 'await new Promise((r) => setTimeout(r, 15)); ctx.__log.push("run-B")' },
      { type: 'navigate', to: 'C' },
      { type: 'run', code: 'ctx.__log.push("run-D")' },
      { type: 'emit', event: 'E' },
    ]

    await dispatcher.dispatch(actions, ctx, effects)
    expect(log).toEqual(['toast:A', 'run-B', 'navigate:C', 'run-D', 'emit:E'])
  })

  it('stops the pipeline at the first failing action', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const logic = createLogicEngine({ mode: 'preview' })
    const dispatcher = createActionDispatcher({ logic })

    const actions: Action[] = [
      { type: 'run', code: 'ctx.__log.push("1")' },
      { type: 'run', code: 'throw new Error("boom")' },
      { type: 'run', code: 'ctx.__log.push("3")' },
    ]

    await expect(dispatcher.dispatch(actions, ctx)).rejects.toThrow('boom')
    expect(log).toEqual(['1'])
  })

  it('routes declarative actions to ctx + effects', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const calls: string[] = []
    const effects: ActionEffects = {
      toast: () => calls.push('toast'),
      openModal: () => calls.push('open_modal'),
      openForm: () => calls.push('open_form'),
      close: () => calls.push('close'),
      refetch: () => calls.push('refetch'),
      submit: () => calls.push('submit'),
    }
    const dispatcher = createActionDispatcher({ logic: createLogicEngine({ mode: 'preview' }) })
    const actions: Action[] = [
      { type: 'toast', message: 'x' },
      { type: 'open_modal', modal: 'm' },
      { type: 'open_form', form: 'f' },
      { type: 'close' },
      { type: 'refetch' },
      { type: 'submit' },
      { type: 'navigate', to: 'p' },
      { type: 'emit', event: 'e' },
    ]
    await dispatcher.dispatch(actions, ctx, effects)
    expect(calls).toEqual(['toast', 'open_modal', 'open_form', 'close', 'refetch', 'submit'])
    expect(log).toEqual(['navigate:p', 'emit:e'])
  })

  it('no-ops on an empty pipeline', async () => {
    const dispatcher = createActionDispatcher({ logic: createLogicEngine({ mode: 'preview' }) })
    await expect(dispatcher.dispatch([], makeCtx([]))).resolves.toBeUndefined()
  })
})
