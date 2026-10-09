/**
 * The `ctx` execution contract (SPEC §4, LOCKED).
 *
 * Every piece of user code — lifecycle hooks and `{type:'run'}` actions — is
 * invoked with a single `ctx` argument. `ctx` is INJECTED, never imported. The
 * logic engine (future worker) builds a concrete `ctx` per page/invocation; the
 * foundation defines the fixed shape and ships a stub factory so the renderer
 * and demo can wire against a stable surface today.
 */

import type { AxiosInstance } from 'axios'
import type { BlockQuery, Mode } from './types'

/** Reactive read/write view over the live block tree, keyed by block id. */
export interface CtxBlocks {
  get(blockId: string): Record<string, unknown> | undefined
  /** Patch a block's props/items reactively (mirrors the Studio patch path). */
  set(blockId: string, path: string, value: unknown): void
}

/** Combined page-local + global reactive state (SPEC §4). */
export interface CtxState {
  page: Record<string, unknown>
  global: Record<string, unknown>
}

/** Data access facade (SPEC §4/§6). Interface = mock store; Preview = backend. */
export interface CtxQuery {
  /** Run a query (DSL string or structured) and return rows / count. */
  run(query: BlockQuery): Promise<unknown>
}

/** Current role/user context for visibility + permission checks (SPEC §7). */
export interface CtxUser {
  role: string | null
  roles: string[]
}

/**
 * The fixed `ctx` contract injected into all user code (SPEC §4).
 * Shape is LOCKED; implementations differ by mode.
 */
export interface Ctx {
  /** reactive block tree (read/write). */
  blocks: CtxBlocks
  /** page + global reactive state. */
  state: CtxState
  /** data access. */
  query: CtxQuery
  /** declarative navigation. */
  navigate(to: string, params?: Record<string, unknown>): void
  /** preconfigured axios instance (Preview only; throws/no-ops in Interface). */
  http: AxiosInstance
  /** current role/user. */
  user: CtxUser
  /** emit a custom event into the action/event bus. */
  emit(event: string, payload?: unknown): void
}

/** Everything the engine needs to build a concrete `ctx` for one invocation. */
export interface CtxEnvironment {
  mode: Mode
  blocks: CtxBlocks
  state: CtxState
  query: CtxQuery
  navigate: Ctx['navigate']
  http: AxiosInstance
  user: CtxUser
  emit: Ctx['emit']
}
