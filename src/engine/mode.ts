/**
 * Mode flag plumbing (SPEC §5, LOCKED).
 *
 * A single interpreter engine runs in one of two modes. Every part of the engine
 * reads the mode through this module (provide/inject), so capability gating is
 * centralized rather than scattered.
 *
 *            | Interface                  | Preview
 *  Data      | mock (faker)               | real axios backend
 *  Lifecycle | off                        | on
 *  Actions   | off (inner UI state only)  | on
 *  Query/svc | off                        | on
 *  Router    | canvas swap                | real navigation
 *  Overlay   | on (select/drag/drop)      | off
 *  Role      | define only                | "Preview as <role>" switcher
 */

import { type InjectionKey, inject, type Ref } from 'vue'
import type { Mode } from '@/contracts'

export type { Mode }

/** Capability matrix derived from the mode (SPEC §5). */
export interface ModeCapabilities {
  mode: Mode
  /** real HTTP + tanstack-query + services. */
  dataLive: boolean
  /** page lifecycle hooks run. */
  lifecycle: boolean
  /** DOM event → action pipelines run (vs inner UI state only). */
  actions: boolean
  /** edit overlay: select/hover/drag/drop. */
  editOverlay: boolean
  /** role switcher ("Preview as <role>") active. */
  roleSwitcher: boolean
  /** router performs real navigation (vs canvas page swap). */
  realRouter: boolean
}

export function capabilitiesFor(mode: Mode): ModeCapabilities {
  const preview = mode === 'preview'
  return {
    mode,
    dataLive: preview,
    lifecycle: preview,
    actions: preview,
    editOverlay: !preview,
    roleSwitcher: preview,
    realRouter: preview,
  }
}

/** Injected reactive mode, available to every engine component. */
export const ModeKey: InjectionKey<Ref<Mode>> = Symbol('platon.mode')
export const CapabilitiesKey: InjectionKey<Ref<ModeCapabilities>> = Symbol('platon.capabilities')

export function useMode(): Ref<Mode> {
  const mode = inject(ModeKey)
  if (!mode) throw new Error('[engine] useMode() called outside a provided mode scope')
  return mode
}

export function useCapabilities(): Ref<ModeCapabilities> {
  const caps = inject(CapabilitiesKey)
  if (!caps) throw new Error('[engine] useCapabilities() called outside a provided scope')
  return caps
}
