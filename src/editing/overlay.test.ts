import { describe, expect, it, vi } from 'vitest'
import type { Block } from '@/contracts'
import type { StudioToSandboxMessage } from '@/protocol'
import { attachEditOverlay } from './overlay'
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
