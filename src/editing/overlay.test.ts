import { describe, expect, it, vi } from 'vitest'
import type { Block } from '@/contracts'
import type { StudioToSandboxMessage } from '@/protocol'
import { attachEditOverlay, BLOCK_DRAG_TYPE } from './overlay'
import type { RectMap } from './hitTest'

const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

const tree: Block[] = [
  { id: 'A', component: 'page_header' },
  {
    id: 'SECTION',
    component: 'section',
    children: [
      { id: 'S1', component: 'data_table' },
      { id: 'S2', component: 'data_table' },
    ],
  },
]
const rects: RectMap = {
  A: r(0, 0, 200, 50),
  SECTION: r(0, 50, 200, 120),
  S1: r(10, 60, 180, 40),
  S2: r(10, 110, 180, 40),
}

/** Minimal fake bridge that lets a test emit Studio → Sandbox messages. */
function fakeBridge() {
  let handler: ((m: StudioToSandboxMessage) => void) | null = null
  return {
    bridge: {
      onStudioMessage(h: (m: StudioToSandboxMessage) => void) {
        handler = h
        return () => {
          handler = null
        }
      },
    },
    emit(m: StudioToSandboxMessage) {
      handler?.(m)
    },
    get subscribed() {
      return handler !== null
    },
  }
}

function makeHost() {
  const fb = fakeBridge()
  return {
    dropTarget: vi.fn(),
    clearDropTarget: vi.fn(),
    drop: vi.fn(),
    bridge: fb.bridge as never,
    _fb: fb,
  }
}

describe('attachEditOverlay — Studio-forwarded drag', () => {
  it('resolves a drag-over into a drop-target and reports it', () => {
    const host = makeHost()
    const dispose = attachEditOverlay({
      host,
      getTree: () => tree,
      isOverlayActive: () => true,
      collectRects: () => rects,
      win: null, // isolate the Studio path (no native listeners)
    })

    host._fb.emit({ type: 'drag-over', point: { x: 100, y: 105 } })

    expect(host.dropTarget).toHaveBeenCalledTimes(1)
    expect(host.dropTarget).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'SECTION', index: 1 }),
    )
    expect(host.clearDropTarget).not.toHaveBeenCalled()
    dispose()
    expect(host._fb.subscribed).toBe(false)
  })

  it('clears on drag-end', () => {
    const host = makeHost()
    attachEditOverlay({
      host,
      getTree: () => tree,
      isOverlayActive: () => true,
      collectRects: () => rects,
      win: null,
    })

    host._fb.emit({ type: 'drag-end' })
    expect(host.clearDropTarget).toHaveBeenCalledTimes(1)
  })

  it('is inert when the overlay is inactive (Preview mode)', () => {
    const host = makeHost()
    attachEditOverlay({
      host,
      getTree: () => tree,
      isOverlayActive: () => false,
      collectRects: () => rects,
      win: null,
    })

    host._fb.emit({ type: 'drag-over', point: { x: 100, y: 105 } })
    host._fb.emit({ type: 'drag-end' })
    expect(host.dropTarget).not.toHaveBeenCalled()
    expect(host.clearDropTarget).not.toHaveBeenCalled()
  })
})

/** jsdom has no DragEvent: a plain cancelable event with the fields the overlay reads. */
function dragEvent(type: string, x: number, y: number, data: Record<string, string> = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(ev, { clientX: x, clientY: y, dataTransfer: { getData: (k: string) => data[k] ?? '' } })
  return ev
}

describe('attachEditOverlay — native drop', () => {
  it('reports where a drop landed, with the dragged block id', () => {
    const host = makeHost()
    const dispose = attachEditOverlay({
      host,
      getTree: () => tree,
      isOverlayActive: () => true,
      collectRects: () => rects,
      win: window,
    })

    const ev = dragEvent('drop', 100, 105, { [BLOCK_DRAG_TYPE]: 'A' })
    document.dispatchEvent(ev)

    expect(ev.defaultPrevented).toBe(true)
    expect(host.drop).toHaveBeenCalledWith({ parentId: 'SECTION', index: 1, source: { blockId: 'A' } })
    expect(host.clearDropTarget).toHaveBeenCalled()
    dispose()
  })

  it('stacks children of a row horizontally', () => {
    const host = makeHost()
    const row: Block[] = [
      { id: 'ROW', component: 'row', children: [{ id: 'L', component: 'text' }, { id: 'R', component: 'text' }] },
    ]
    const dispose = attachEditOverlay({
      host,
      getTree: () => row,
      isOverlayActive: () => true,
      collectRects: () => ({ ROW: r(0, 0, 400, 100), L: r(0, 0, 200, 100), R: r(200, 0, 200, 100) }),
      win: window,
    })

    // Right half of L, vertically low: horizontal stacking puts it between L and R.
    document.dispatchEvent(dragEvent('drop', 150, 90))
    expect(host.drop).toHaveBeenCalledWith({ parentId: 'ROW', index: 1, source: undefined })
    dispose()
  })

  it('stacks children of a row vertically once its grid has stacked them', () => {
    const host = makeHost()
    const row: Block[] = [
      { id: 'ROW', component: 'row', children: [{ id: 'T', component: 'text' }, { id: 'B', component: 'text' }] },
    ]
    const dispose = attachEditOverlay({
      host,
      getTree: () => row,
      isOverlayActive: () => true,
      // A narrow 12-column row: both children take the full width, one below the other.
      collectRects: () => ({ ROW: r(0, 0, 300, 216), T: r(0, 0, 300, 100), B: r(0, 116, 300, 100) }),
      win: window,
    })

    // Left part of B, lower half: below B, not between T and B.
    document.dispatchEvent(dragEvent('drop', 20, 200))
    expect(host.drop).toHaveBeenCalledWith({ parentId: 'ROW', index: 2, source: undefined })
    dispose()
  })
})

