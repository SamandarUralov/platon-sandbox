/**
 * Typed postMessage protocol (SPEC §1, LOCKED).
 *
 * The Studio embeds the Sandbox as an <iframe>. This module is the single
 * contract both sides agree on. Messages are discriminated unions keyed by
 * `type`, wrapped in an envelope carrying a protocol version + channel tag so a
 * page's own postMessage traffic can be filtered out.
 */

import type { BlockPatch, DataMode, Mode, ProjectMeta } from '@/contracts'

export const PROTOCOL_VERSION = 1 as const

/** Channel tag stamped on every envelope so we ignore foreign messages. */
export const PROTOCOL_CHANNEL = 'platon-sandbox' as const

/* ------------------------------------------------------------------ *
 * Studio → Sandbox
 * ------------------------------------------------------------------ */

/** Full project meta on boot (SPEC §1). */
export interface InitMessage {
  type: 'init'
  meta: ProjectMeta
  mode: Mode
  /** Optional initial page + role to open on. */
  pageId?: string
  role?: string | null
  /**
   * Data source override. Defaults by mode (Interface = mock, Preview = live);
   * `mock` lets a Studio without a backend preview against seeded rows.
   */
  data?: DataMode
  /**
   * Size the document to its content (no viewport min-height) and report it via
   * `content-size`, so the Studio can grow the iframe and scroll/zoom it itself.
   */
  fit?: boolean
}

/** Incremental JSON patch on edit (SPEC §1). */
export interface PatchMessage {
  type: 'patch'
  patch: BlockPatch
}

/** Switch engine mode without a full re-init (SPEC §5). */
export interface SetModeMessage {
  type: 'set-mode'
  mode: Mode
}

/** Preview-as-<role> switch (SPEC §7). */
export interface SetRoleMessage {
  type: 'set-role'
  role: string | null
}

/** Programmatically select/scroll to a block from the Studio tree. */
export interface SelectBlockMessage {
  type: 'select-block'
  blockId: string | null
}

/** Navigate the sandbox to a page (Interface = canvas swap). */
export interface NavigateMessage {
  type: 'navigate'
  pageId: string
}

/**
 * Live drag position forwarded from the Studio (edit overlay, Interface only).
 *
 * Cross-origin iframes cannot read the drag `dataTransfer` during `dragover`,
 * so the Studio forwards the pointer (and what is being dragged) here; the
 * Sandbox resolves the drop target against its tree and replies with
 * `drop-target`. `point` is in the Sandbox iframe's viewport coordinates.
 */
export interface DragOverMessage {
  type: 'drag-over'
  point: { x: number; y: number }
  /** What is being dragged: a new block (`component`) or an existing block. */
  draggable?: { component?: string; blockId?: string }
}

/** Drag ended/cancelled; the Sandbox should clear any drop indicator. */
export interface DragEndMessage {
  type: 'drag-end'
}

export type StudioToSandboxMessage =
  | InitMessage
  | PatchMessage
  | SetModeMessage
  | SetRoleMessage
  | SelectBlockMessage
  | NavigateMessage
  | DragOverMessage
  | DragEndMessage

/* ------------------------------------------------------------------ *
 * Sandbox → Studio
 * ------------------------------------------------------------------ */

/** Sandbox booted and listening. */
export interface ReadyMessage {
  type: 'ready'
  protocolVersion: typeof PROTOCOL_VERSION
}

/** User selected a block in the canvas (edit overlay). */
export interface BlockSelectedMessage {
  type: 'block-selected'
  blockId: string | null
}

/** User hovered a block in the canvas (edit overlay). */
export interface BlockHoverMessage {
  type: 'block-hover'
  blockId: string | null
}

/**
 * Where the selected block sits in the viewport (edit overlay, Interface only), so the Studio can
 * draw its block toolbar (and grid resize handle) over the iframe. Re-sent when the layout moves it; `rect` null = gone.
 */
export interface BlockRectMessage {
  type: 'block-rect'
  blockId: string | null
  rect: { x: number; y: number; width: number; height: number } | null
  /** The 12-column row the block sits in, when it sits in one (for the Studio's resize handle). */
  grid?: { width: number; stacked: boolean }
}

/**
 * Preview: a block emitted an event (button click, input change, row click, ...). The Studio runs
 * the page script's `on` handler for it. `event` is the component's own name (e.g. `row-click`);
 * `payload` is its first argument as plain data.
 */
export interface BlockEventMessage {
  type: 'block-event'
  blockId: string
  event: string
  payload?: unknown
}

/**
 * Drag-over a potential drop location (edit overlay). `index` is the insertion
 * index within the parent's children.
 */
export interface DropTargetMessage {
  type: 'drop-target'
  parentId: string | null
  index: number
  rect?: { x: number; y: number; width: number; height: number }
  /** The receiving container's rect (page canvas for the root). */
  parentRect?: { x: number; y: number; width: number; height: number }
}

/** No valid drop target under the pointer (or drag ended): hide the indicator. */
export interface DropClearMessage {
  type: 'drop-clear'
}

/** A compile/runtime error surfaced from the sandbox (SPEC §9). */
export interface ErrorMessage {
  type: 'error'
  message: string
  stack?: string
  /** Block/page the error is attributed to, when known. */
  source?: { blockId?: string; pageId?: string }
}

/** A console entry mirrored to the Studio's console panel (SPEC §9). */
export interface ConsoleMessage {
  type: 'console'
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  args: unknown[]
}

/**
 * A drag was released over the canvas (edit overlay, Interface only). The
 * Studio owns the edit, so it combines this location with what it was dragging:
 * a palette item it started itself, or `source.blockId` for a block dragged
 * inside the Sandbox.
 */
export interface DropMessage {
  type: 'drop'
  parentId: string | null
  index: number
  source?: { blockId?: string }
}

/** Document content height changed (sent only when `init.fit` is set). */
export interface ContentSizeMessage {
  type: 'content-size'
  height: number
}

/** The Sandbox moved to another page on its own (menu click, `navigate` action). */
export interface PageChangedMessage {
  type: 'page-changed'
  pageId: string
}

/** The in-sandbox "Preview as" switcher changed the role. */
export interface RoleChangedMessage {
  type: 'role-changed'
  role: string | null
}

export type SandboxToStudioMessage =
  | ReadyMessage
  | BlockSelectedMessage
  | BlockHoverMessage
  | BlockRectMessage
  | BlockEventMessage
  | DropTargetMessage
  | DropClearMessage
  | DropMessage
  | ContentSizeMessage
  | PageChangedMessage
  | RoleChangedMessage
  | ErrorMessage
  | ConsoleMessage

/* ------------------------------------------------------------------ *
 * Envelope
 * ------------------------------------------------------------------ */

export interface Envelope<T> {
  channel: typeof PROTOCOL_CHANNEL
  version: typeof PROTOCOL_VERSION
  payload: T
}

export function wrap<T>(payload: T): Envelope<T> {
  return { channel: PROTOCOL_CHANNEL, version: PROTOCOL_VERSION, payload }
}

/** Narrow an unknown `message` into a valid envelope, or return null. */
export function unwrap<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null
  const env = data as Partial<Envelope<T>>
  if (env.channel !== PROTOCOL_CHANNEL) return null
  if (env.version !== PROTOCOL_VERSION) return null
  if (env.payload === undefined) return null
  return env.payload as T
}
