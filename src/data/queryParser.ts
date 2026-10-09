/**
 * Query DSL parser (SPEC §6) — ISOLATED and SWAPPABLE.
 *
 * This module is the only place that understands query *syntax*. It turns a
 * block's data binding — either the structured `{table, columns, filter}` form
 * or the text DSL (`count(table where col = value)`) — into one normalized
 * `ParsedQuery` AST that the engine executes. Nothing downstream parses strings.
 *
 * v1 scope (LOCKED): `count`, `filter`, `where`, `equality`. Joins / group-by /
 * ordering / multi-predicate `where` are explicitly LATER. Because the parser is
 * hidden behind the `QueryParser` interface, a future worker can drop in a
 * richer grammar (returning a superset AST) without touching the engine.
 */

import type { BlockQuery, StructuredQuery } from '@/contracts'

/** A single predicate in the normalized filter (v1: equality only). */
export interface QueryPredicate {
  column: string
  /** v1 scope is equality; the field exists so later ops slot in cleanly. */
  op: 'eq'
  value: unknown
}

/**
 * The normalized, engine-ready shape every parser must produce. A superset of
 * v1: richer parsers add fields (joins, groupBy, order) without breaking the
 * engine's handling of these core ones.
 */
export interface ParsedQuery {
  table: string
  /** Column projection; empty/undefined = all columns. */
  columns?: string[]
  /** Conjunction of predicates (all must match). Empty = no filter. */
  where: QueryPredicate[]
  /** Aggregate requested by the binding; `null` = return rows. */
  aggregate: 'count' | null
}

/** The swappable parser contract (SPEC §6: "keep the parser isolated/swappable"). */
export interface QueryParser {
  parse(query: BlockQuery): ParsedQuery
}

/** Error thrown when a text binding cannot be parsed within v1 scope. */
export class QueryParseError extends Error {
  constructor(
    message: string,
    readonly input: string,
  ) {
    super(message)
    this.name = 'QueryParseError'
  }
}

/** Coerce a raw DSL literal into a JS value (number / boolean / quoted string). */
export function coerceLiteral(raw: string): unknown {
  const trimmed = raw.trim()
  // Quoted string → strip the matching quotes, keep inner text verbatim.
  const quoted = /^(['"])(.*)\1$/.exec(trimmed)
  if (quoted) return quoted[2]
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed)
  if (/^-?\d*\.\d+$/.test(trimmed)) return Number(trimmed)
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  return trimmed
}

/** Parse the `<col> = <value>` predicate of a `where` clause (v1: single eq). */
function parseWhere(clause: string, input: string): QueryPredicate[] {
  const m = /^\s*([A-Za-z_]\w*)\s*(?:==|=)\s*(.+?)\s*$/.exec(clause)
  if (!m) {
    throw new QueryParseError(
      `Unsupported where clause: "${clause}" (v1 supports a single "col = value" equality)`,
      input,
    )
  }
  return [{ column: m[1], op: 'eq', value: coerceLiteral(m[2]) }]
}

/**
 * Parse the text DSL. Grammar (v1):
 *   query   := "count(" body ")" | body
 *   body    := table [ "where" predicate ]
 *   table   := identifier
 * Anything outside this grammar throws `QueryParseError`.
 */
export function parseQueryText(input: string): ParsedQuery {
  const trimmed = input.trim()
  if (!trimmed) throw new QueryParseError('Empty query string', input)

  const countMatch = /^count\s*\(\s*(.+?)\s*\)$/i.exec(trimmed)
  const aggregate: 'count' | null = countMatch ? 'count' : null
  const body = (countMatch ? countMatch[1] : trimmed).trim()

  const whereSplit = /^(.*?)\s+where\s+(.+)$/i.exec(body)
  if (whereSplit) {
    const table = whereSplit[1].trim()
    if (!/^[A-Za-z_]\w*$/.test(table)) {
      throw new QueryParseError(`Invalid table name: "${table}"`, input)
    }
    return { table, where: parseWhere(whereSplit[2], input), aggregate }
  }

  if (!/^[A-Za-z_]\w*$/.test(body)) {
    throw new QueryParseError(`Invalid query: "${body}"`, input)
  }
  return { table: body, where: [], aggregate }
}

/** Normalize the structured `{table, columns, filter}` binding into a ParsedQuery. */
export function parseStructured(query: StructuredQuery): ParsedQuery {
  const where: QueryPredicate[] = Object.entries(query.filter ?? {}).map(([column, value]) => ({
    column,
    op: 'eq',
    value,
  }))
  return {
    table: query.table,
    columns: query.columns?.length ? [...query.columns] : undefined,
    where,
    // The structured form has no aggregate keyword in v1; the engine/consumer
    // decides count-vs-rows from the result. Default to returning rows.
    aggregate: null,
  }
}

/** The default v1 parser: handles both the text DSL and the structured form. */
export function createQueryParser(): QueryParser {
  return {
    parse(query: BlockQuery): ParsedQuery {
      return typeof query === 'string' ? parseQueryText(query) : parseStructured(query)
    },
  }
}

/** Shared default instance (parsers are stateless). */
export const defaultQueryParser: QueryParser = createQueryParser()
