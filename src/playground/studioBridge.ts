/**
 * Studio-side transport for the postMessage protocol (SPEC §1).
 *
 * This is the mirror image of the Sandbox's `SandboxBridge`: it posts
 * Studio → Sandbox messages into the embedded iframe's `contentWindow` and
 * listens on the parent window for Sandbox → Studio messages. It reuses the
 * SAME typed envelope (`wrap`/`unwrap`, channel, version) the Sandbox agrees on,
 * so the mock-studio playground drives a real sandbox exactly as the Studio will.
 *
 * Owned by the test-harness worker; it only *consumes* the foundation protocol.
 */

import {
  type SandboxToStudioMessage,
  type StudioToSandboxMessage,
  unwrap,
  wrap,
} from '@/protocol'

export type SandboxMessageHandler = (msg: SandboxToStudioMessage) => void

export interface StudioBridgeOptions {
  /** Expected sandbox origin. '*' accepts any (dev/same-origin iframe). */
  targetOrigin?: string
}

export class StudioBridge {
  private readonly targetOrigin: string
  private target: Window | null = null
  private readonly handlers = new Set<SandboxMessageHandler>()
  private listening = false
  private readonly boundListener: (ev: MessageEvent) => void

  constructor(opts: StudioBridgeOptions = {}) {
    this.targetOrigin = opts.targetOrigin ?? '*'
    this.boundListener = (ev) => this.onMessage(ev)
  }

  /** Point the bridge at the sandbox iframe's window (call on iframe load). */
  attach(frameWindow: Window | null): void {
    this.target = frameWindow
  }

  /** Start listening for Sandbox → Studio messages. */
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

  /** Register an inbound handler. Returns an unsubscribe fn. */
  onSandboxMessage(handler: SandboxMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /** Send a typed message to the sandbox iframe. No-op when not attached. */
  send(msg: StudioToSandboxMessage): void {
    if (!this.target) return
    this.target.postMessage(wrap(msg), this.targetOrigin)
  }

  private onMessage(ev: MessageEvent): void {
    if (this.targetOrigin !== '*' && ev.origin !== this.targetOrigin) return
    const msg = unwrap<SandboxToStudioMessage>(ev.data)
    if (!msg) return
    for (const h of this.handlers) h(msg)
  }
}
