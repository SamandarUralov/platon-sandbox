/**
 * Drop-target resolution (SPEC §5, Interface edit overlay).
 *
 * During a drag, the Studio asks "where would this land?". The Sandbox owns
 * the nested block tree, so resolution happens here: given the pointer and the
 * measured rects, find the deepest *container* under the pointer and the
 * insertion index among its direct children. The result maps directly to the
 * `drop-target` message `{ parentId, index, rect }`.
 *
 * `resolveDropTarget()` is pure (tree + measured rects + point in, target out)
 * and fully unit-testable; the composable supplies live DOM rects.
 */

import type { Block } from '@/contracts'
import {
  type Orientation,
  type Point,
  type Rect,
  midAlong,
  pointAlong,
  rectContains,
} from './geometry'
import type { RectMap } from './hitTest'
import { DEFAULT_CONTAINER_COMPONENTS, flattenTree, isContainerBlock } from './tree'

/** A resolved drop location (mirrors the `drop-target` message payload). */
export interface DropTarget {
  /** Container the block would be inserted into; null = page root. */
  parentId: string | null
  /** Insertion index among that container's direct children. */
  index: number
  /** Indicator rect for the insertion line/gap, when it can be computed. */
  rect?: Rect
}

export interface ResolveDropOptions {
  /** Rect of the page-root canvas; used when the pointer is over no block. */
  rootRect?: Rect
  /** Override container detection (default: `isContainerBlock`). */
  isContainer?: (block: Block) => boolean
  /** Components counted as containers when they have no `children` yet. */
  containerComponents?: ReadonlySet<string>
  /** Orientation per container (default: vertical stacking). */
  orientationOf?: (parentId: string | null) => Orientation
}

interface ContainerCandidate {
  id: string | null
  rect: Rect | null
  depth: number
}

/**
 * Resolve where a dragged block would drop.
 *
 * Returns null only when there is genuinely nothing to target (no root rect
 * and no block under the pointer). Otherwise it always yields a container +
 * index — defaulting to the page root so a drag over empty canvas still lands.
 */
export function resolveDropTarget(
  rootBlocks: Block[],
  rects: RectMap,
  point: Point,
  opts: ResolveDropOptions = {},
): DropTarget | null {
  const containers = opts.containerComponents ?? DEFAULT_CONTAINER_COMPONENTS
  const isContainer = opts.isContainer ?? ((b: Block) => isContainerBlock(b, containers))
  const orientationOf = opts.orientationOf ?? (() => 'vertical' as Orientation)

  const nodes = flattenTree(rootBlocks)

  // Root container is always a candidate (depth -1 so any block beats it).
  let best: ContainerCandidate = { id: null, rect: opts.rootRect ?? null, depth: -1 }
  const rootContains = opts.rootRect ? rectContains(opts.rootRect, point) : true

  for (const node of nodes) {
    if (!isContainer(node.block)) continue
    const rect = rects[node.block.id]
    if (!rect || !rectContains(rect, point)) continue
    if (node.depth >= best.depth) {
      best = { id: node.block.id, rect, depth: node.depth }
    }
  }

  // Pointer outside the root and over no block ⇒ no target.
  if (best.id === null && !rootContains) return null

  const children = best.id === null ? rootBlocks : childrenById(nodes, best.id)
  const orientation = orientationOf(best.id)
  const index = insertionIndex(children, rects, point, orientation)
  const rect = indicatorRect(children, rects, index, best.rect, orientation)

  return rect ? { parentId: best.id, index, rect } : { parentId: best.id, index }
}

function childrenById(
  nodes: ReturnType<typeof flattenTree>,
  parentId: string,
): Block[] {
  for (const node of nodes) {
    if (node.block.id === parentId) return node.block.children ?? []
  }
  return []
}

/**
 * Insertion index among ordered children: the count of children whose midpoint
 * precedes the pointer along the stacking axis. Children with no measured rect
 * are skipped but still occupy their ordinal slot.
 */
function insertionIndex(
  children: Block[],
  rects: RectMap,
  point: Point,
  orientation: Orientation,
): number {
  const p = pointAlong(point, orientation)
  for (let i = 0; i < children.length; i++) {
    const rect = rects[children[i].id]
    if (!rect) continue
    if (p < midAlong(rect, orientation)) return i
  }
  return children.length
}

/** Thin indicator rect at the insertion seam (best-effort; optional). */
function indicatorRect(
  children: Block[],
  rects: RectMap,
  index: number,
  containerRect: Rect | null,
  orientation: Orientation,
): Rect | undefined {
  const THICK = 2
  const before = index > 0 ? rects[children[index - 1]?.id] : undefined
  const after = index < children.length ? rects[children[index]?.id] : undefined

  if (orientation === 'vertical') {
    if (after) {
      const x = containerRect?.x ?? after.x
      const width = containerRect?.width ?? after.width
      return { x, y: after.y - THICK / 2, width, height: THICK }
    }
    if (before) {
      const x = containerRect?.x ?? before.x
      const width = containerRect?.width ?? before.width
      return { x, y: before.y + before.height - THICK / 2, width, height: THICK }
    }
  } else {
    if (after) {
      const y = containerRect?.y ?? after.y
      const height = containerRect?.height ?? after.height
      return { x: after.x - THICK / 2, y, width: THICK, height }
    }
    if (before) {
      const y = containerRect?.y ?? before.y
      const height = containerRect?.height ?? before.height
      return { x: before.x + before.width - THICK / 2, y, width: THICK, height }
    }
  }
  // Empty container: hint at its top-left if we know its rect.
  if (containerRect) {
    return orientation === 'vertical'
      ? { x: containerRect.x, y: containerRect.y, width: containerRect.width, height: THICK }
      : { x: containerRect.x, y: containerRect.y, width: THICK, height: containerRect.height }
  }
  return undefined
}
