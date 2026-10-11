/**
 * Sample records for the data-bound list / detail blocks when no rows are injected (the block has
 * no `query`, or Preview has not loaded data). Values are laid out by column position so any
 * column keys the Studio picked get plausible content.
 */
import type { Row } from './blockUtils'

const GRID: string[][] = [
  ['WO-1042 · Boiler check', 'Scheduled', 'Sam Ortiz', '2026-10-14', 'Northwind Clinics'],
  ['WO-1047 · Roof leak', 'In progress', 'Priya Nair', '2026-10-15', 'Contoso Offices'],
  ['WO-1051 · HVAC filter swap', 'Waiting on parts', 'Leo Brandt', '2026-10-17', 'Fabrikam Retail'],
  ['WO-1053 · Fire alarm test', 'Done', 'Ana Costa', '2026-10-09', 'Tailspin Storage'],
]
const DEFAULT_KEYS = ['title', 'status', 'assignee', 'due', 'customer']

export function sampleKeys(columns: string[]): string[] {
  return columns.length ? columns : DEFAULT_KEYS.slice(0, 4)
}

/** Sample rows keyed by the given columns (or default keys). */
export function sampleRows(columns: string[], count = GRID.length): Row[] {
  const keys = sampleKeys(columns)
  return GRID.slice(0, count).map((vals) =>
    Object.fromEntries(keys.map((k, j) => [k, vals[j % vals.length]])),
  )
}
