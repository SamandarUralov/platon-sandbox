/**
 * Shared prop helpers for the Studio "UI kit" blocks (badge, alert, list, charts, tabs, ...).
 *
 * Studio sends each block's definition `props` as they are (see Studio's sandbox adapter), so
 * list-ish props may be a `string[]` or a comma/newline separated string, numbers may arrive as
 * strings and `columns` may be field keys or `{ key }` objects (the renderer injects the latter
 * from the data model). These helpers normalise all of that so blocks never crash on a shape.
 */
import {
  Comment,
  computed,
  defineComponent,
  Fragment,
  inject,
  Text,
  type ComputedRef,
  type PropType,
  type VNode,
} from 'vue'
import { CapabilitiesKey } from '@/engine/mode'

export type Row = Record<string, unknown>

/** String value or a default (numbers/booleans are stringified). */
export function str(v: unknown, d = ''): string {
  if (typeof v === 'string') return v
  if (v === undefined || v === null) return d
  return String(v)
}

/** Finite number or a default. */
export function num(v: unknown, d: number): number {
  if (v === '' || v === null || v === undefined) return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/** `string[]` or a comma / newline separated string → trimmed, non-empty items. */
export function listProp(v: unknown): string[] {
  const raw = Array.isArray(v) ? v.map((x) => str(x)) : typeof v === 'string' ? v.split(/[\n,]/) : []
  return raw.map((s) => s.trim()).filter(Boolean)
}

/** Column field keys from `string[]`, `{ key }[]` or a list string. */
export function columnKeys(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((c) => (c && typeof c === 'object' ? str((c as { key?: unknown }).key) : str(c)))
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return listProp(v)
}

/** `created_at` → "Created at". */
export function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return s ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : key
}

/** Display text for one cell value. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.map(cellText).join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** One of `allowed`, or the default. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : d
}

export const KIT_VARIANTS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const
export type KitVariant = (typeof KIT_VARIANTS)[number]

/**
 * True in Interface (edit) mode, where containers stack every panel so each cell stays visible
 * and droppable. Outside a provided engine scope (isolated component tests) it is false.
 */
export function useEditMode(): ComputedRef<boolean> {
  const caps = inject(CapabilitiesKey, null)
  return computed(() => caps?.value.editOverlay ?? false)
}

/**
 * Top-level vnodes of a container's default slot, one per panel. The renderer fills the slot with
 * a `v-for` fragment of child blocks (plus a "Drop here" zone or a `v-if` comment), so fragments
 * are flattened and comments / whitespace text dropped.
 */
export function slotNodes(nodes: VNode[] | undefined): VNode[] {
  const out: VNode[] = []
  for (const n of nodes ?? []) {
    if (n.type === Comment) continue
    if (n.type === Text && !String(n.children ?? '').trim()) continue
    if (n.type === Fragment) {
      out.push(...slotNodes(Array.isArray(n.children) ? (n.children as VNode[]) : []))
      continue
    }
    out.push(n)
  }
  return out
}

/** Renders one vnode taken from a slot (lets a container place each child where it wants). */
export const RenderNode = defineComponent({
  name: 'RenderNode',
  props: { node: { type: Object as PropType<VNode>, required: true } },
  setup(props) {
    return () => props.node
  },
})
