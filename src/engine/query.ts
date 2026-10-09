/**
 * Query engine (SPEC §6).
 *
 * The FULL query DSL (joins/group-by/complex `where`) is OUT of foundation scope
 * — a later worker owns it. The foundation ships only:
 *   - the `QueryEngine` interface both modes implement, and
 *   - a MINIMAL Interface-mode resolver that handles the structured
 *     `{table, columns, filter}` form, a bare table name, and
 *     `count(table where col=value)` — enough to drive the demo.
 *
 * Kept deliberately isolated and swappable (SPEC §6).
 */

import type { BlockQuery, StructuredQuery } from '@/contracts'
import type { DataSource, Row } from '@/data/mockStore'

export interface QueryResult {
  rows: Row[]
  count: number
}

export interface QueryEngine {
  run(query: BlockQuery): Promise<QueryResult>
  /** Synchronous form for Interface rendering (mock store is sync). */
  runSync(query: BlockQuery): QueryResult
}

/** Apply a flat equality filter (v1 scope: equality only — SPEC §6). */
function applyFilter(rows: Row[], filter?: Record<string, unknown>): Row[] {
  if (!filter) return rows
  const entries = Object.entries(filter)
  if (!entries.length) return rows
  return rows.filter((row) => entries.every(([k, v]) => row[k] === v))
}

function pickColumns(rows: Row[], columns?: string[]): Row[] {
  if (!columns?.length) return rows
  return rows.map((row) => {
    const out: Row = {}
    for (const c of columns) out[c] = row[c]
    return out
  })
}

/**
 * Parse the minimal string DSL. Supports:
 *   `count(table)` · `count(table where col = value)` · `table`
 * Anything richer returns a `{ table }`-only structured query (best effort).
 */
export function parseQueryString(input: string): { structured: StructuredQuery; countOnly: boolean } {
  const trimmed = input.trim()
  const countMatch = /^count\(\s*(.+?)\s*\)$/i.exec(trimmed)
  const body = countMatch ? countMatch[1] : trimmed
  const countOnly = Boolean(countMatch)

  const whereMatch = /^(\w+)\s+where\s+(\w+)\s*=\s*(.+)$/i.exec(body)
  if (whereMatch) {
    const [, table, col, rawVal] = whereMatch
    return { structured: { table, filter: { [col]: coerce(rawVal) } }, countOnly }
  }
  return { structured: { table: body.replace(/\s.*$/, '') }, countOnly }
}

function coerce(raw: string): unknown {
  const v = raw.trim().replace(/^['"]|['"]$/g, '')
  if (/^-?\d+$/.test(v)) return Number(v)
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

/** Interface-mode engine backed by the faker mock store. */
export function createInterfaceQueryEngine(source: DataSource): QueryEngine {
  function resolve(query: BlockQuery): QueryResult {
    let structured: StructuredQuery
    if (typeof query === 'string') {
      structured = parseQueryString(query).structured
    } else {
      structured = query
    }
    const base = source.all(structured.table)
    const filtered = applyFilter(base, structured.filter)
    const projected = pickColumns(filtered, structured.columns)
    return { rows: projected, count: projected.length }
  }

  return {
    runSync: resolve,
    run: (query) => Promise.resolve(resolve(query)),
  }
}
