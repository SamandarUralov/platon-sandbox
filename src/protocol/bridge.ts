/**
 * Sandbox-side transport for the postMessage protocol (SPEC §1).
 *
 * `SandboxBridge` wraps `window.postMessage` with the typed envelope, origin
 * handling, and a simple handler registry. When the Sandbox is NOT embedded in
 * an iframe (standalone dev / `ao preview`), it degrades gracefully: outbound
 * messages are no-ops (logged in dev) and the app falls back to the demo seed.
 */

import {
  type SandboxToStudioMessage,
  type StudioToSandboxMessage,
  unwrap,
  wrap,
} from './messages'

export type StudioMessageHandler = (msg: StudioToSandboxMessage) => void

export interface SandboxBridgeOptions {
  /**
   * Expected Studio origin. '*' accepts any (dev only). In production the Studio
   * injects its origin via a query param / build env.
   */
  targetOrigin?: string
  /** The window to post to (defaults to window.parent). */
  target?: Window | null
}

export class SandboxBridge {
  private readonly targetOrigin: string
  private readonly target: Window | null
  private readonly handlers = new Set<StudioMessageHandler>()
  private listening = false
  private readonly boundListener: (ev: MessageEvent) => void

  /** True when embedded in a parent frame (Studio present). */
  readonly embedded: boolean

  constructor(opts: SandboxBridgeOptions = {}) {
    this.targetOrigin = opts.targetOrigin ?? '*'
    this.embedded = typeof window !== 'undefined' && window.parent !== window
    this.target = opts.target ?? (this.embedded ? window.parent : null)
    this.boundListener = (ev) => this.onMessage(ev)
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
    if (!this.target) {
      if (import.meta.env.DEV) console.debug('[sandbox-bridge] standalone, dropped:', msg)
      return
    }
    this.target.postMessage(wrap(msg), this.targetOrigin)
  }

  private onMessage(ev: MessageEvent): void {
    if (this.targetOrigin !== '*' && ev.origin !== this.targetOrigin) return
    const msg = unwrap<StudioToSandboxMessage>(ev.data)
    if (!msg) return
    for (const h of this.handlers) h(msg)
  }
}
