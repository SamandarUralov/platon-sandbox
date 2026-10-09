/**
 * `@/components` — custom-components surface (SPEC §4 import map).
 *
 * `custom_components` from the meta are compiled at runtime (§4) and registered
 * here (and into the component registry, §3 layer 3) so user code can
 * `import { MyWidget } from '@/components'`. Compilation is a later worker; the
 * foundation owns the registry + resolution.
 */

import type { Component } from 'vue'

const components = new Map<string, Component>()

export function registerCustomComponent(name: string, component: Component): void {
  components.set(name, component)
}

export function getCustomComponent(name: string): Component | undefined {
  return components.get(name)
}

export function customComponentNames(): string[] {
  return [...components.keys()]
}

export function clearCustomComponents(): void {
  components.clear()
}
