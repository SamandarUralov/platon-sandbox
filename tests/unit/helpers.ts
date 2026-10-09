/**
 * Shared mounting helpers for engine/renderer unit tests.
 *
 * Two entry points:
 *   - `mountPage`   — the realistic path: EngineProvider › PageRenderer, exactly
 *                     as SandboxRoot wires it (used for snapshots + patch tests).
 *   - `mountBlocks` — a low-level path that builds the engine by hand so tests
 *                     can register extra components (e.g. a throwing block for
 *                     the error-boundary test) and capture host errors.
 */
import { computed, defineComponent, h, ref, type Component } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { Block, Mode, PageMeta, ProjectMeta } from '@/contracts'
import { createEngine, EngineKey } from '@/engine/engine'
import { CapabilitiesKey, capabilitiesFor, ModeKey } from '@/engine/mode'
import { HostKey, type SandboxHost } from '@/engine/host'
import EngineProvider from '@/engine/EngineProvider.vue'
import PageRenderer from '@/engine/PageRenderer.vue'
import BlockRenderer from '@/engine/BlockRenderer.vue'
import { useSandboxStore } from '@/state'

export interface MountOpts {
  mode?: Mode
  role?: string | null
  pageId?: string
}

/** A host that records every error/console call for assertions. */
export interface RecordingHost extends SandboxHost {
  errors: { message: string; blockId?: string; pageId?: string }[]
  consoles: { level: string; args: unknown[] }[]
}

export function recordingHost(): RecordingHost {
  const errors: RecordingHost['errors'] = []
  const consoles: RecordingHost['consoles'] = []
  return {
    errors,
    consoles,
    selectBlock() {},
    hoverBlock() {},
    reportError(p) {
      errors.push({ message: p.message, blockId: p.blockId, pageId: p.pageId })
    },
    reportConsole(level, args) {
      consoles.push({ level, args })
    },
    bridge: null,
  }
}

/** Fresh pinia + store with meta loaded. Call inside each test. */
export function freshStore(meta: ProjectMeta, opts: MountOpts = {}) {
  setActivePinia(createPinia())
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useSandboxStore()
  store.loadMeta(meta, { mode: opts.mode ?? 'interface', pageId: opts.pageId, role: opts.role ?? null })
  return { pinia, store }
}

/**
 * Mount a page through the real EngineProvider › PageRenderer chain.
 * Mirrors SandboxRoot so snapshots reflect production rendering.
 */
export function mountPage(meta: ProjectMeta, opts: MountOpts = {}) {
  const { pinia, store } = freshStore(meta, opts)
  const page = (meta.pages.find((p) => p.id === opts.pageId) ?? meta.pages[0]) as PageMeta
  const host = recordingHost()

  const Wrapper = defineComponent({
    name: 'PageHarness',
    setup() {
      return () =>
        h(
          EngineProvider,
          { meta, mode: opts.mode ?? 'interface' },
          { default: () => h(PageRenderer, { page }) },
        )
    },
  })

  const wrapper = mount(Wrapper, {
    global: {
      plugins: [pinia],
      provide: { [HostKey as symbol]: host },
    },
  })
  return { wrapper, store, host, page }
}

/**
 * Mount a flat list of blocks with a hand-built engine, so tests can inject
 * extra/throwing components and inspect reported errors.
 */
export function mountBlocks(
  meta: ProjectMeta,
  blocks: Block[],
  opts: MountOpts & { extraComponents?: Record<string, Component> } = {},
) {
  const { pinia, store } = freshStore(meta, opts)
  const mode = opts.mode ?? 'interface'
  const host = recordingHost()

  const engine = createEngine({ meta, mode })
  for (const [key, comp] of Object.entries(opts.extraComponents ?? {})) {
    engine.registry.registerCustom(key, comp)
  }

  const modeRef = ref<Mode>(mode)
  const caps = computed(() => capabilitiesFor(modeRef.value))

  const Wrapper = defineComponent({
    name: 'BlocksHarness',
    setup() {
      return () => blocks.map((b) => h(BlockRenderer, { block: b, key: b.id }))
    },
  })

  const wrapper = mount(Wrapper, {
    global: {
      plugins: [pinia],
      provide: {
        [EngineKey as symbol]: engine,
        [ModeKey as symbol]: modeRef,
        [CapabilitiesKey as symbol]: caps,
        [HostKey as symbol]: host,
      },
    },
  })

  return { wrapper, store, host, engine }
}

/** A component that throws during setup — for the error-boundary test. */
export const ThrowingBlock: Component = defineComponent({
  name: 'ThrowingBlock',
  setup() {
    throw new Error('intentional block explosion')
  },
  render: () => null,
})

export type { VueWrapper }
