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
import { onBeforeUnmount, onMounted, provide } from 'vue'
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
  dropTarget: ({ parentId, index, rect }) =>
    bridge.send({ type: 'drop-target', parentId, index, rect }),
  clearDropTarget: () => bridge.send({ type: 'drop-clear' }),
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
        store.loadMeta(meta, { mode: msg.mode, pageId: msg.pageId, role: msg.role ?? null })
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
  if (!bridge.embedded) {
    store.loadMeta(parseProjectMeta(fieldOpsMeta), { mode: 'interface' })
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  disposeOverlay?.()
  bridge.stop()
})
</script>

<template>
  <SandboxRoot />
</template>
