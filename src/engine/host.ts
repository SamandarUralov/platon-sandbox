/**
 * Host wiring (provide/inject) that connects the renderer to the outside world:
 * the postMessage bridge (SPEC §1) and error/console reporting (SPEC §9).
 *
 * Kept as a thin, injectable surface so the renderer never imports the bridge
 * directly and tests can provide a no-op host.
 */

import { type InjectionKey, inject } from 'vue'
import type { SandboxBridge } from '@/protocol'

export interface SandboxHost {
  /** Edit-overlay: a block was selected in the canvas (Interface only). */
  selectBlock(blockId: string | null): void
  /** Edit-overlay: a block is hovered in the canvas (Interface only). */
  hoverBlock(blockId: string | null): void
  /** Report a block/compile/runtime error (→ console + Studio bridge). */
  reportError(payload: { message: string; stack?: string; blockId?: string; pageId?: string }): void
  /** Mirror a console entry to the Studio console panel. */
  reportConsole(level: 'log' | 'info' | 'warn' | 'error' | 'debug', args: unknown[]): void
  /** Underlying bridge (may be standalone/no-op). */
  bridge: SandboxBridge | null
}

export const HostKey: InjectionKey<SandboxHost> = Symbol('platon.host')

/** No-op host for standalone/test contexts. */
export function noopHost(): SandboxHost {
  return {
    selectBlock() {},
    hoverBlock() {},
    reportError() {},
    reportConsole() {},
    bridge: null,
  }
}

export function useHost(): SandboxHost {
  return inject(HostKey, noopHost())
}
