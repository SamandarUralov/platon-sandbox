/**
 * Import Map / module resolver (SPEC §4, LOCKED aliases).
 *
 * User code (custom components + lifecycle/`run` logic) uses real ESM `import`.
 * At runtime the logic engine (future worker) rewrites/resolves those specifiers
 * through this resolver. The foundation owns the *interface* and the fixed alias
 * set; `ctx` is injected separately and is deliberately NOT importable.
 *
 * LOCKED aliases:
 *   vue, @platon-rs/platon-ui-kit, @/hooks, @/components, @/state, @/theme
 *
 * Extra npm packages resolve via esm.sh (version-pinned) and are added to the
 * map dynamically — `addPackage()` is stubbed here (real fetch/registration is a
 * later worker; Release installs them for real).
 */

/** A resolved module namespace (whatever the loader produced). */
export type ModuleNamespace = Record<string, unknown>

/** The fixed specifiers the Studio contract guarantees (SPEC §4). */
export const LOCKED_SPECIFIERS = [
  'vue',
  '@platon-rs/platon-ui-kit',
  '@/hooks',
  '@/components',
  '@/state',
  '@/theme',
] as const

export type LockedSpecifier = (typeof LOCKED_SPECIFIERS)[number]

/** esm.sh base for dynamic package resolution (version pinned per request). */
export const ESM_SH_BASE = 'https://esm.sh'

export interface ImportMap {
  /** Register (or replace) a resolved module under a specifier. */
  register(specifier: string, namespace: ModuleNamespace): void
  /** Synchronously resolve a specifier, or undefined if unknown. */
  resolve(specifier: string): ModuleNamespace | undefined
  /** True if a specifier is currently registered. */
  has(specifier: string): boolean
  /** All known specifiers (for building a browser `<script type=importmap>`). */
  specifiers(): string[]
  /**
   * Dynamically add an npm package via esm.sh and register it (SPEC §4).
   * STUB: real network resolution is a later worker. Returns the esm.sh URL it
   * *would* load so the Release path and future loader can share URL-building.
   */
  addPackage(name: string, version?: string): Promise<string>
  /** Build the plain object for an actual browser import map. */
  toImportMapJson(): { imports: Record<string, string> }
}

export interface CreateImportMapOptions {
  /** Pre-resolved locked modules, provided by the host at boot. */
  locked?: Partial<Record<LockedSpecifier, ModuleNamespace>>
}

/**
 * Build the esm.sh URL for a package (version-pinned). Centralized so Interface,
 * Preview, and the future Release path all agree on the pin format.
 */
export function esmShUrl(name: string, version?: string): string {
  const pinned = version ? `${name}@${version}` : name
  return `${ESM_SH_BASE}/${pinned}`
}

export function createImportMap(opts: CreateImportMapOptions = {}): ImportMap {
  const registry = new Map<string, ModuleNamespace>()
  const urlMap = new Map<string, string>()

  if (opts.locked) {
    for (const [spec, ns] of Object.entries(opts.locked)) {
      if (ns) registry.set(spec, ns)
    }
  }

  return {
    register(specifier, namespace) {
      registry.set(specifier, namespace)
    },
    resolve(specifier) {
      return registry.get(specifier)
    },
    has(specifier) {
      return registry.has(specifier)
    },
    specifiers() {
      return [...registry.keys()]
    },
    async addPackage(name, version) {
      const url = esmShUrl(name, version)
      urlMap.set(name, url)
      // STUB (SPEC §4): a later worker fetches + registers the live namespace:
      //   const ns = await import(/* @vite-ignore */ url); registry.set(name, ns)
      // Kept inert here so the foundation has no network dependency.
      if (import.meta.env.DEV) {
        console.debug(`[import-map] addPackage stub: ${name} -> ${url}`)
      }
      return url
    },
    toImportMapJson() {
      const imports: Record<string, string> = {}
      for (const [name, url] of urlMap) imports[name] = url
      return { imports }
    },
  }
}
