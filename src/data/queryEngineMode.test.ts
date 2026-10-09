/**
 * Mode-routing test (SPEC §5): interface(mock) vs preview(real, mock-axios).
 *
 * Verifies the single selection point sends Interface queries to the in-memory
 * mock store (no HTTP) and Preview queries to real axios.
 */
import { describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'
import { QueryClient } from '@tanstack/vue-query'
import type { DataModel } from '@/contracts'
import { createMockStore } from './mockStore'
import { createQueryEngineForMode } from './queryEngine'

const models: DataModel[] = [
  { table: 'work_orders', columns: [{ name: 'id', type: 'number' }] },
]
const MOCK_ROWS = [{ id: 1 }, { id: 2 }, { id: 3 }]
const HTTP_ROWS = [{ id: 10 }, { id: 20 }]

function harness(mode: 'interface' | 'preview') {
  const source = createMockStore(models, { overrides: { work_orders: MOCK_ROWS } })
  const get = vi.fn(async () => ({ data: HTTP_ROWS }))
  const http = { get } as unknown as AxiosInstance
  const engine = createQueryEngineForMode({
    mode,
    source,
    http,
    queryClient: mode === 'preview' ? new QueryClient() : undefined,
  })
  return { engine, get }
}

describe('createQueryEngineForMode routing', () => {
  it('interface mode reads the mock store and never touches HTTP', async () => {
    const { engine, get } = harness('interface')
    const r = await engine.run('count(work_orders)')
    expect(r.count).toBe(3)
    expect(r.rows).toEqual(MOCK_ROWS)
    expect(get).not.toHaveBeenCalled()
  })

  it('preview mode calls real axios and ignores the mock store', async () => {
    const { engine, get } = harness('preview')
    const r = await engine.run('work_orders')
    expect(get).toHaveBeenCalledWith('/work_orders', { params: {} })
    expect(r.rows).toEqual(HTTP_ROWS)
    expect(r.count).toBe(2) // from HTTP, not the 3 mock rows
  })
})
