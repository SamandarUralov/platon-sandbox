import { describe, expect, it } from 'vitest'
import type { Block } from '@/contracts'
import { type HitEntry, collectHitEntries, hitTest, hitTestAt, type RectMap } from './hitTest'

const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

describe('hitTest (pure)', () => {
  const entries: HitEntry[] = [
    { id: 'root', rect: r(0, 0, 200, 200), depth: 0 },
    { id: 'child-a', rect: r(10, 10, 80, 80), depth: 1 },
    { id: 'child-b', rect: r(100, 10, 80, 80), depth: 1 },
    { id: 'grandchild', rect: r(20, 20, 40, 40), depth: 2 },
  ]

  it('returns the deepest block containing the point', () => {
    // (30,30) is inside root, child-a, and grandchild → deepest wins.
    expect(hitTest(entries, { x: 30, y: 30 })).toBe('grandchild')
  })

  it('falls back to a shallower block when no deeper one contains the point', () => {
    // (70,70) is inside root + child-a, but not the grandchild.
    expect(hitTest(entries, { x: 70, y: 70 })).toBe('child-a')
    // (150,50) is inside root + child-b only.
    expect(hitTest(entries, { x: 150, y: 50 })).toBe('child-b')
  })

  it('returns the container when the point misses all children', () => {
    expect(hitTest(entries, { x: 95, y: 150 })).toBe('root')
  })

  it('returns null when the point is outside every rect', () => {
    expect(hitTest(entries, { x: 500, y: 500 })).toBeNull()
  })

  it('is order-independent and breaks equal-depth ties by smaller area', () => {
    const overlapping: HitEntry[] = [
      { id: 'big', rect: r(0, 0, 100, 100), depth: 1 },
      { id: 'small', rect: r(0, 0, 40, 40), depth: 1 },
    ]
    const point = { x: 10, y: 10 }
    expect(hitTest(overlapping, point)).toBe('small')
    expect(hitTest([...overlapping].reverse(), point)).toBe('small')
  })
})

describe('collectHitEntries + hitTestAt (tree-driven)', () => {
  const tree: Block[] = [
    { id: 'header', component: 'page_header' },
    {
      id: 'section',
      component: 'section',
      children: [
        { id: 'stat', component: 'stat_group' },
        { id: 'table', component: 'data_table' },
      ],
    },
  ]
  const rects: RectMap = {
    header: r(0, 0, 300, 60),
    section: r(0, 60, 300, 240),
    stat: r(10, 70, 280, 100),
    table: r(10, 180, 280, 110),
  }

  it('derives depth from the tree, not rect size', () => {
    const entries = collectHitEntries(tree, rects)
    expect(entries.find((e) => e.id === 'section')?.depth).toBe(0)
    expect(entries.find((e) => e.id === 'stat')?.depth).toBe(1)
  })

  it('resolves the correct nested block id at a point', () => {
    expect(hitTestAt(tree, rects, { x: 150, y: 30 })).toBe('header')
    expect(hitTestAt(tree, rects, { x: 150, y: 120 })).toBe('stat')
    expect(hitTestAt(tree, rects, { x: 150, y: 230 })).toBe('table')
    // Inside the section band but between its children → the section itself.
    expect(hitTestAt(tree, rects, { x: 150, y: 175 })).toBe('section')
  })

  it('ignores tree nodes with no measured rect', () => {
    const partial: RectMap = { header: r(0, 0, 300, 60) }
    expect(collectHitEntries(tree, partial)).toHaveLength(1)
    expect(hitTestAt(tree, partial, { x: 150, y: 120 })).toBeNull()
  })
})
