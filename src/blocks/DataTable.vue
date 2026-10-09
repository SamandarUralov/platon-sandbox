<script setup lang="ts">
/**
 * Built-in block: `data_table` (SPEC §3 reference set).
 *
 * Built from ui-kit Table primitives. `rows` are injected by the renderer after
 * it resolves the block's `query` (mock store in Interface; real backend later in
 * Preview). `columns` may be given explicitly or derived from the first row.
 */
import { computed } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platon-rs/platon-ui-kit'

interface ColumnDef {
  key: string
  label?: string
}

const props = defineProps<{
  title?: string
  columns?: (ColumnDef | string)[]
  rows?: Record<string, unknown>[]
  emptyMessage?: string
}>()

const rowList = computed<Record<string, unknown>[]>(() => props.rows ?? [])

const resolvedColumns = computed<ColumnDef[]>(() => {
  if (props.columns?.length) {
    return props.columns.map((c) => (typeof c === 'string' ? { key: c } : c))
  }
  const first = rowList.value[0]
  if (first) return Object.keys(first).map((key) => ({ key }))
  return []
})

function headerLabel(c: ColumnDef): string {
  if (c.label) return c.label
  return c.key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<template>
  <section class="pl-data-table">
    <h3 v-if="title" class="pl-data-table__title">{{ title }}</h3>
    <Table class="pl-data-table__table">
      <TableHeader>
        <TableRow>
          <TableHead v-for="c in resolvedColumns" :key="c.key">{{ headerLabel(c) }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(row, i) in rowList" :key="i">
          <TableCell v-for="c in resolvedColumns" :key="c.key">{{ cell(row, c.key) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <p v-if="!rowList.length" class="pl-data-table__empty">
      {{ emptyMessage ?? 'No data' }}
    </p>
  </section>
</template>

<style scoped>
.pl-data-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  padding: 16px;
  overflow-x: auto;
}
.pl-data-table__title {
  margin: 0;
  font-size: 15px;
  font-weight: 620;
  color: var(--pl-fg, #0f172a);
}
.pl-data-table__empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  color: var(--pl-fg-muted, #64748b);
  font-size: 13px;
}
</style>
