/**
 * Interface-mode mock data store (SPEC §6).
 *
 * Seeds an in-sandbox store from `data_models` using faker (manual `seed` on a
 * model overrides generation). No HTTP. Preview mode uses a real axios-backed
 * data source instead — that implementation is a later worker; this store is the
 * Interface counterpart and stays isolated/swappable behind `DataSource`.
 */

import { faker } from '@faker-js/faker'
import type { DataModel, DataModelColumn } from '@/contracts'

export type Row = Record<string, unknown>

/** Swappable data source contract shared by Interface (mock) and Preview (http). */
export interface DataSource {
  /** All rows for a table. */
  all(table: string): Row[]
  /** Row count for a table. */
  count(table: string): number
  /** Column metadata for a table, if known. */
  columns(table: string): DataModelColumn[]
  /** Table names the source knows about. */
  tables(): string[]
}

const DEFAULT_SEED_COUNT = 8

function fakeValue(col: DataModelColumn, index: number): unknown {
  const type = col.type.toLowerCase()
  const name = col.name.toLowerCase()

  // Name-based heuristics first (nicer demo data), then fall back to type.
  if (name === 'id') return index + 1
  if (name.includes('email')) return faker.internet.email()
  if (
    name.includes('name') ||
    name.includes('technician') ||
    name.includes('assignee') ||
    name.includes('customer')
  )
    return faker.person.fullName()
  if (name.includes('phone')) return faker.phone.number()
  if (name.includes('address')) return faker.location.streetAddress()
  if (name.includes('status')) return faker.helpers.arrayElement(['open', 'in_progress', 'done', 'blocked'])
  if (name.includes('priority')) return faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'])
  if (name.includes('title') || name.includes('label')) return faker.lorem.words({ min: 2, max: 4 })
  if (name.includes('description') || name.includes('notes')) return faker.lorem.sentence()

  switch (type) {
    case 'number':
    case 'int':
    case 'integer':
    case 'float':
      return faker.number.int({ min: 1, max: 999 })
    case 'boolean':
    case 'bool':
      return faker.datatype.boolean()
    case 'date':
    case 'datetime':
    case 'timestamp':
      return faker.date.recent({ days: 30 }).toISOString().slice(0, 10)
    case 'uuid':
      return faker.string.uuid()
    default:
      return faker.lorem.word()
  }
}

/** Build a deterministic-ish mock store from data models (SPEC §6). */
export function createMockStore(models: DataModel[]): DataSource {
  // Deterministic demo data across reloads.
  faker.seed(1337)

  const data = new Map<string, Row[]>()
  const meta = new Map<string, DataModelColumn[]>()

  for (const model of models) {
    meta.set(model.table, model.columns)
    if (model.seed?.length) {
      data.set(model.table, model.seed.map((r) => ({ ...r })))
      continue
    }
    const rows: Row[] = []
    for (let i = 0; i < DEFAULT_SEED_COUNT; i++) {
      const row: Row = {}
      for (const col of model.columns) row[col.name] = fakeValue(col, i)
      rows.push(row)
    }
    data.set(model.table, rows)
  }

  return {
    all: (table) => data.get(table) ?? [],
    count: (table) => (data.get(table) ?? []).length,
    columns: (table) => meta.get(table) ?? [],
    tables: () => [...data.keys()],
  }
}
