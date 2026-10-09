/**
 * Component registry (SPEC §3, LOCKED) — three layers:
 *   1. Built-in semantic blocks (authored here, versioned).
 *   2. UI-kit atoms (auto-registered from @platon-rs/platon-ui-kit).
 *   3. Custom components (arrive as code in meta, compiled at runtime — §4 —
 *      and registered dynamically; the compile step is a later worker, so the
 *      foundation exposes only `registerCustom`).
 *
 * Resolution order: custom → built-in → ui-kit → FallbackUnknown. `resolve()`
 * NEVER throws; a missing key yields the Unknown placeholder (SPEC §3).
 */

import { markRaw, type Component } from 'vue'
import * as UiKit from '@platon-rs/platon-ui-kit'

import FallbackUnknown from '@/blocks/FallbackUnknown.vue'
import PageHeader from '@/blocks/PageHeader.vue'
import StatGroup from '@/blocks/StatGroup.vue'
import DataTable from '@/blocks/DataTable.vue'

// Palette blocks (SPEC §3): semantic blocks + ui-kit atom wrappers.
import Text from '@/blocks/Text.vue'
import ImageBlock from '@/blocks/ImageBlock.vue'
import ButtonBlock from '@/blocks/ButtonBlock.vue'
import Numbers from '@/blocks/Numbers.vue'
import TableBlock from '@/blocks/TableBlock.vue'
import FormBlock from '@/blocks/FormBlock.vue'
import Pagination from '@/blocks/Pagination.vue'
import TextInput from '@/blocks/TextInput.vue'
import SelectInput from '@/blocks/SelectInput.vue'
import CheckboxInput from '@/blocks/CheckboxInput.vue'
import RadioGroup from '@/blocks/RadioGroup.vue'
import SwitchInput from '@/blocks/SwitchInput.vue'
import DatePickerInput from '@/blocks/DatePickerInput.vue'
import TextArea from '@/blocks/TextArea.vue'
import FileUploadInput from '@/blocks/FileUploadInput.vue'

// Layout containers (SPEC §8): render nested children recursively.
import RowContainer from '@/blocks/RowContainer.vue'
import ColumnContainer from '@/blocks/ColumnContainer.vue'
import CardContainer from '@/blocks/CardContainer.vue'

export type RegistryLayer = 'builtin' | 'ui-kit' | 'custom'

export interface RegistryEntry {
  component: Component
  layer: RegistryLayer
}

/** Built-in semantic blocks (SPEC §3 reference set + palette). */
const BUILTINS: Record<string, Component> = {
  // Reference set (foundation).
  page_header: PageHeader,
  stat_group: StatGroup,
  data_table: DataTable,

  // Display / content blocks.
  text: Text,
  image: ImageBlock,
  button: ButtonBlock,
  numbers: Numbers,
  table: TableBlock,
  pagination: Pagination,

  // Form controls (ui-kit atom wrappers).
  form: FormBlock,
  text_input: TextInput,
  text_area: TextArea,
  select: SelectInput,
  checkbox: CheckboxInput,
  radio_group: RadioGroup,
  switch: SwitchInput,
  date_picker: DatePickerInput,
  file_upload: FileUploadInput,

  // Layout containers (nested children, SPEC §8).
  row: RowContainer,
  column: ColumnContainer,
  card: CardContainer,
}

export interface ComponentRegistry {
  /** Resolve a component key to a component (FallbackUnknown if unknown). */
  resolve(key: string): Component
  /** True if a real (non-fallback) component is registered for `key`. */
  has(key: string): boolean
  /** Which layer a key resolves from, or null if unknown. */
  layerOf(key: string): RegistryLayer | null
  /** Register a runtime-compiled custom component (SPEC §3 layer 3). */
  registerCustom(key: string, component: Component): void
  /** The Unknown placeholder component (SPEC §3). */
  readonly fallback: Component
  /** All registered keys, for tooling. */
  keys(): string[]
}

export interface CreateRegistryOptions {
  /** Include ui-kit atoms (layer 2). Default true. */
  includeUiKit?: boolean
  /** Extra built-ins to merge/override (for tests). */
  extraBuiltins?: Record<string, Component>
}

/** Collect exported ui-kit atoms that look like Vue components. */
function collectUiKitAtoms(): Record<string, RegistryEntry> {
  const out: Record<string, RegistryEntry> = {}
  for (const [name, value] of Object.entries(UiKit as Record<string, unknown>)) {
    if (!/^[A-Z]/.test(name)) continue // components are PascalCase exports
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) continue
    out[name] = { component: markRaw(value as Component), layer: 'ui-kit' }
  }
  return out
}

export function createRegistry(opts: CreateRegistryOptions = {}): ComponentRegistry {
  const includeUiKit = opts.includeUiKit ?? true
  const entries = new Map<string, RegistryEntry>()

  // Layer 2: ui-kit atoms (lowest precedence).
  if (includeUiKit) {
    for (const [key, entry] of Object.entries(collectUiKitAtoms())) {
      entries.set(key, entry)
    }
  }

  // Layer 1: built-in semantic blocks (override ui-kit on key clash).
  const builtins = { ...BUILTINS, ...(opts.extraBuiltins ?? {}) }
  for (const [key, component] of Object.entries(builtins)) {
    entries.set(key, { component: markRaw(component), layer: 'builtin' })
  }

  const fallback = markRaw(FallbackUnknown)

  return {
    fallback,
    resolve(key) {
      return entries.get(key)?.component ?? fallback
    },
    has(key) {
      return entries.has(key)
    },
    layerOf(key) {
      return entries.get(key)?.layer ?? null
    },
    registerCustom(key, component) {
      // Layer 3: custom components take highest precedence.
      entries.set(key, { component: markRaw(component), layer: 'custom' })
    },
    keys() {
      return [...entries.keys()]
    },
  }
}
