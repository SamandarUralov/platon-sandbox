import { describe, expect, it } from 'vitest'
import type { Block } from '@/contracts'
import { resolveDropTarget } from './dropTarget'
import type { RectMap } from './hitTest'

const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

/**
 * Vertical layout:
 *   A        y   0– 50
 *   SECTION  y  50–170   (container, children S1/S2 stacked)
 *     S1     y  60–100
 *     S2     y 110–150
 *   C        y 170–220
 */
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
  { id: 'C', component: 'data_table' },
]

const rects: RectMap = {
  A: r(0, 0, 200, 50),
  SECTION: r(0, 50, 200, 120),
  S1: r(10, 60, 180, 40),
  S2: r(10, 110, 180, 40),
  C: r(0, 170, 200, 50),
}
const rootRect = r(0, 0, 200, 300)

describe('resolveDropTarget — nested index', () => {
  it('resolves into the deepest container and the index between its children', () => {
    // Pointer between S1 (mid 80) and S2 (mid 130), inside SECTION.
    const t = resolveDropTarget(tree, rects, { x: 100, y: 105 }, { rootRect })
    expect(t).not.toBeNull()
    expect(t!.parentId).toBe('SECTION')
    expect(t!.index).toBe(1)
  })

  it('inserts before the first child when above its midpoint', () => {
    const t = resolveDropTarget(tree, rects, { x: 100, y: 65 }, { rootRect })
    expect(t!.parentId).toBe('SECTION')
    expect(t!.index).toBe(0)
  })

  it('inserts after the last child when below its midpoint', () => {
    const t = resolveDropTarget(tree, rects, { x: 100, y: 145 }, { rootRect })
    expect(t!.parentId).toBe('SECTION')
    expect(t!.index).toBe(2)
  })
})

describe('resolveDropTarget — page root', () => {
  it('targets the root when the pointer is over no container block', () => {
    // Inside A (not a container): resolves to root, between A and SECTION.
    const t = resolveDropTarget(tree, rects, { x: 100, y: 45 }, { rootRect })
    expect(t!.parentId).toBeNull()
    expect(t!.index).toBe(1)
  })

  it('appends at the end of root when below every block', () => {
    const t = resolveDropTarget(tree, rects, { x: 100, y: 260 }, { rootRect })
    expect(t!.parentId).toBeNull()
    expect(t!.index).toBe(3)
  })

  it('returns null when the pointer is outside the root and over no block', () => {
    const t = resolveDropTarget(tree, rects, { x: 500, y: 500 }, { rootRect })
    expect(t).toBeNull()
  })

  it('treats the root as always-containing when no rootRect is given', () => {
    const t = resolveDropTarget(tree, rects, { x: 500, y: 500 })
    expect(t!.parentId).toBeNull()
  })
})

describe('resolveDropTarget — empty + horizontal containers', () => {
  it('drops at index 0 in an empty container', () => {
    const emptyTree: Block[] = [{ id: 'BOX', component: 'section', children: [] }]
    const emptyRects: RectMap = { BOX: r(0, 0, 100, 100) }
    const t = resolveDropTarget(emptyTree, emptyRects, { x: 50, y: 50 })
    expect(t!.parentId).toBe('BOX')
    expect(t!.index).toBe(0)
  })

  it('uses the horizontal axis when orientationOf says so', () => {
    const rowTree: Block[] = [
      {
        id: 'ROW',
        component: 'row',
        children: [
          { id: 'L', component: 'data_table' },
          { id: 'R', component: 'data_table' },
        ],
      },
    ]
    const rowRects: RectMap = {
      ROW: r(0, 0, 200, 60),
      L: r(0, 0, 90, 60), // mid x 45
      R: r(100, 0, 90, 60), // mid x 145
    }
    const t = resolveDropTarget(rowTree, rowRects, { x: 95, y: 30 }, {
      orientationOf: () => 'horizontal',
    })
    expect(t!.parentId).toBe('ROW')
    expect(t!.index).toBe(1)
  })

  it('picks the deepest container when containers nest', () => {
    const nested: Block[] = [
      {
        id: 'OUTER',
        component: 'section',
        children: [{ id: 'INNER', component: 'card', children: [{ id: 'X', component: 'data_table' }] }],
      },
    ]
    const nestedRects: RectMap = {
      OUTER: r(0, 0, 200, 200),
      INNER: r(20, 20, 160, 160),
      X: r(30, 30, 140, 50),
    }
    // Pointer inside INNER but below X → INNER, after X (index 1).
    const t = resolveDropTarget(nested, nestedRects, { x: 100, y: 120 })
    expect(t!.parentId).toBe('INNER')
    expect(t!.index).toBe(1)
  })
})
