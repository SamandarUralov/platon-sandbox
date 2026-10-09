/**
 * Engine container (SPEC §1 interpreter core).
 *
 * Bundles the swappable services the renderer needs — registry (§3), import map
 * (§4), data source (§6), query engine (§6), logic engine (§4), action dispatcher
 * (§2) — behind one provide/inject handle so future workers can replace any
 * single service without touching the renderer.
 *
 * At construction it also performs the one-time user-code compilation that a
 * project needs up front (SPEC §4): the locked import-map namespaces are
 * registered, global hooks are compiled into `@/hooks`, and custom components are
 * compiled + registered into the registry (§3 layer 3).
 */

import { type InjectionKey, inject } from 'vue'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { QueryClient } from '@tanstack/vue-query'
import * as Vue from 'vue'
import * as UiKit from '@platon-rs/platon-ui-kit'

import type { Mode, ProjectMeta, GlobalHook } from '@/contracts'
import { createRegistry, type ComponentRegistry } from './registry'
import { type QueryEngine } from './query'
import { createLogicEngine, type LogicEngine } from './logic'
import { createActionDispatcher, type ActionDispatcher } from './dispatcher'
import { registerCustomComponents } from './customComponents'
import { evaluateUserModule } from './moduleEval'
import { createMockStore, createQueryEngineForMode, type DataSource } from '@/data'
import { createImportMap, type ImportMap, type ModuleNamespace } from '@/importmap'
import * as HooksModule from '@/hooks'
import * as ThemeModule from '@/theme'
import * as ComponentsModule from '@/components'
import * as StateModule from '@/state'

export interface EngineContext {
  mode: Mode
  registry: ComponentRegistry
  importMap: ImportMap
  dataSource: DataSource
  query: QueryEngine
  logic: LogicEngine
  dispatcher: ActionDispatcher
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

/**
 * Compile the meta's `global_hooks` into a `@/hooks` namespace (SPEC §4). Each
 * hook's default export is registered both in the hooks registry module and as a
 * named export so user code can `import { useX } from '@/hooks'`.
 */
function buildHooksNamespace(
  hooks: GlobalHook[] | undefined,
  importMap: ImportMap,
  onError?: (error: unknown, source?: string) => void,
): ModuleNamespace {
  const ns: ModuleNamespace = { ...(HooksModule as unknown as ModuleNamespace) }
  for (const hook of hooks ?? []) {
    try {
      const fn = evaluateUserModule(hook.code, { importMap, label: `global hook "${hook.name}"` })
      HooksModule.registerHook(hook.name, fn as HooksModule.HookFactory)
      ns[hook.name] = fn
    } catch (err) {
      onError?.(err, `global-hook:${hook.name}`)
    }
  }
  return ns
}

export function createEngine(opts: CreateEngineOptions): EngineContext {
  const { meta, mode } = opts

  const registry = createRegistry()
  const importMap = createImportMap()

  // Register the LOCKED import-map namespaces (SPEC §4). `vue` is the runtime-
  // compiler build so user templates compile in-browser (see vite.config.ts).
  importMap.register('vue', Vue as unknown as ModuleNamespace)
  importMap.register('@platon-rs/platon-ui-kit', UiKit as unknown as ModuleNamespace)
  importMap.register('@/theme', ThemeModule as unknown as ModuleNamespace)
  importMap.register('@/components', ComponentsModule as unknown as ModuleNamespace)
  importMap.register('@/state', StateModule as unknown as ModuleNamespace)

  // Global hooks → `@/hooks` (compiled before components, which may import them).
  importMap.register('@/hooks', buildHooksNamespace(meta.global_hooks, importMap, opts.onError))

  // Custom components → registry (SPEC §3 layer 3). Registered under id + name.
  registerCustomComponents(meta.custom_components, registry, {
    importMap,
    onError: opts.onError,
  })

  // The mock store always exists (it also backs Interface overlay/demo), but
  // only Interface mode queries route through it (SPEC §5).
  const dataSource = createMockStore(meta.data_models ?? [])
  const http = opts.http ?? axios.create({ baseURL: opts.httpBaseUrl })
  const logic = createLogicEngine({ mode, importMap, onError: opts.onError })
  const dispatcher = createActionDispatcher({ logic, onError: opts.onError })

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

  return { mode, registry, importMap, dataSource, query, logic, dispatcher, http }
}

export const EngineKey: InjectionKey<EngineContext> = Symbol('platon.engine')

export function useEngine(): EngineContext {
  const engine = inject(EngineKey)
  if (!engine) throw new Error('[engine] useEngine() called outside an engine provider')
  return engine
}
