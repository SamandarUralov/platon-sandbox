/**
 * Sandbox runtime store (Pinia) + the `@/state` global-state surface (SPEC §4).
 *
 * Holds the live project meta, current mode/page/role, edit-overlay selection,
 * and the console buffer (SPEC §9). `applyPatch` mutates the meta tree in place
 * reactively, mirroring the Studio's `{blockId,path,value}` edit protocol.
 *
 * User code imports the global state via `@/state`; `useGlobalState()` exposes
 * the project's `global_state` blob as a reactive object.
 */

import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef } from 'vue'
import type { Block, BlockPatch, Mode, PageMeta, ProjectMeta } from '@/contracts'

export interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  args: unknown[]
  ts: number
  source?: string
}

/** Walk every block in a page (depth-first), yielding each node. */
function* walkBlocks(blocks: Block[]): Generator<Block> {
  for (const b of blocks) {
    yield b
    if (b.children?.length) yield* walkBlocks(b.children)
  }
}

/** Find a block by id across all pages. */
function findBlock(meta: ProjectMeta, blockId: string): Block | null {
  for (const page of meta.pages) {
    for (const b of walkBlocks(page.blocks)) {
      if (b.id === blockId) return b
    }
  }
  return null
}

/** Set a dot/array path on an object, creating intermediate objects. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean)
  if (!parts.length) return
  let cur: Record<string, unknown> = target
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const next = cur[key]
    if (next == null || typeof next !== 'object') cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export const useSandboxStore = defineStore('platon-sandbox', () => {
  // shallowRef: meta is a large tree; we mutate nested nodes reactively below.
  const meta = shallowRef<ProjectMeta | null>(null)
  const mode = ref<Mode>('interface')
  const currentPageId = ref<string | null>(null)
  const role = ref<string | null>(null)
  const selectedBlockId = ref<string | null>(null)
  const hoverBlockId = ref<string | null>(null)
  const consoleEntries = ref<ConsoleEntry[]>([])

  // Project global_state, exposed reactively at @/state (SPEC §4).
  const globalState = reactive<Record<string, unknown>>({})

  const currentPage = computed<PageMeta | null>(() => {
    if (!meta.value) return null
    const id = currentPageId.value
    return meta.value.pages.find((p) => p.id === id) ?? meta.value.pages[0] ?? null
  })

  const roles = computed<string[]>(() => meta.value?.roles ?? [])

  function loadMeta(next: ProjectMeta, opts: { mode?: Mode; pageId?: string; role?: string | null } = {}) {
    meta.value = next
    if (opts.mode) mode.value = opts.mode
    currentPageId.value = opts.pageId ?? next.pages[0]?.id ?? null
    role.value = opts.role ?? null
    // Hydrate global state.
    for (const k of Object.keys(globalState)) delete globalState[k]
    Object.assign(globalState, next.global_state ?? {})
  }

  function applyPatch(patch: BlockPatch): boolean {
    if (!meta.value) return false
    const block = findBlock(meta.value, patch.blockId)
    if (!block) return false
    setPath(block as unknown as Record<string, unknown>, patch.path, patch.value)
    // Re-tag the shallowRef so dependents relying on identity refresh too.
    meta.value = { ...meta.value }
    return true
  }

  function setMode(next: Mode) {
    mode.value = next
  }
  function setRole(next: string | null) {
    role.value = next
  }
  function navigateTo(pageId: string) {
    currentPageId.value = pageId
  }
  function selectBlock(id: string | null) {
    selectedBlockId.value = id
  }
  function hoverBlock(id: string | null) {
    hoverBlockId.value = id
  }
  function pushConsole(entry: ConsoleEntry) {
    consoleEntries.value = [...consoleEntries.value.slice(-199), entry]
  }
  function clearConsole() {
    consoleEntries.value = []
  }

  return {
    meta,
    mode,
    currentPageId,
    role,
    selectedBlockId,
    hoverBlockId,
    consoleEntries,
    globalState,
    currentPage,
    roles,
    loadMeta,
    applyPatch,
    setMode,
    setRole,
    navigateTo,
    selectBlock,
    hoverBlock,
    pushConsole,
    clearConsole,
  }
})

/** Reactive handle to the project's global_state, for `@/state` user imports. */
export function useGlobalState(): Record<string, unknown> {
  return useSandboxStore().globalState
}
