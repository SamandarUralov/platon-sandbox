/**
 * Hit-testing (SPEC §5, Interface edit overlay).
 *
 * Given the block rects measured from the canvas and a pointer position,
 * resolve the single block the pointer is "on": the deepest block whose rect
 * contains the point, with smaller area winning ties. This drives the
 * `block-hover` / `block-selected` messages the Sandbox sends to the Studio.
 *
 * The core `hitTest()` is pure and DOM-free (takes measured entries) so it is
 * fully unit-testable; `collectBlockRects()` / `hitTestAt()` adapt it to the
 * live DOM for the composable.
 */

import type { Block } from '@/contracts'
import { type Point, type Rect, rectArea, rectContains } from './geometry'
import { flattenTree } from './tree'

/** A measured block: its id, viewport rect, and tree depth. */
export interface HitEntry {
  id: string
  rect: Rect
  depth: number
}

/** Map of blockId → measured viewport rect. */
export type RectMap = Record<string, Rect>

/**
 * Deepest block under `point`. Returns its id, or null if no entry contains
 * the point. Deeper (more nested) wins; equal depth is broken by smaller area
 * so the result is independent of entry order.
 */
export function hitTest(entries: HitEntry[], point: Point): string | null {
  let best: HitEntry | null = null
  for (const entry of entries) {
    if (!rectContains(entry.rect, point)) continue
    if (
      best === null ||
      entry.depth > best.depth ||
      (entry.depth === best.depth && rectArea(entry.rect) < rectArea(best.rect))
    ) {
      best = entry
    }
  }
  return best ? best.id : null
}

/** Build hit entries by joining the authoritative tree with measured rects. */
export function collectHitEntries(rootBlocks: Block[], rects: RectMap): HitEntry[] {
  const entries: HitEntry[] = []
  for (const node of flattenTree(rootBlocks)) {
    const rect = rects[node.block.id]
    if (rect) entries.push({ id: node.block.id, rect, depth: node.depth })
  }
  return entries
}

/** Convenience: hit-test a point against a tree + measured rects. */
export function hitTestAt(rootBlocks: Block[], rects: RectMap, point: Point): string | null {
  return hitTest(collectHitEntries(rootBlocks, rects), point)
}

/**
 * Measure every `[data-block-id]` element under `root` into a RectMap using
 * `getBoundingClientRect()`. DOM-dependent; used only by the composable.
 */
export function collectBlockRects(root: ParentNode = document): RectMap {
  const out: RectMap = {}
  const nodes = root.querySelectorAll<HTMLElement>('[data-block-id]')
  nodes.forEach((el) => {
    const id = el.getAttribute('data-block-id')
    if (!id) return
    const r = el.getBoundingClientRect()
    out[id] = { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  return out
}
