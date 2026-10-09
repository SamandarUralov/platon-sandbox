/**
 * Custom-component compiler (SPEC §3 layer 3, §4 Vue runtime compiler).
 *
 * Custom components arrive as code strings in the meta (`kind: 'vue' | 'js'`) and
 * are compiled at runtime, then registered dynamically (SPEC §3). Both kinds are
 * ESM modules whose **default export** is a Vue component definition:
 *
 *  - `kind: 'vue'` — options object with a `template` string, compiled in-browser
 *    by the Vue **runtime compiler** (loaded via `vue/dist/vue.esm-bundler.js`,
 *    see vite.config.ts).
 *  - `kind: 'js'` — a render/`setup`-based component (no template to compile).
 *
 * Imports in the code resolve through the engine import map (`vue`, `@/hooks`,
 * `@/components`, …, SPEC §4). Components receive their data via Vue props — NOT
 * `ctx` (which is for logic only). The module body is watchdog-instrumented too,
 * so a runaway loop at definition time is still bounded (SPEC §4).
 */

import { markRaw, type Component } from 'vue'
import type { CustomComponent } from '@/contracts'
import type { ImportMap } from '@/importmap'
import type { ComponentRegistry } from './registry'
import { CompileError } from './instrument'
import { evaluateUserModule } from './moduleEval'

export interface CompileComponentOptions {
  importMap?: ImportMap
  onError?: (error: unknown, source?: string) => void
}

/**
 * Compile one custom component's code into a Vue component definition. Throws
 * {@link CompileError} on parse/eval failure (the caller decides how to surface).
 */
export function compileCustomComponent(
  def: CustomComponent,
  opts: CompileComponentOptions = {},
): Component {
  const result = evaluateUserModule(def.code, {
    importMap: opts.importMap,
    label: `custom component "${def.name}"`,
  })
  if (!result || (typeof result !== 'object' && typeof result !== 'function')) {
    throw new CompileError(
      `custom component "${def.name}" did not export a component (got ${typeof result})`,
    )
  }
  const component = result as Component & { name?: string }
  // Only name plain options objects; functional components' `name` is read-only.
  if (typeof component === 'object' && !component.name) component.name = def.name
  return markRaw(component)
}

/**
 * Compile every custom component in the meta and register it under both its id
 * and its name (so blocks may reference either). Compile failures are reported
 * and skipped — one bad component never blocks the others (SPEC §9).
 */
export function registerCustomComponents(
  defs: CustomComponent[] | undefined,
  registry: ComponentRegistry,
  opts: CompileComponentOptions = {},
): void {
  if (!defs?.length) return
  for (const def of defs) {
    try {
      const component = compileCustomComponent(def, opts)
      registry.registerCustom(def.id, component)
      if (def.name && def.name !== def.id) registry.registerCustom(def.name, component)
    } catch (err) {
      opts.onError?.(err, `custom-component:${def.id}`)
    }
  }
}
