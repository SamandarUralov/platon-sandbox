import { describe, it, expect } from 'vitest'
import type { Ctx } from '@/contracts'
import { createLogicEngine } from '../logic'
import { WatchdogError, CompileError } from '../instrument'
import { createImportMap } from '@/importmap'

/** Minimal standalone ctx for pure logic-engine tests. */
function makeCtx(overrides: Partial<Ctx> = {}): Ctx & { __log?: unknown[] } {
  return {
    blocks: { get: () => undefined, set: () => {} },
    state: { page: {}, global: {} },
    query: { run: async () => null },
    navigate: () => {},
    http: {} as Ctx['http'],
    user: { role: null, roles: [] },
    emit: () => {},
    ...overrides,
  }
}

describe('logic engine — ctx injection', () => {
  it('runs user code with ctx injected and returns its value', async () => {
    const logic = createLogicEngine({ mode: 'preview' })
    const ctx = makeCtx()
    const fn = logic.compile('ctx.state.page.x = 42; return ctx.state.page.x')
    const result = await fn(ctx)
    expect(result).toBe(42)
    expect(ctx.state.page.x).toBe(42)
  })

  it('supports top-level await in user code', async () => {
    const logic = createLogicEngine({ mode: 'preview' })
    const ctx = makeCtx({ query: { run: async () => ({ rows: [], count: 7 }) } })
    const fn = logic.compile('const r = await ctx.query.run("count(t)"); return r.count')
    expect(await fn(ctx)).toBe(7)
  })

  it('resolves imports through the import map', async () => {
    const map = createImportMap()
    map.register('@/theme', { token: (k: string) => `tok:${k}` })
    const logic = createLogicEngine({ mode: 'preview', importMap: map })
    const ctx = makeCtx()
    const fn = logic.compile(`import { token } from '@/theme'\nreturn token('accent')`)
    expect(await fn(ctx)).toBe('tok:accent')
  })
})

describe('logic engine — watchdog', () => {
  it('breaks an infinite loop once the time budget is exceeded', async () => {
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 25 })
    const ctx = makeCtx()
    const fn = logic.compile('while (true) {}')
    await expect(fn(ctx)).rejects.toBeInstanceOf(WatchdogError)
  })

  it('breaks an infinite for loop too', async () => {
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 25 })
    const fn = logic.compile('let n = 0; for (;;) { n++ }')
    await expect(fn(makeCtx())).rejects.toBeInstanceOf(WatchdogError)
  })

  it('lets a bounded loop finish within budget', async () => {
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 100 })
    const ctx = makeCtx()
    const fn = logic.compile('let s = 0; for (let i = 0; i < 1000; i++) { s += i } ctx.state.page.sum = s')
    await fn(ctx)
    expect(ctx.state.page.sum).toBe(499500)
  })

  it('gives each invocation a fresh budget', async () => {
    const logic = createLogicEngine({ mode: 'preview', budgetMs: 100 })
    const fn = logic.compile('let s = 0; for (let i = 0; i < 500; i++) s += i; return s')
    expect(await fn(makeCtx())).toBe(124750)
    expect(await fn(makeCtx())).toBe(124750)
  })
})

describe('logic engine — error handling', () => {
  it('reports a compile error at compile time and rethrows on invocation', async () => {
    const errors: Array<{ source?: string }> = []
    const logic = createLogicEngine({
      mode: 'preview',
      onError: (error, source) => errors.push({ source: source as string | undefined }),
    })
    const fn = logic.compile('const = = =', { source: 'bad-hook' })
    expect(errors).toHaveLength(1)
    expect(errors[0].source).toBe('bad-hook')
    await expect(fn(makeCtx())).rejects.toBeInstanceOf(CompileError)
  })

  it('reports and rethrows a runtime error', async () => {
    const errors: unknown[] = []
    const logic = createLogicEngine({ mode: 'preview', onError: (e) => errors.push(e) })
    const fn = logic.compile('throw new Error("boom")')
    await expect(fn(makeCtx())).rejects.toThrow('boom')
    expect(errors).toHaveLength(1)
  })
})
