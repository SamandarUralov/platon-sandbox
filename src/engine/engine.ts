/**
 * Engine container (SPEC §1 interpreter core).
 *
 * Bundles the swappable services the renderer needs — registry (§3), import map
 * (§4), data source (§6), query engine (§6), logic engine (§4) — behind one
 * provide/inject handle so future workers can replace any single service without
 * touching the renderer.
 */

import { type InjectionKey, inject } from 'vue'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { QueryClient } from '@tanstack/vue-query'

import type { Mode, ProjectMeta } from '@/contracts'
import { createRegistry, type ComponentRegistry } from './registry'
import { type QueryEngine } from './query'
import { createLogicEngine, type LogicEngine } from './logic'
import { createMockStore, createQueryEngineForMode, type DataSource } from '@/data'
import { createImportMap, type ImportMap } from '@/importmap'

export interface EngineContext {
  mode: Mode
  registry: ComponentRegistry
  importMap: ImportMap
  dataSource: DataSource
  query: QueryEngine
  logic: LogicEngine
  /** Preconfigured axios (used by Preview; inert calls in Interface). */
  http: AxiosInstance
}

export interface CreateEngineOptions {
  meta: ProjectMeta
  mode: Mode
  onError?: (error: unknown, source?: string) => void
  /** Base URL for the Preview axios instance. */
  httpBaseUrl?: string
  /** Inject a preconfigured axios instance (tests / shared client). */
  http?: AxiosInstance
  /** Inject a tanstack QueryClient for Preview caching (tests / shared client). */
  queryClient?: QueryClient
}

export function createEngine(opts: CreateEngineOptions): EngineContext {
  const { meta, mode } = opts

  const registry = createRegistry()
  const importMap = createImportMap()
  // The mock store always exists (it also backs Interface overlay/demo), but
  // only Interface mode queries route through it (SPEC §5).
  const dataSource = createMockStore(meta.data_models ?? [])
  const http = opts.http ?? axios.create({ baseURL: opts.httpBaseUrl })
  const logic = createLogicEngine({ mode, onError: opts.onError })

  // Mode selects the data path (SPEC §5): Interface = in-memory mock, no HTTP;
  // Preview = real axios cached through tanstack-query. A QueryClient is always
  // provided in Preview so caching is real even when none is injected.
  const query: QueryEngine = createQueryEngineForMode({
    mode,
    source: dataSource,
    http,
    queryClient:
      mode === 'preview'
        ? (opts.queryClient ??
          // Sensible Preview defaults: cache reads within a session; explicit
          // refetch actions (SPEC §2 `refetch`) invalidate when implemented.
          new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } }))
        : undefined,
  })

  return { mode, registry, importMap, dataSource, query, logic, http }
}

export const EngineKey: InjectionKey<EngineContext> = Symbol('platon.engine')

export function useEngine(): EngineContext {
  const engine = inject(EngineKey)
  if (!engine) throw new Error('[engine] useEngine() called outside an engine provider')
  return engine
}
