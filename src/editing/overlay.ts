/**
 * Edit-overlay drag wiring (SPEC §5 — Interface only).
 *
 * Bridges live drag input to the pure drop-target resolver and forwards the
 * result to the Studio. Two input sources feed the same resolver:
 *   1. Studio-forwarded `drag-over` / `drag-end` messages (primary; survives
 *      the cross-origin `dataTransfer` restriction on `dragover`).
 *   2. Native HTML5 drag events inside the Sandbox document (fallback, and the
 *      path used for the standalone demo).
 *
 * The overlay is a no-op outside Interface mode — `block-hover` /
 * `block-selected` stay wired on each block (see BlockRenderer); this module
 * owns only the drag → `drop-target` / `drop-clear` flow. The core
 * `attachEditOverlay()` takes injected deps so it is unit-testable without a
 * component; `useEditOverlay()` is the Vue-component adapter.
 */

import { onBeforeUnmount, onMounted } from 'vue'
import type { Block } from '@/contracts'
import { capabilitiesFor } from '@/engine/mode'
import { useHost, type SandboxHost } from '@/engine/host'
import { useSandboxStore } from '@/state'
import type { Orientation, Point, Rect } from './geometry'
import { type RectMap, collectBlockRects } from './hitTest'
import { resolveDropTarget } from './dropTarget'
import { flattenTree } from './tree'

/** dataTransfer type carrying the id of a block dragged inside the Sandbox. */
export const BLOCK_DRAG_TYPE = 'application/x-platon-block'

/**
 * `row` containers lay children out side by side; everything else stacks. A 12-column row
 * (RowContainer with `columns`) stacks its children on narrow widths too, so a row whose first two
 * children sit one below the other is read as vertical.
 */
function orientationIn(tree: Block[], rects: RectMap): (parentId: string | null) => Orientation {
  return (parentId) => {
    if (parentId === null) return 'vertical'
    const node = flattenTree(tree).find((n) => n.block.id === parentId)
    if (node?.block.component !== 'row') return 'vertical'
    const [a, b] = (node.block.children ?? []).map((c) => rects[c.id])
    return a && b && b.y >= a.y + a.height - 1 ? 'vertical' : 'horizontal'
  }
}

export interface EditOverlayDeps {
  /** Drop-target reporting surface (typically the SandboxHost). */
  host: Pick<SandboxHost, 'dropTarget' | 'clearDropTarget' | 'drop' | 'bridge'>
  /** Current page's top-level block tree (authoritative). */
  getTree: () => Block[]
  /** Overlay only runs when this is true (Interface mode). */
  isOverlayActive: () => boolean
  /** Rect of the canvas root, used when the pointer is over no block. */
  getRootRect?: () => Rect | undefined
  /** Measure block rects (defaults to reading the live DOM). Injectable for tests. */
  collectRects?: (root?: ParentNode) => RectMap
  /** Window to listen on (defaults to the global). Injectable for tests. */
  win?: Window | null
}

/**
 * Wire drag input (Studio + native) to drop-target resolution. Returns a
 * disposer that removes every listener. Safe to call with no window (SSR):
 * native listeners are simply skipped.
 */
export function attachEditOverlay(deps: EditOverlayDeps): () => void {
  const collect = deps.collectRects ?? collectBlockRects
  const win = deps.win ?? (typeof window !== 'undefined' ? window : null)

  const locate = (point: Point) => {
    const tree = deps.getTree()
    const rects = collect()
    return resolveDropTarget(tree, rects, point, {
      rootRect: deps.getRootRect?.(),
      orientationOf: orientationIn(tree, rects),
    })
  }

  const resolve = (point: Point): void => {
    if (!deps.isOverlayActive()) return
    const target = locate(point)
    if (target) deps.host.dropTarget(target)
    else deps.host.clearDropTarget()
  }

  const clear = (): void => {
    if (!deps.isOverlayActive()) return
    deps.host.clearDropTarget()
  }

  // 1. Studio-forwarded drag messages.
  const unsubscribe =
    deps.host.bridge?.onStudioMessage((msg) => {
      if (msg.type === 'drag-over') resolve(msg.point)
      else if (msg.type === 'drag-end') clear()
    }) ?? null

  // 2. Native drag events inside the Sandbox document.
  const doc = win?.document
  const onDragOver = (ev: DragEvent): void => {
    if (!deps.isOverlayActive()) return
    // Allow dropping into the Sandbox.
    ev.preventDefault()
    resolve({ x: ev.clientX, y: ev.clientY })
  }
  const onDragEnd = (): void => clear()
  // The Studio cannot see a drop inside this (cross-origin) document, so report
  // where it landed; the Studio applies the edit and re-sends the meta.
  const onDrop = (ev: DragEvent): void => {
    if (!deps.isOverlayActive()) return
    ev.preventDefault()
    const target = locate({ x: ev.clientX, y: ev.clientY })
    deps.host.clearDropTarget()
    if (!target) return
    const blockId = ev.dataTransfer?.getData(BLOCK_DRAG_TYPE) || undefined
    deps.host.drop({ parentId: target.parentId, index: target.index, source: blockId ? { blockId } : undefined })
  }

  if (doc) {
    doc.addEventListener('dragover', onDragOver)
    doc.addEventListener('drop', onDrop)
    doc.addEventListener('dragend', onDragEnd)
  }

  return () => {
    unsubscribe?.()
    if (doc) {
      doc.removeEventListener('dragover', onDragOver)
      doc.removeEventListener('drop', onDrop)
      doc.removeEventListener('dragend', onDragEnd)
    }
  }
}

/** Measure the canvas root rect from a `[data-pl-canvas]` element, if present. */
function measureCanvasRoot(win: Window | null): Rect | undefined {
  const el = win?.document?.querySelector<HTMLElement>('[data-pl-canvas]')
  if (!el) return undefined
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}

/**
 * Vue-component adapter: starts the overlay on mount and tears it down on
 * unmount. Reads the host + store from the engine context. Overlay activity
 * tracks the live `mode` (Interface on, Preview off — SPEC §5).
 */
export function useEditOverlay(): void {
  const host = useHost()
  const store = useSandboxStore()
  let dispose: (() => void) | null = null

  onMounted(() => {
    const win = typeof window !== 'undefined' ? window : null
    dispose = attachEditOverlay({
      host,
      getTree: () => store.currentPage?.blocks ?? [],
      isOverlayActive: () => capabilitiesFor(store.mode).editOverlay,
      getRootRect: () => measureCanvasRoot(win),
      win,
    })
  })

  onBeforeUnmount(() => {
    dispose?.()
    dispose = null
  })
}
