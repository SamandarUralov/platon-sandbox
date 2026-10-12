/**
 * Block `layout` → style on the block's wrapper. A `row` with `columns` (see RowContainer) sizes
 * each child from `--pl-col-span`; a child marked `auto` (no width of its own) may also grow by
 * `--pl-col-grow` into room a hidden neighbour leaves. Outside such a row the variables do nothing.
 */
import type { BlockLayout } from '@/contracts'

const GRID_COLUMNS = 12

export function layoutStyle(layout: BlockLayout | undefined): Record<string, string> | undefined {
  const span = Number(layout?.colSpan)
  if (layout?.colSpan === undefined || !Number.isFinite(span)) return undefined
  const n = Math.min(GRID_COLUMNS, Math.max(1, Math.round(span)))
  return { '--pl-col-span': String(n), '--pl-col-grow': layout.auto === true ? String(n) : '0' }
}

/** Row width below which a 12-column row stacks its children (keep in sync with RowContainer's CSS). */
export const GRID_STACK_BELOW = 560

/** The 12-column row a block wrapper sits in: its width, and whether it has stacked its children. */
export function gridRowOf(el: Element): { width: number; stacked: boolean } | undefined {
  const row = el.parentElement
  if (!row?.classList.contains('pl-row--grid')) return undefined
  const width = row.getBoundingClientRect().width
  return { width, stacked: width < GRID_STACK_BELOW }
}
