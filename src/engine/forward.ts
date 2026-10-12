/**
 * Preview: block events go to the Studio, which runs the page script (`on: { '<ref>.<event>' }`).
 * Every event a component declares is forwarded; the Studio maps names to definition events.
 */
import type { Component } from 'vue'

/** Event names a component declares (`emits` as an array or an object). */
export function emitNames(component: Component | null | undefined): string[] {
  const emits = (component as { emits?: unknown } | null | undefined)?.emits
  if (Array.isArray(emits)) return emits.filter((e): e is string => typeof e === 'string')
  return emits && typeof emits === 'object' ? Object.keys(emits) : []
}

/** What can cross postMessage: plain data. DOM nodes, events and functions are dropped. */
export function eventPayload(arg: unknown): unknown {
  try {
    const text = JSON.stringify(arg, (_k, v: unknown) =>
      typeof v === 'function' ||
      (typeof Event !== 'undefined' && v instanceof Event) ||
      (typeof Node !== 'undefined' && v instanceof Node)
        ? undefined
        : v,
    )
    return text === undefined ? undefined : (JSON.parse(text) as unknown)
  } catch {
    // Cyclic or otherwise unserialisable: the handler still runs, without an argument.
    return undefined
  }
}
