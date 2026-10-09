import { describe, it, expect } from 'vitest'
import type { Ctx, PageLifecycle } from '@/contracts'
import { createLogicEngine } from '../logic'
import { createLifecycleRunner } from '../lifecycle'

function makeCtx(log: string[]): Ctx & { __log: string[] } {
  return {
    blocks: { get: () => undefined, set: () => {} },
    state: { page: {}, global: {} },
    query: { run: async () => null },
    navigate: () => {},
    http: {} as Ctx['http'],
    user: { role: null, roles: [] },
    emit: () => {},
    __log: log,
  }
}

describe('lifecycle runner — ordering (SPEC §4)', () => {
  it('runs the init sequence onPageInit → onBeforeRender → onPageReady', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const lifecycle: PageLifecycle = {
      onPageReady: 'ctx.__log.push("ready")',
      onPageInit: 'ctx.__log.push("init")',
      onBeforeRender: 'ctx.__log.push("beforeRender")',
    }
    const runner = createLifecycleRunner({ logic: createLogicEngine({ mode: 'preview' }), lifecycle })
    await runner.runInit(ctx)
    expect(log).toEqual(['init', 'beforeRender', 'ready'])
  })

  it('awaits each hook so an async hook completes before the next', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const lifecycle: PageLifecycle = {
      onPageInit: 'await new Promise((r) => setTimeout(r, 15)); ctx.__log.push("init")',
      onPageReady: 'ctx.__log.push("ready")',
    }
    const runner = createLifecycleRunner({ logic: createLogicEngine({ mode: 'preview' }), lifecycle })
    await runner.runInit(ctx)
    expect(log).toEqual(['init', 'ready'])
  })

  it('runs the leave sequence onBeforeLeave → onPageLeave', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const lifecycle: PageLifecycle = {
      onPageLeave: 'ctx.__log.push("leave")',
      onBeforeLeave: 'ctx.__log.push("beforeLeave")',
    }
    const runner = createLifecycleRunner({ logic: createLogicEngine({ mode: 'preview' }), lifecycle })
    await runner.runLeave(ctx)
    expect(log).toEqual(['beforeLeave', 'leave'])
  })

  it('skips undefined hooks', async () => {
    const log: string[] = []
    const ctx = makeCtx(log)
    const lifecycle: PageLifecycle = { onPageReady: 'ctx.__log.push("ready")' }
    const runner = createLifecycleRunner({ logic: createLogicEngine({ mode: 'preview' }), lifecycle })
    await runner.runInit(ctx)
    expect(log).toEqual(['ready'])
  })
})

describe('lifecycle runner — onPageError (SPEC §4/§9)', () => {
  it('invokes onPageError with the failing error and rethrows', async () => {
    const log: string[] = []
    const errors: unknown[] = []
    const ctx = makeCtx(log)
    const lifecycle: PageLifecycle = {
      onPageInit: 'throw new Error("hookfail")',
      onPageError: 'ctx.__log.push("onError:" + ctx.state.page.__error)',
    }
    const runner = createLifecycleRunner({
      logic: createLogicEngine({ mode: 'preview' }),
      lifecycle,
      onError: (e) => errors.push(e),
    })
    await expect(runner.runInit(ctx)).rejects.toThrow('hookfail')
    expect(log).toEqual(['onError:hookfail'])
    expect(errors).toHaveLength(1)
  })

  it('does not recurse when onPageError itself throws', async () => {
    const errors: unknown[] = []
    const ctx = makeCtx([])
    const lifecycle: PageLifecycle = {
      onPageInit: 'throw new Error("first")',
      onPageError: 'throw new Error("in-handler")',
    }
    const runner = createLifecycleRunner({
      logic: createLogicEngine({ mode: 'preview' }),
      lifecycle,
      onError: (e) => errors.push(e),
    })
    await expect(runner.runInit(ctx)).rejects.toThrow('first')
    // One report for the original hook, one for the failing handler — no loop.
    expect(errors).toHaveLength(2)
  })
})
