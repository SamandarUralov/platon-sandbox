/**
 * Typed postMessage protocol (SPEC §1, LOCKED).
 *
 * The Studio embeds the Sandbox as an <iframe>. This module is the single
 * contract both sides agree on. Messages are discriminated unions keyed by
 * `type`, wrapped in an envelope carrying a protocol version + channel tag so a
 * page's own postMessage traffic can be filtered out.
 */

import type { BlockPatch, Mode, ProjectMeta } from '@/contracts'

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

export type StudioToSandboxMessage =
  | InitMessage
  | PatchMessage
  | SetModeMessage
  | SetRoleMessage
  | SelectBlockMessage
  | NavigateMessage

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
 * Drag-over a potential drop location (edit overlay). `index` is the insertion
 * index within the parent's children.
 */
export interface DropTargetMessage {
  type: 'drop-target'
  parentId: string | null
  index: number
  rect?: { x: number; y: number; width: number; height: number }
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

export type SandboxToStudioMessage =
  | ReadyMessage
  | BlockSelectedMessage
  | BlockHoverMessage
  | DropTargetMessage
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
