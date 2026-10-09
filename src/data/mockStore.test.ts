/**
 * Mock store tests (SPEC §6): faker seed determinism, manual override
 * precedence, row-count control, and the DataSource surface.
 */
import { describe, expect, it } from 'vitest'
import type { DataModel } from '@/contracts'
import { createMockStore } from './mockStore'

const models: DataModel[] = [
  {
    table: 'work_orders',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'title', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'technician', type: 'string' },
    ],
  },
  {
    table: 'checklist_items',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'task', type: 'string' },
    ],
  },
]

describe('createMockStore — determinism', () => {
  it('produces byte-identical rows across rebuilds (fixed faker seed)', () => {
    const a = createMockStore(models)
    const b = createMockStore(models)
    expect(a.all('work_orders')).toEqual(b.all('work_orders'))
    expect(a.all('checklist_items')).toEqual(b.all('checklist_items'))
  })

  it('a different fakerSeed yields different data', () => {
    const a = createMockStore(models, { fakerSeed: 1 })
    const b = createMockStore(models, { fakerSeed: 2 })
    expect(a.all('work_orders')).not.toEqual(b.all('work_orders'))
  })

  it('reseeds on every call so order of construction does not matter', () => {
    // Build one store, then another; the second must equal a fresh first build.
    const first = createMockStore(models)
    const firstRows = JSON.parse(JSON.stringify(first.all('work_orders')))
    createMockStore(models, { fakerSeed: 999 }) // perturb global faker state
    const again = createMockStore(models)
    expect(again.all('work_orders')).toEqual(firstRows)
  })
})

describe('createMockStore — generation', () => {
  it('generates the default row count per table', () => {
    const store = createMockStore(models)
    expect(store.count('work_orders')).toBe(8)
  })

  it('honors rowsPerTable', () => {
    const store = createMockStore(models, { rowsPerTable: 3 })
    expect(store.count('work_orders')).toBe(3)
    expect(store.all('checklist_items')).toHaveLength(3)
  })

  it('seeds ids sequentially and fills typed columns', () => {
    const rows = createMockStore(models, { rowsPerTable: 2 }).all('work_orders')
    expect(rows.map((r) => r.id)).toEqual([1, 2])
    expect(typeof rows[0].title).toBe('string')
    expect(typeof rows[0].technician).toBe('string')
  })
})

describe('createMockStore — overrides & model seed', () => {
  it('model.seed overrides faker generation', () => {
    const seeded: DataModel[] = [
      {
        table: 'work_orders',
        columns: models[0].columns,
        seed: [{ id: 1, title: 'Fixed', status: 'open', technician: 'Ada' }],
      },
    ]
    const store = createMockStore(seeded)
    expect(store.all('work_orders')).toEqual([
      { id: 1, title: 'Fixed', status: 'open', technician: 'Ada' },
    ])
  })

  it('options.overrides take precedence over model.seed and faker', () => {
    const seeded: DataModel[] = [
      { table: 'work_orders', columns: models[0].columns, seed: [{ id: 99 }] },
    ]
    const store = createMockStore(seeded, {
      overrides: { work_orders: [{ id: 7, title: 'Override' }] },
    })
    expect(store.all('work_orders')).toEqual([{ id: 7, title: 'Override' }])
  })

  it('returns a defensive copy of override rows', () => {
    const override = [{ id: 1, title: 'A' }]
    const store = createMockStore(models, { overrides: { work_orders: override } })
    override[0].title = 'mutated'
    expect(store.all('work_orders')[0].title).toBe('A')
  })
})

describe('DataSource surface', () => {
  it('exposes tables, columns, all and count', () => {
    const store = createMockStore(models)
    expect(store.tables()).toEqual(['work_orders', 'checklist_items'])
    expect(store.columns('work_orders')).toEqual(models[0].columns)
    expect(store.all('unknown')).toEqual([])
    expect(store.count('unknown')).toBe(0)
  })
})
