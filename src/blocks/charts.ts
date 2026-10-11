/**
 * Chart math shared by the chart blocks (bar, line, area, donut, pie, hbar, stacked, funnel,
 * scatter, gauge). Ported from Studio's renderer (`packages/renderer/src/charts.ts`), minus the
 * definition-aware formatting: the Sandbox only has rows, so a group label is the raw value.
 *
 * Data source: rows the renderer injected from the block's `query` (mock store in Interface),
 * counted per `groupBy` value. Without rows or `groupBy` each chart shows sample data so it never
 * renders empty (the same rule Studio's own canvas follows).
 */
import { cellText, type Row } from './blockUtils'

export interface Datum {
  label: string
  value: number
}

export interface Series {
  name: string
  values: number[]
}

export interface SeriesData {
  labels: string[]
  series: Series[]
}

export interface Point {
  x: number
  y: number
  label?: string
}

export const SAMPLE_BAR: Datum[] = [
  { label: 'May', value: 42 },
  { label: 'Jun', value: 51 },
  { label: 'Jul', value: 47 },
  { label: 'Aug', value: 63 },
  { label: 'Sep', value: 58 },
  { label: 'Oct', value: 71 },
]

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
export const SAMPLE_LINE: Datum[] = [5.2, 4.8, 4.9, 4.1, 3.8, 3.9, 3.4, 3.1, 3.3, 2.9, 2.7, 2.6].map(
  (value, i) => ({ label: MONTHS[i]!, value }),
)

export const SAMPLE_DONUT: Datum[] = [
  { label: 'Scheduled', value: 14 },
  { label: 'In progress', value: 9 },
  { label: 'Waiting on parts', value: 5 },
  { label: 'Done', value: 22 },
]

export const SAMPLE_FUNNEL: Datum[] = [
  { label: 'Requested', value: 120 },
  { label: 'Scheduled', value: 96 },
  { label: 'In progress', value: 71 },
  { label: 'Done', value: 58 },
]

export const SAMPLE_STACKED: SeriesData = {
  labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  series: [
    { name: 'Repair', values: [18, 22, 19, 27, 24, 30] },
    { name: 'Install', values: [12, 15, 14, 19, 17, 21] },
    { name: 'Inspect', values: [8, 9, 11, 10, 12, 14] },
  ],
}

export const SAMPLE_SCATTER: Point[] = [
  [1.2, 38],
  [2.5, 52],
  [3.1, 47],
  [3.8, 63],
  [4.4, 58],
  [5.0, 71],
  [5.6, 66],
  [6.3, 80],
  [7.1, 77],
  [2.0, 41],
  [4.9, 60],
  [6.8, 84],
].map(([x, y]) => ({ x: x!, y: y! }))

/** Fixed categorical palette; the first series is the app accent. Overridable via `--pl-series-N`. */
const SERIES_FALLBACK = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

export function seriesColor(i: number): string {
  const k = Math.min(Math.max(0, i), SERIES_FALLBACK.length - 1)
  if (k === 0) return `var(--pl-series-1, var(--pl-accent, ${SERIES_FALLBACK[0]}))`
  return `var(--pl-series-${k + 1}, ${SERIES_FALLBACK[k]})`
}

const groupLabel = (v: unknown) => (v === null || v === undefined || v === '' ? '(empty)' : cellText(v))

/** Record counts per `groupBy` value, in first-seen order. Null when there is nothing to group. */
export function groupCounts(rows: Row[] | undefined, groupBy: string | undefined): Datum[] | null {
  if (!Array.isArray(rows) || !groupBy) return null
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = groupLabel(r?.[groupBy])
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].map(([label, value]) => ({ label, value }))
}

/** Counts per `groupBy` value split by `seriesBy` value (stacked bars). */
export function groupCounts2(
  rows: Row[] | undefined,
  groupBy: string | undefined,
  seriesBy: string | undefined,
): SeriesData | null {
  if (!Array.isArray(rows) || !groupBy || !seriesBy) return null
  const labels: string[] = []
  const names: string[] = []
  const m = new Map<string, number>()
  for (const r of rows) {
    const g = groupLabel(r?.[groupBy])
    const s = groupLabel(r?.[seriesBy])
    if (!labels.includes(g)) labels.push(g)
    if (!names.includes(s)) names.push(s)
    const key = `${g}\u0000${s}`
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return {
    labels,
    series: names.slice(0, 8).map((name) => ({
      name,
      values: labels.map((g) => m.get(`${g}\u0000${name}`) ?? 0),
    })),
  }
}

/** (x, y) pairs from two numeric fields; rows with non-numbers are skipped. */
export function numericPoints(rows: Row[] | undefined, x?: string, y?: string): Point[] | null {
  if (!Array.isArray(rows) || !x || !y) return null
  const pts = rows
    .map((r) => ({ x: Number(r?.[x]), y: Number(r?.[y]), label: cellText(r?.id ?? '') }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  return pts.length ? pts : null
}

/** Rounded max for axis ticks (e.g. 71 → 80). */
export function niceMax(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / p) * p
}

/** Five axis ticks from max to 0. */
export function ticks(max: number): number[] {
  return [4, 3, 2, 1, 0].map((i) => Math.round((max / 4) * i * 10) / 10)
}

export function linePoints(data: Datum[], w: number, h: number, max: number): [number, number][] {
  const n = Math.max(1, data.length - 1)
  return data.map((d, i) => [(i / n) * w, h - (d.value / (max || 1)) * h])
}

/** SVG arc path from angle a0 to a1 (radians, 0 = 12 o'clock). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((v) => v.toFixed(2)).join(' ')
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1 - 0.0001)}`
}

/** Filled pie wedge from angle a0 to a1 (radians, 0 = 12 o'clock). */
export function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((v) => v.toFixed(2)).join(' ')
  return `M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`
}

/** Keep the biggest `max - 1` categories and fold the rest into "Other". */
export function foldOther(data: Datum[], max = 8): Datum[] {
  if (data.length <= max) return data
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const rest = sorted.slice(max - 1).reduce((a, d) => a + d.value, 0)
  return [...sorted.slice(0, max - 1), { label: 'Other', value: rest }]
}

/** Grouped counts from rows, or the given sample when there is nothing to group. */
export function chartData(rows: Row[] | undefined, groupBy: unknown, sample: Datum[]): Datum[] {
  const real = groupCounts(rows, typeof groupBy === 'string' ? groupBy : undefined)
  return real?.length ? real : sample
}
