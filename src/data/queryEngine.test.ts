/**
 * Query engine tests (SPEC §5/§6):
 *   - Interface engine runs against the mock store (count/where/equality).
 *   - Preview engine runs against a mock axios + real QueryClient (HTTP, cache).
 */
import { describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'
import { QueryClient } from '@tanstack/vue-query'
import type { DataModel } from '@/contracts'
import { createMockStore } from './mockStore'
import { createInterfaceQueryEngine, createPreviewQueryEngine } from './queryEngine'

const models: DataModel[] = [
  {
    table: 'work_orders',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'title', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'priority', type: 'string' },
    ],
  },
]

// Deterministic, hand-authored rows so filter/count assertions are exact.
const ORDERS = [
  { id: 1, title: 'A', status: 'open', priority: 'high' },
  { id: 2, title: 'B', status: 'open', priority: 'low' },
  { id: 3, title: 'C', status: 'done', priority: 'high' },
  { id: 4, title: 'D', status: 'blocked', priority: 'low' },
]

function interfaceEngine() {
  const store = createMockStore(models, { overrides: { work_orders: ORDERS } })
  return createInterfaceQueryEngine(store)
}

describe('interface query engine (mock store)', () => {
  it('counts all rows with count(table)', async () => {
    const r = await interfaceEngine().run('count(work_orders)')
    expect(r.count).toBe(4)
    expect(r.rows).toHaveLength(4)
  })

  it('counts with a where equality filter', async () => {
    const r = await interfaceEngine().run('count(work_orders where status = open)')
    expect(r.count).toBe(2)
  })

  it('filters rows via the structured form', async () => {
    const r = await interfaceEngine().run({ table: 'work_orders', filter: { priority: 'high' } })
    expect(r.rows.map((row) => row.id)).toEqual([1, 3])
  })

  it('applies multiple equality predicates as a conjunction', async () => {
    const r = await interfaceEngine().run({
      table: 'work_orders',
      filter: { status: 'open', priority: 'high' },
    })
    expect(r.rows.map((row) => row.id)).toEqual([1])
  })

  it('projects requested columns', async () => {
    const r = await interfaceEngine().run({ table: 'work_orders', columns: ['id', 'status'] })
    expect(Object.keys(r.rows[0])).toEqual(['id', 'status'])
  })

  it('coerces numeric where values so equality matches', async () => {
    const r = await interfaceEngine().run('count(work_orders where id = 3)')
    expect(r.count).toBe(1)
  })

  it('runSync resolves synchronously from the mock store', () => {
    const r = interfaceEngine().runSync('work_orders')
    expect(r.count).toBe(4)
  })

  it('returns an empty result for an unknown table (no crash)', async () => {
    const r = await interfaceEngine().run('count(ghost_table)')
    expect(r).toEqual({ rows: [], count: 0 })
  })
})

/** Minimal axios stand-in: records calls, returns a canned payload. */
function mockAxios(payload: unknown) {
  const get = vi.fn(async () => ({ data: payload }))
  return { get } as unknown as AxiosInstance & { get: ReturnType<typeof vi.fn> }
}

describe('preview query engine (mock axios + tanstack cache)', () => {
  it('fetches over HTTP and shapes an array payload', async () => {
    const http = mockAxios(ORDERS)
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    const r = await engine.run({ table: 'work_orders' })
    expect(http.get).toHaveBeenCalledWith('/work_orders', { params: {} })
    expect(r.count).toBe(4)
    expect(r.rows).toEqual(ORDERS)
  })

  it('sends where filters and columns as request params', async () => {
    const http = mockAxios(ORDERS)
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    await engine.run({ table: 'work_orders', columns: ['id'], filter: { status: 'open' } })
    expect(http.get).toHaveBeenCalledWith('/work_orders', {
      params: { status: 'open', select: 'id' },
    })
  })

  it('parses the text DSL and marks count aggregate as a param', async () => {
    const http = mockAxios(ORDERS)
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    await engine.run('count(work_orders where status = open)')
    expect(http.get).toHaveBeenCalledWith('/work_orders', {
      params: { status: 'open', count: true },
    })
  })

  it('shapes a {rows,count} object payload', async () => {
    const http = mockAxios({ rows: [{ id: 1 }], count: 42 })
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    const r = await engine.run('work_orders')
    expect(r).toEqual({ rows: [{ id: 1 }], count: 42 })
  })

  it('shapes a scalar count payload for a count query', async () => {
    const http = mockAxios(7)
    const engine = createPreviewQueryEngine({ http, queryClient: new QueryClient() })
    const r = await engine.run('count(work_orders)')
    expect(r).toEqual({ rows: [], count: 7 })
  })

  // Preview's real caching config (mirrors engine.ts): cached reads are reused.
  const cachingClient = () =>
    new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })

  it('caches identical queries through the QueryClient (one HTTP call)', async () => {
    const http = mockAxios(ORDERS)
    const engine = createPreviewQueryEngine({ http, queryClient: cachingClient() })
    await engine.run({ table: 'work_orders', filter: { status: 'open' } })
    await engine.run({ table: 'work_orders', filter: { status: 'open' } })
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('does not share cache across distinct queries', async () => {
    const http = mockAxios(ORDERS)
    const engine = createPreviewQueryEngine({ http, queryClient: cachingClient() })
    await engine.run({ table: 'work_orders', filter: { status: 'open' } })
    await engine.run({ table: 'work_orders', filter: { status: 'done' } })
    expect(http.get).toHaveBeenCalledTimes(2)
  })

  it('propagates HTTP errors (real error path)', async () => {
    const get = vi.fn(async () => {
      throw new Error('boom')
    })
    const http = { get } as unknown as AxiosInstance
    const engine = createPreviewQueryEngine({
      http,
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    })
    await expect(engine.run('work_orders')).rejects.toThrow('boom')
  })

  it('runSync returns cached data when present, else an empty placeholder', async () => {
    const http = mockAxios(ORDERS)
    const qc = new QueryClient()
    const engine = createPreviewQueryEngine({ http, queryClient: qc })
    expect(engine.runSync('work_orders')).toEqual({ rows: [], count: 0 })
    await engine.run('work_orders')
    expect(engine.runSync('work_orders').count).toBe(4)
  })
})
