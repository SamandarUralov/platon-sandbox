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

/**
 * Immutably set a dot/array path, cloning only the nodes along the path.
 *
 * Returns a NEW container with fresh object/array identities down to the
 * target, leaving untouched branches shared by reference. New identities are
 * what make a `shallowRef`-held meta tree re-render on patch: the renderer
 * sees a changed `block` reference and recomputes (see `applyPatch`).
 */
function setIn(container: unknown, parts: string[], value: unknown): unknown {
  if (parts.length === 0) return value
  const [head, ...rest] = parts

  if (Array.isArray(container)) {
    const idx = Number(head)
    const copy = container.slice()
    copy[idx] = setIn(copy[idx], rest, value)
    return copy
  }

  const obj: Record<string, unknown> =
    container && typeof container === 'object' ? { ...(container as Record<string, unknown>) } : {}
  obj[head] = setIn(obj[head], rest, value)
  return obj
}

/**
 * Rebuild a block tree, replacing the matching block via `apply`. Ancestors on
 * the path get new identities (structural sharing elsewhere). `changed`
 * reports whether the target was found.
 */
function rebuildBlocks(
  blocks: Block[],
  blockId: string,
  apply: (block: Block) => Block,
): { blocks: Block[]; changed: boolean } {
  let changed = false
  const next = blocks.map((b) => {
    if (b.id === blockId) {
      changed = true
      return apply(b)
    }
    if (b.children?.length) {
      const r = rebuildBlocks(b.children, blockId, apply)
      if (r.changed) {
        changed = true
        return { ...b, children: r.blocks }
      }
    }
    return b
  })
  return { blocks: changed ? next : blocks, changed }
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
    const parts = patch.path.split('.').filter(Boolean)
    if (!parts.length) return false

    const apply = (block: Block): Block =>
      setIn(block, parts, patch.value) as Block

    let found = false
    const pages = meta.value.pages.map((page) => {
      if (found) return page
      const r = rebuildBlocks(page.blocks, patch.blockId, apply)
      if (!r.changed) return page
      found = true
      return { ...page, blocks: r.blocks }
    })
    if (!found) return false

    // New identities down the path ⇒ the shallowRef meta re-renders reactively.
    meta.value = { ...meta.value, pages }
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
