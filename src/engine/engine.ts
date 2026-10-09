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

import type { Mode, ProjectMeta } from '@/contracts'
import { createRegistry, type ComponentRegistry } from './registry'
import { createInterfaceQueryEngine, type QueryEngine } from './query'
import { createLogicEngine, type LogicEngine } from './logic'
import { createMockStore, type DataSource } from '@/data/mockStore'
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
}

export function createEngine(opts: CreateEngineOptions): EngineContext {
  const { meta, mode } = opts

  const registry = createRegistry()
  const importMap = createImportMap()
  const dataSource = createMockStore(meta.data_models ?? [])
  const query = createInterfaceQueryEngine(dataSource)
  const logic = createLogicEngine({ mode, onError: opts.onError })
  const http = axios.create({ baseURL: opts.httpBaseUrl })

  return { mode, registry, importMap, dataSource, query, logic, http }
}

export const EngineKey: InjectionKey<EngineContext> = Symbol('platon.engine')

export function useEngine(): EngineContext {
  const engine = inject(EngineKey)
  if (!engine) throw new Error('[engine] useEngine() called outside an engine provider')
  return engine
}
