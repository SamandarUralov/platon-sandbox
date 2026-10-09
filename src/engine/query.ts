/**
 * Query engine — engine-facing re-export (SPEC §6).
 *
 * The implementation now lives in the isolated, swappable data layer
 * (`@/data`): the parser in `queryParser.ts`, the engines in `queryEngine.ts`.
 * This module preserves the engine's historical import surface so the renderer
 * and `engine.ts` keep importing from `./query`.
 */

import type { StructuredQuery } from '@/contracts'
import { parseQueryText, type ParsedQuery } from '@/data'

export type { QueryResult, QueryEngine } from '@/data'
export {
  createInterfaceQueryEngine,
  createPreviewQueryEngine,
  defaultQueryParser,
  createQueryParser,
} from '@/data'

/**
 * Backward-compatible text-DSL parse helper. Prefer `@/data`'s `QueryParser`
 * for new code; this adapter keeps the older `{ structured, countOnly }` shape.
 */
export function parseQueryString(input: string): {
  structured: StructuredQuery
  countOnly: boolean
} {
  const parsed: ParsedQuery = parseQueryText(input)
  const filter: Record<string, unknown> = {}
  for (const p of parsed.where) filter[p.column] = p.value
  return {
    structured: {
      table: parsed.table,
      ...(parsed.columns?.length ? { columns: parsed.columns } : {}),
      ...(parsed.where.length ? { filter } : {}),
    },
    countOnly: parsed.aggregate === 'count',
  }
}
