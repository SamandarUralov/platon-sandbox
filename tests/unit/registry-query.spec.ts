/**
 * Registry (SPEC §3) + Query DSL (SPEC §6) unit tests.
 *
 * These subsystems are foundation-ready, so they're exercised directly. The
 * FULL query DSL (joins/group-by) is a later worker — those cases live as
 * `it.todo` in `logic.todo.spec.ts`.
 */
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createRegistry } from '@/engine/registry'
import { createInterfaceQueryEngine, parseQueryString } from '@/engine/query'
import { createMockStore } from '@/data/mockStore'
import type { DataModel } from '@/contracts'

describe('component registry (3 layers)', () => {
  it('resolves built-in semantic blocks', () => {
    const reg = createRegistry({ includeUiKit: false })
    expect(reg.has('page_header')).toBe(true)
    expect(reg.layerOf('data_table')).toBe('builtin')
  })

  it('returns the Unknown fallback for missing keys (never throws)', () => {
    const reg = createRegistry({ includeUiKit: false })
    expect(reg.has('nope')).toBe(false)
    expect(reg.resolve('nope')).toBe(reg.fallback)
  })

  it('registers custom components at highest precedence', () => {
    const reg = createRegistry({ includeUiKit: false })
    const custom = defineComponent({ render: () => null })
    reg.registerCustom('page_header', custom)
    expect(reg.layerOf('page_header')).toBe('custom')
    expect(reg.resolve('page_header')).toBe(custom)
  })
})

describe('query DSL parser', () => {
  it('parses a bare table name', () => {
    expect(parseQueryString('work_orders')).toEqual({
      structured: { table: 'work_orders' },
      countOnly: false,
    })
  })

  it('parses count(table)', () => {
    expect(parseQueryString('count(work_orders)')).toEqual({
      structured: { table: 'work_orders' },
      countOnly: true,
    })
  })

  it('parses count(table where col = value) with coercion', () => {
    expect(parseQueryString('count(work_orders where status = open)')).toEqual({
      structured: { table: 'work_orders', filter: { status: 'open' } },
      countOnly: true,
    })
    expect(parseQueryString('work_orders where id = 5')).toEqual({
      structured: { table: 'work_orders', filter: { id: 5 } },
      countOnly: false,
    })
  })
})

const models: DataModel[] = [
  {
    table: 'items',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'status', type: 'string' },
    ],
    seed: [
      { id: 1, status: 'open' },
      { id: 2, status: 'done' },
      { id: 3, status: 'open' },
    ],
  },
]

describe('interface query engine', () => {
  it('returns all rows for a bare table', () => {
    const engine = createInterfaceQueryEngine(createMockStore(models))
    const res = engine.runSync({ table: 'items' })
    expect(res.count).toBe(3)
    expect(res.rows).toHaveLength(3)
  })

  it('applies an equality filter', () => {
    const engine = createInterfaceQueryEngine(createMockStore(models))
    const res = engine.runSync({ table: 'items', filter: { status: 'open' } })
    expect(res.count).toBe(2)
    expect(res.rows.every((r) => r.status === 'open')).toBe(true)
  })

  it('projects selected columns', () => {
    const engine = createInterfaceQueryEngine(createMockStore(models))
    const res = engine.runSync({ table: 'items', columns: ['id'] })
    expect(Object.keys(res.rows[0])).toEqual(['id'])
  })

  it('returns empty for an unknown table without throwing', () => {
    const engine = createInterfaceQueryEngine(createMockStore(models))
    expect(engine.runSync({ table: 'ghost' })).toEqual({ rows: [], count: 0 })
  })
})
