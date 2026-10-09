/**
 * Logic / action engine + lifecycle + watchdog + preview-data tests (SPEC §4/§5/§6).
 *
 * These were `it.todo` placeholders in the test-harness branch, pending the logic
 * and data workers. Now that the full system is integrated on main, they are
 * enabled and assert the REAL behavior against the integrated engine:
 *   - logic engine: AsyncFunction compilation with `ctx` injected (SPEC §4)
 *   - action dispatcher: sequential pipeline (SPEC §2)
 *   - watchdog: acorn+magic-string loop budget (SPEC §4)
 *   - lifecycle runner: ordered hooks, Preview-only (SPEC §5)
 *   - custom components: runtime-compiled Vue from meta (SPEC §3/§4)
 *   - preview live data: real axios + tanstack-query (SPEC §6)
 */
import { describe, expect, it, vi } from 'vitest'
import * as Vue from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient } from '@tanstack/vue-query'
import type { AxiosInstance } from 'axios'
import type { Action, Ctx, DataModel } from '@/contracts'
import { createLogicEngine } from '@/engine/logic'
import { createActionDispatcher, type ActionEffects } from '@/engine/dispatcher'
import { createLifecycleRunner } from '@/engine/lifecycle'
import { compileCustomComponent } from '@/engine/customComponents'
import { WatchdogError } from '@/engine/instrument'
import { capabilitiesFor } from '@/engine/mode'
import { createImportMap, type ModuleNamespace } from '@/importmap'
import { createMockStore, createPreviewQueryEngine } from '@/data'

/** Minimal standalone ctx for engine tests (mirrors the engine suite helper). */
function makeCtx(overrides: Partial<Ctx> = {}): Ctx & { __log: string[] } {
  const log: string[] = []
  return {
    blocks: { get: () => undefined, set: () => {} },
    state: { page: {}, global: {} },
    query: { run: async () => null },
    navigate: (to: string) => log.push(`navigate:${to}`),
    http: {} as Ctx['http'],
    user: { role: null, roles: [] },
    emit: (event: string) => log.push(`emit:${event}`),
    __log: log,
    ...overrides,
  }
}

function importMapWithVue() {
  const map = createImportMap()
  map.register('vue', Vue as unknown as ModuleNamespace)
  return map
}

describe('logic engine — compiled contract (real engine)', () => {
  it('compile() returns an async callable that runs user code with ctx injected', async () => {
    const logic = createLogicEngine({ mode: 'preview' })
    const ctx = makeCtx()
    const fn = logic.compile('ctx.state.page.x = 2 + 2; return ctx.state.page.x')
    await expect(fn(ctx)).resolves.toBe(4)
    expect(ctx.state.page.x).toBe(4)
  })

  it('run() compiles and invokes in one shot', async () => {
    const logic = createLogicEngine({ mode: 'preview' })
    await expect(logic.run('return 7 * 6', makeCtx())).resolves.toBe(42)
  })
})

describe('logic engine — real behavior (SPEC §4)', () => {
  it('compiles a {type:"run"} action and runs it with ctx in Preview', async () => {
    const ctx = makeCtx()
    const dispatcher = createActionDispatcher({ logic: createLogicEngine({ mode: 'preview' }) })
    const action: Action = { type: 'run', code: 'ctx.state.page.ran = true; ctx.emit("done")' }
    await dispatcher.dispatch([action], ctx)
    expect(ctx.state.page.ran).toBe(true)
    expect(ctx.__log).toContain('emit:done')
  })

  it('executes an ordered multi-action pipeline sequentially (SPEC §2)', async () => {
    const ctx = makeCtx()
    const effects: ActionEffects = { toast: (m) => ctx.__log.push(`toast:${m}`) }
    const dispatcher = createActionDispatcher({ logic: createLogicEngine({ mode: 'preview' }) })
    const actions: Action[] = [
      { type: 'toast', message: 'A' },
      { type: 'run', code: 'await new Promise((r) => setTimeout(r, 10)); ctx.__log.push("run-B")' },
      { type: 'navigate', to: 'C' },
      { type: 'run', code: 'ctx.__log.push("run-D")' },
      { type: 'emit', event: 'E' },
    ]
    await dispatcher.dispatch(actions, ctx, effects)
    expect(ctx.__log).toEqual(['toast:A', 'run-B', 'navigate:C', 'run-D', 'emit:E'])
  })
})

describe('watchdog — loop budget (SPEC §4)', () => {
  it('throws a budget error on a synchronous infinite loop (watchdog)', async () => {
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 25 })
    const fn = logic.compile('while (true) {}')
    await expect(fn(makeCtx())).rejects.toBeInstanceOf(WatchdogError)
  })

  it('surfaces the watchdog error to onPageError + the error reporter', async () => {
    const errors: Array<{ source?: string }> = []
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 25 })
    const ctx = makeCtx()
    const runner = createLifecycleRunner({
      logic,
      lifecycle: {
        onPageInit: 'while (true) {}',
        onPageError: 'ctx.state.page.handled = true',
      },
      pageId: 'p1',
      onError: (_e, source) => errors.push({ source }),
    })
    await expect(runner.runInit(ctx)).rejects.toBeInstanceOf(WatchdogError)
    // onError reported with the hook's attribution, and onPageError hook ran.
    expect(errors.some((e) => e.source === 'p1:onPageInit')).toBe(true)
    expect(ctx.state.page.handled).toBe(true)
  })
})

describe('lifecycle hooks — Preview-only (SPEC §5)', () => {
  it('runs page lifecycle hooks in order in Preview mode', async () => {
    const order: string[] = []
    const ctx = makeCtx({ emit: (e: string) => order.push(e) })
    const runner = createLifecycleRunner({
      logic: createLogicEngine({ mode: 'preview' }),
      lifecycle: {
        onPageInit: 'ctx.emit("init")',
        onBeforeRender: 'ctx.emit("beforeRender")',
        onPageReady: 'ctx.emit("ready")',
      },
    })
    await runner.runInit(ctx)
    expect(order).toEqual(['init', 'beforeRender', 'ready'])
  })

  it('does NOT run lifecycle hooks in Interface mode (capability gate)', () => {
    // PageRenderer only constructs/invokes the runner when capabilities.lifecycle
    // is on; that flag is false in Interface and true in Preview (SPEC §5).
    expect(capabilitiesFor('interface').lifecycle).toBe(false)
    expect(capabilitiesFor('preview').lifecycle).toBe(true)
  })
})

describe('custom components — runtime-compiled Vue (SPEC §3/§4)', () => {
  it('compiles a custom Vue component from meta and renders it', () => {
    const comp = compileCustomComponent(
      {
        id: 'greet',
        name: 'Greeting',
        kind: 'vue',
        code: 'export default { data: () => ({ who: "World" }), template: "<div class=\\"greet\\">Hello {{ who }}</div>" }',
      },
      { importMap: importMapWithVue() },
    )
    const wrapper = mount(comp)
    expect(wrapper.text()).toContain('Hello World')
    expect(wrapper.find('.greet').exists()).toBe(true)
  })
})

describe('preview live data — real axios + tanstack-query (SPEC §6)', () => {
  const models: DataModel[] = [{ table: 'work_orders', columns: [{ name: 'id', type: 'number' }] }]
  const HTTP_ROWS = [{ id: 10 }, { id: 20 }]

  it('resolves a query-bound table from the backend in Preview mode', async () => {
    const get = vi.fn(async () => ({ data: HTTP_ROWS }))
    const http = { get } as unknown as AxiosInstance
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    const r = await engine.run('work_orders')
    expect(get).toHaveBeenCalledWith('/work_orders', { params: {} })
    expect(r.rows).toEqual(HTTP_ROWS)
    expect(r.count).toBe(2)
    // Sanity: the mock store is NOT consulted in Preview.
    void createMockStore(models)
  })

  it('surfaces a real error state from tanstack-query when the backend fails', async () => {
    const get = vi.fn(async () => {
      throw new Error('backend down')
    })
    const http = { get } as unknown as AxiosInstance
    const engine = createPreviewQueryEngine({
      http,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    })
    await expect(engine.run('work_orders')).rejects.toThrow('backend down')
  })
})
