/**
 * Platon Sandbox — Meta contract (SPEC §2, LOCKED shape).
 *
 * These are the stable TypeScript types that every worker builds against. The
 * runtime-validation counterparts live in `./schemas.ts` (zod); the two are kept
 * structurally in sync. The `ctx` execution contract lives in `./ctx.ts`.
 *
 * Treat these as a public contract: additive changes only unless the SPEC moves.
 */

/** Runtime mode for the whole engine (SPEC §5). */
export type Mode = 'interface' | 'preview'

/** A column in a data model (SPEC §2 data_models). */
export interface DataModelColumn {
  name: string
  type: string
}

export interface DataModel {
  table: string
  columns: DataModelColumn[]
  /** Optional explicit seed rows; when absent, faker seeds from the schema. */
  seed?: Record<string, unknown>[]
}

/** A custom component shipped as code in the meta (SPEC §2, compiled per §4). */
export interface CustomComponent {
  id: string
  name: string
  kind: 'vue' | 'js'
  code: string
}

/** A global hook exposed at `@/hooks` (SPEC §4 import map). */
export interface GlobalHook {
  name: string
  code: string
}

/** Explicit, studio-managed navigation tree (SPEC §2, §7). */
export interface MenuNode {
  id: string
  label: string
  /** Page id this entry routes to (leaf nodes). */
  page?: string
  /** Optional icon registry key. */
  icon?: string
  /** Roles permitted to see this entry; absent = everyone. */
  visible_to?: string[]
  children?: MenuNode[]
}

/**
 * Declarative + imperative actions (SPEC §2). One event may fire an ordered
 * pipeline of actions. The logic engine (future worker, SPEC §4) consumes these;
 * the foundation only types and validates them.
 */
export type Action =
  | { type: 'navigate'; to: string; params?: Record<string, unknown> }
  | { type: 'open_modal'; modal: string; props?: Record<string, unknown> }
  | { type: 'open_form'; form: string; props?: Record<string, unknown> }
  | { type: 'refetch'; target?: string }
  | { type: 'toast'; message: string; level?: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'emit'; event: string; payload?: unknown }
  | { type: 'close'; target?: string }
  | { type: 'submit'; target?: string }
  /** Imperative custom logic; receives `ctx` (SPEC §4). */
  | { type: 'run'; code: string }

/** Structured query form of a block's data binding (SPEC §2, §6). */
export interface StructuredQuery {
  table: string
  columns?: string[]
  filter?: Record<string, unknown>
}

/** A block's data binding: a DSL string (`count(... where ...)`) or structured. */
export type BlockQuery = string | StructuredQuery

/** Position of a block within its parent container (SPEC §8). */
export interface BlockLayout {
  row?: number
  column?: number
  colSpan?: number
  rowSpan?: number
  [key: string]: unknown
}

/** CRUD-per-role permission matrix; visual in Interface (SPEC §7). */
export interface BlockPermissions {
  create?: string[]
  read?: string[]
  update?: string[]
  delete?: string[]
  [key: string]: string[] | undefined
}

/**
 * A single node in the recursive block tree (SPEC §2, §8). The renderer walks
 * `children[]` recursively; each node is wrapped in a per-block error boundary.
 */
export interface Block {
  id: string
  /** Registry key → resolved to a component by the 3-layer registry (SPEC §3). */
  component: string
  props?: Record<string, unknown>
  /** Inline items, e.g. for `stat_group`. */
  items?: unknown[]
  query?: BlockQuery
  /** event name → ordered action pipeline. */
  events?: Record<string, Action[]>
  visible_to?: string[]
  permissions?: BlockPermissions
  layout?: BlockLayout
  children?: Block[]
}

/** Lifecycle hook code strings for a page (SPEC §2; executed only in Preview). */
export interface PageLifecycle {
  onPageInit?: string
  onBeforeRender?: string
  onPageReady?: string
  onBeforeRefresh?: string
  onAfterRefresh?: string
  onPageResume?: string
  onPagePause?: string
  onBeforeLeave?: string
  onPageLeave?: string
  onPageError?: string
}

export interface PageMeta {
  id: string
  label: string
  path: string
  parent?: string | null
  in_menu?: boolean
  visible_to?: string[]
  lifecycle?: PageLifecycle
  blocks: Block[]
}

/** Theme tokens projected to CSS variables (SPEC §2). */
export interface ThemeMeta {
  tokens: Record<string, string>
}

/** The top-level project meta the Studio hands to the Sandbox (SPEC §2). */
export interface ProjectMeta {
  schemaVersion: number
  id: string
  name: string
  theme: ThemeMeta
  roles: string[]
  data_models: DataModel[]
  custom_components: CustomComponent[]
  /** Pinia-backed global state blob; shape is project-defined. */
  global_state: Record<string, unknown>
  global_hooks: GlobalHook[]
  menu: MenuNode[]
  pages: PageMeta[]
}

/** A single JSON patch applied on edit (SPEC §1). */
export interface BlockPatch {
  blockId: string
  /** Dot/array path within the block, e.g. `props.title` or `items.0.value`. */
  path: string
  value: unknown
}
