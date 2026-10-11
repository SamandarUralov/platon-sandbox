/**
 * Sandbox-side transport for the postMessage protocol (SPEC §1).
 *
 * `SandboxBridge` wraps `window.postMessage` with the typed envelope, origin
 * handling, and a simple handler registry. When the Sandbox is NOT embedded in
 * an iframe (standalone dev / `ao preview`), it degrades gracefully: outbound
 * messages are no-ops (logged in dev) and the app falls back to the demo seed.
 *
 * Origin: the embedding Studio names itself with `?studioOrigin=<origin>`; it is
 * honoured only when listed in `VITE_STUDIO_ORIGINS` (or equal to the Sandbox's
 * own origin, which the playground uses). Messages are then posted to exactly
 * that origin and inbound messages from any other origin are dropped.
 */

import {
  type SandboxToStudioMessage,
  type StudioToSandboxMessage,
  unwrap,
  wrap,
} from './messages'

export type StudioMessageHandler = (msg: StudioToSandboxMessage) => void

/** Origins allowed to embed and drive the Sandbox. */
export function allowedStudioOrigins(
  env: string | undefined = import.meta.env.VITE_STUDIO_ORIGINS,
  self: string | undefined = typeof window !== 'undefined' ? window.location.origin : undefined,
): string[] {
  const list = (env ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return self ? [...new Set([...list, self])] : list
}

/**
 * The Studio origin to talk to, from `?studioOrigin=`, or null when it is
 * missing from the allowlist. Without the param, the Sandbox's own origin.
 */
export function resolveStudioOrigin(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  allowed: string[] = allowedStudioOrigins(),
): string | null {
  const requested = new URLSearchParams(search).get('studioOrigin')?.replace(/\/$/, '')
  if (!requested) return typeof window !== 'undefined' ? window.location.origin : null
  return allowed.includes(requested) ? requested : null
}

export interface SandboxBridgeOptions {
  /**
   * Exact Studio origin. Defaults to `resolveStudioOrigin()`; null leaves the
   * bridge inert (nothing sent, nothing accepted). '*' is for tests only.
   */
  targetOrigin?: string | null
  /** The window to post to (defaults to window.parent). */
  target?: Window | null
}

export class SandboxBridge {
  private readonly targetOrigin: string | null
  private readonly target: Window | null
  private readonly handlers = new Set<StudioMessageHandler>()
  private listening = false
  private readonly boundListener: (ev: MessageEvent) => void

  /** True when embedded in a parent frame (Studio present). */
  readonly embedded: boolean

  constructor(opts: SandboxBridgeOptions = {}) {
    this.targetOrigin = opts.targetOrigin === undefined ? resolveStudioOrigin() : opts.targetOrigin
    this.embedded = typeof window !== 'undefined' && window.parent !== window
    this.target = opts.target ?? (this.embedded ? window.parent : null)
    this.boundListener = (ev) => this.onMessage(ev)
    if (this.embedded && this.targetOrigin === null) {
      console.warn('[sandbox-bridge] embedding origin is not in VITE_STUDIO_ORIGINS; bridge disabled')
    }
  }

  /** Start listening for Studio → Sandbox messages. */
  start(): void {
    if (this.listening || typeof window === 'undefined') return
    window.addEventListener('message', this.boundListener)
    this.listening = true
  }

  stop(): void {
    if (!this.listening || typeof window === 'undefined') return
    window.removeEventListener('message', this.boundListener)
    this.listening = false
  }

  /** Register a handler for inbound Studio messages. Returns an unsubscribe fn. */
  onStudioMessage(handler: StudioMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /** Send a typed message to the Studio. No-op when standalone. */
  send(msg: SandboxToStudioMessage): void {
    if (!this.target || this.targetOrigin === null) {
      if (import.meta.env.DEV) console.debug('[sandbox-bridge] standalone, dropped:', msg)
      return
    }
    this.target.postMessage(wrap(msg), this.targetOrigin)
  }

  private onMessage(ev: MessageEvent): void {
    if (this.targetOrigin === null) return
    if (this.targetOrigin !== '*' && ev.origin !== this.targetOrigin) return
    const msg = unwrap<StudioToSandboxMessage>(ev.data)
    if (!msg) return
    for (const h of this.handlers) h(msg)
  }
}
