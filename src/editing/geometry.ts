/**
 * Geometry primitives for the edit overlay (SPEC §5, Interface only).
 *
 * Pure, DOM-free helpers shared by hit-testing (which block is under the
 * pointer) and drop-target resolution (where a dragged block would land). The
 * rects are viewport-space (what `getBoundingClientRect()` returns), so the
 * same math works for native drag events and Studio-forwarded coordinates.
 */

/** A point in viewport space (e.g. `event.clientX/clientY`). */
export interface Point {
  x: number
  y: number
}

/** A viewport-space rectangle, matching `DOMRect`'s x/y/width/height. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Stacking orientation of a container's children. */
export type Orientation = 'vertical' | 'horizontal'

/** True if `point` lies within (inclusive) `rect`. */
export function rectContains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/** Area of a rect (used as a nesting tie-breaker: child ⊆ parent ⇒ smaller). */
export function rectArea(rect: Rect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height)
}

/** Center point of a rect. */
export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/** The midpoint coordinate along one axis (vertical ⇒ y, horizontal ⇒ x). */
export function midAlong(rect: Rect, orientation: Orientation): number {
  return orientation === 'vertical' ? rect.y + rect.height / 2 : rect.x + rect.width / 2
}

/** The pointer coordinate along one axis. */
export function pointAlong(point: Point, orientation: Orientation): number {
  return orientation === 'vertical' ? point.y : point.x
}
