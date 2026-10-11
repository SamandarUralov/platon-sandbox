<script setup lang="ts">
/**
 * Sandbox entry component (SPEC §1).
 *
 * - Boots the postMessage bridge and provides the host to the renderer tree.
 * - Handles inbound Studio messages (init/patch/set-mode/set-role/navigate/select).
 * - Mirrors errors + console to the Studio console panel (SPEC §9).
 * - Standalone (no Studio parent, e.g. `ao preview`): loads the FieldOps demo
 *   in Interface mode so the runtime is demonstrable on its own (SPEC §12).
 */
import { nextTick, onBeforeUnmount, onMounted, provide, watch } from 'vue'
import { parseProjectMeta } from '@/contracts'
import { SandboxBridge, type StudioToSandboxMessage } from '@/protocol'
import { HostKey, type SandboxHost } from '@/engine'
import { capabilitiesFor } from '@/engine'
import { attachEditOverlay } from '@/editing'
import { useSandboxStore } from '@/state'
import SandboxRoot from '@/app/SandboxRoot.vue'
import { fieldOpsMeta } from '@/demo/fieldops'

const store = useSandboxStore()
const bridge = new SandboxBridge()

const host: SandboxHost = {
  selectBlock: (id) => bridge.send({ type: 'block-selected', blockId: id }),
  hoverBlock: (id) => bridge.send({ type: 'block-hover', blockId: id }),
  dropTarget: ({ parentId, index, rect, parentRect }) =>
    bridge.send({ type: 'drop-target', parentId, index, rect, parentRect }),
  clearDropTarget: () => bridge.send({ type: 'drop-clear' }),
  drop: ({ parentId, index, source }) => bridge.send({ type: 'drop', parentId, index, source }),
  reportError: ({ message, stack, blockId, pageId }) => {
    store.pushConsole({ level: 'error', args: [message], ts: Date.now(), source: blockId ?? pageId })
    bridge.send({
      type: 'error',
      message,
      stack,
      source: blockId || pageId ? { blockId, pageId } : undefined,
    })
  },
  reportConsole: (level, args) => {
    store.pushConsole({ level, args, ts: Date.now() })
    bridge.send({ type: 'console', level, args })
  },
  bridge,
}
provide(HostKey, host)

function handleStudioMessage(msg: StudioToSandboxMessage) {
  switch (msg.type) {
    case 'init': {
      try {
        const meta = parseProjectMeta(msg.meta)
        store.loadMeta(meta, {
          mode: msg.mode,
          pageId: msg.pageId,
          role: msg.role ?? null,
          data: msg.data,
          fit: msg.fit,
        })
      } catch (err) {
        host.reportError({ message: `invalid init meta: ${String(err)}` })
      }
      break
    }
    case 'patch':
      if (!store.applyPatch(msg.patch)) {
        host.reportConsole('warn', ['[patch] unknown block', msg.patch.blockId])
      }
      break
    case 'set-mode':
      store.setMode(msg.mode)
      break
    case 'set-role':
      store.setRole(msg.role)
      break
    case 'navigate':
      store.navigateTo(msg.pageId)
      break
    case 'select-block':
      store.selectBlock(msg.blockId)
      break
  }
}

let unsubscribe: (() => void) | null = null
let disposeOverlay: (() => void) | null = null
let sizeObserver: ResizeObserver | null = null

// Tell the Studio about navigation / role changes made inside the Sandbox (menu,
// `navigate` action, in-sandbox role switcher). A Studio command that sets the
// same value produces no change, so this cannot loop.
watch(
  () => store.currentPage?.id,
  (pageId) => pageId && bridge.send({ type: 'page-changed', pageId }),
)
watch(
  () => store.role,
  (role) => bridge.send({ type: 'role-changed', role }),
)

// In fit mode the Studio sizes the iframe to the content height we report.
let lastHeight = 0
function reportSize() {
  const shell = document.querySelector<HTMLElement>('[data-pl-shell]')
  const height = Math.ceil(shell?.getBoundingClientRect().height ?? 0)
  if (!height || height === lastHeight) return
  lastHeight = height
  bridge.send({ type: 'content-size', height })
}
watch(
  () => [store.fit, store.meta !== null] as const,
  async ([fit]) => {
    sizeObserver?.disconnect()
    sizeObserver = null
    lastHeight = 0
    if (!fit || typeof ResizeObserver === 'undefined') return
    await nextTick()
    const shell = document.querySelector<HTMLElement>('[data-pl-shell]')
    if (!shell) return
    sizeObserver = new ResizeObserver(reportSize)
    sizeObserver.observe(shell)
  },
)

function measureCanvasRoot() {
  const el = document.querySelector<HTMLElement>('[data-pl-canvas]')
  if (!el) return undefined
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}

onMounted(() => {
  bridge.start()
  unsubscribe = bridge.onStudioMessage(handleStudioMessage)
  bridge.send({ type: 'ready', protocolVersion: 1 })

  // Edit overlay: drag → drop-target resolution (Interface only, SPEC §5).
  disposeOverlay = attachEditOverlay({
    host,
    getTree: () => store.currentPage?.blocks ?? [],
    isOverlayActive: () => capabilitiesFor(store.mode).editOverlay,
    getRootRect: measureCanvasRoot,
    win: window,
  })

  // Standalone demo fallback (SPEC §12): no Studio parent ⇒ seed FieldOps.
  // `?mode=preview[&role=<role>]` boots the Preview shell directly so the role
  // switcher / live filter / CRUD matrix are demonstrable on their own.
  if (!bridge.embedded) {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode') === 'preview' ? 'preview' : 'interface'
    const role = params.get('role')
    store.loadMeta(parseProjectMeta(fieldOpsMeta), { mode, role })
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  disposeOverlay?.()
  sizeObserver?.disconnect()
  bridge.stop()
})
</script>

<template>
  <SandboxRoot />
</template>
