/**
 * Query engine (SPEC §6) — executes a `ParsedQuery` against a backing source.
 *
 * Two mode-specific implementations share one `QueryEngine` interface so the
 * renderer and `ctx.query` call an identical surface regardless of mode (§5):
 *
 *   - Interface → `createInterfaceQueryEngine(source)`: runs against the faker
 *     mock store, fully in-memory. No HTTP. Supports a synchronous `runSync`
 *     because the mock store is synchronous.
 *   - Preview   → `createPreviewQueryEngine({ http, queryClient })`: real axios
 *     requests cached through @tanstack/vue-query's `QueryClient`
 *     (loading/error/cache are real). Async only.
 *
 * Parsing is delegated to the isolated, swappable `QueryParser` (see
 * `queryParser.ts`); the engine only interprets the normalized AST. v1 scope:
 * count / filter / where / equality.
 */

import type { AxiosInstance } from 'axios'
import type { QueryClient } from '@tanstack/vue-query'

import type { BlockQuery, Mode } from '@/contracts'
import type { Row } from './mockStore'
import type { DataSource } from './mockStore'
import {
  defaultQueryParser,
  type ParsedQuery,
  type QueryParser,
  type QueryPredicate,
} from './queryParser'

export interface QueryResult {
  rows: Row[]
  count: number
}

export interface QueryEngine {
  /** Run a query (DSL string or structured) → rows / count. */
  run(query: BlockQuery): Promise<QueryResult>
  /**
   * Synchronous resolution for mode-appropriate callers. Interface resolves
   * from the in-memory store; Preview returns cached data if present (else an
   * empty placeholder — real data arrives via the async `run`).
   */
  runSync(query: BlockQuery): QueryResult
}

/** Apply the normalized `where` predicates (v1: conjunction of equalities). */
function applyWhere(rows: Row[], where: QueryPredicate[]): Row[] {
  if (!where.length) return rows
  return rows.filter((row) => where.every((p) => row[p.column] === p.value))
}

/** Project the requested columns; empty = pass rows through untouched. */
function pickColumns(rows: Row[], columns?: string[]): Row[] {
  if (!columns?.length) return rows
  return rows.map((row) => {
    const out: Row = {}
    for (const c of columns) out[c] = row[c]
    return out
  })
}

/** Resolve a parsed query against an in-memory row set (shared by Interface). */
function resolveAgainstRows(parsed: ParsedQuery, base: Row[]): QueryResult {
  const filtered = applyWhere(base, parsed.where)
  const projected = pickColumns(filtered, parsed.columns)
  return { rows: projected, count: projected.length }
}

/** Interface-mode engine backed by the faker mock store (no HTTP, SPEC §5/§6). */
export function createInterfaceQueryEngine(
  source: DataSource,
  parser: QueryParser = defaultQueryParser,
): QueryEngine {
  function resolve(query: BlockQuery): QueryResult {
    const parsed = parser.parse(query)
    return resolveAgainstRows(parsed, source.all(parsed.table))
  }
  return {
    runSync: resolve,
    run: (query) => Promise.resolve(resolve(query)),
  }
}

export interface PreviewQueryEngineOptions {
  /** Preconfigured axios instance (baseURL = backend root). */
  http: AxiosInstance
  /**
   * tanstack QueryClient for real caching/dedup. Optional: without it requests
   * still run, just uncached.
   */
  queryClient?: QueryClient
  parser?: QueryParser
  /** Map a table to its request path (default: `/<table>`). */
  resolvePath?: (parsed: ParsedQuery) => string
}

/** Build a stable tanstack queryKey from the normalized query. */
function queryKeyFor(parsed: ParsedQuery): unknown[] {
  const filter: Record<string, unknown> = {}
  for (const p of parsed.where) filter[p.column] = p.value
  return ['platon-query', parsed.table, parsed.columns ?? null, filter]
}

/** Shape an arbitrary backend payload into a `QueryResult`. */
function shapeResponse(payload: unknown, parsed: ParsedQuery): QueryResult {
  if (Array.isArray(payload)) {
    const rows = payload as Row[]
    return { rows, count: rows.length }
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as { rows?: Row[]; count?: number; data?: Row[] }
    const rows = obj.rows ?? obj.data ?? []
    const count = typeof obj.count === 'number' ? obj.count : rows.length
    return { rows, count }
  }
  // Scalar payload (e.g. a bare count for a `count(...)` endpoint).
  if (typeof payload === 'number' && parsed.aggregate === 'count') {
    return { rows: [], count: payload }
  }
  return { rows: [], count: 0 }
}

/**
 * Preview-mode engine: real axios + @tanstack/vue-query (SPEC §5/§6).
 * Filters are sent as query params; caching/dedup/errors are tanstack-real.
 */
export function createPreviewQueryEngine(opts: PreviewQueryEngineOptions): QueryEngine {
  const parser = opts.parser ?? defaultQueryParser
  const resolvePath = opts.resolvePath ?? ((p: ParsedQuery) => `/${p.table}`)

  function requestParams(parsed: ParsedQuery): Record<string, unknown> {
    const params: Record<string, unknown> = {}
    for (const p of parsed.where) params[p.column] = p.value
    if (parsed.columns?.length) params.select = parsed.columns.join(',')
    if (parsed.aggregate === 'count') params.count = true
    return params
  }

  async function fetchRows(parsed: ParsedQuery): Promise<QueryResult> {
    const url = resolvePath(parsed)
    const params = requestParams(parsed)
    const queryFn = async () => {
      const res = await opts.http.get(url, { params })
      return res.data
    }

    const payload = opts.queryClient
      ? await opts.queryClient.fetchQuery({ queryKey: queryKeyFor(parsed), queryFn })
      : await queryFn()

    return shapeResponse(payload, parsed)
  }

  return {
    run(query) {
      return fetchRows(parser.parse(query))
    },
    runSync(query) {
      const parsed = parser.parse(query)
      // Real data is async; surface cached data synchronously if tanstack has it.
      const cached = opts.queryClient?.getQueryData<unknown>(queryKeyFor(parsed))
      if (cached !== undefined) return shapeResponse(cached, parsed)
      return { rows: [], count: 0 }
    },
  }
}

/**
 * Mode → engine selection (SPEC §5), isolated here so the renderer/engine never
 * branches on mode for data access:
 *   - `interface` → mock store, no HTTP.
 *   - `preview`   → real axios cached through tanstack-query.
 */
export interface QueryEngineForModeOptions {
  mode: Mode
  source: DataSource
  http: AxiosInstance
  queryClient?: QueryClient
  parser?: QueryParser
}

export function createQueryEngineForMode(opts: QueryEngineForModeOptions): QueryEngine {
  if (opts.mode === 'preview') {
    return createPreviewQueryEngine({
      http: opts.http,
      queryClient: opts.queryClient,
      parser: opts.parser,
    })
  }
  return createInterfaceQueryEngine(opts.source, opts.parser)
}
