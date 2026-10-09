/**
 * `@/hooks` — global hooks surface (SPEC §4 import map).
 *
 * `global_hooks` from the meta are compiled at runtime and registered here so
 * user code can `import { useDebounce } from '@/hooks'`. Compilation is the logic
 * engine's job (later worker); the foundation owns the registry + resolution.
 */

export type HookFactory = (...args: unknown[]) => unknown

const hooks = new Map<string, HookFactory>()

export function registerHook(name: string, fn: HookFactory): void {
  hooks.set(name, fn)
}

export function getHook(name: string): HookFactory | undefined {
  return hooks.get(name)
}

export function hookNames(): string[] {
  return [...hooks.keys()]
}

export function clearHooks(): void {
  hooks.clear()
}
