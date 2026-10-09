<script setup lang="ts">
/**
 * Built-in block: `table` (SPEC §3 palette).
 *
 * A static, prop-driven table built from the ui-kit `Table` primitives. Distinct
 * from the query-bound `data_table` built-in: `table` takes its `columns`/`rows`
 * directly from props (no query resolution), so the Studio can drop a quick table
 * from literal data. Emits `row-click` for action wiring.
 */
import { computed } from 'vue'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platon-rs/platon-ui-kit'

interface ColumnDef {
  key: string
  label?: string
  align?: 'left' | 'center' | 'right'
}

const props = defineProps<{
  caption?: string
  columns?: (ColumnDef | string)[]
  rows?: Record<string, unknown>[]
  emptyMessage?: string
}>()

const emit = defineEmits<{
  (e: 'row-click', row: Record<string, unknown>, index: number): void
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
  <div class="pl-table">
    <Table>
      <TableCaption v-if="caption">{{ caption }}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="c in resolvedColumns"
            :key="c.key"
            :style="{ textAlign: c.align ?? 'left' }"
          >
            {{ headerLabel(c) }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(row, i) in rowList"
          :key="i"
          class="pl-table__row"
          @click="emit('row-click', row, i)"
        >
          <TableCell
            v-for="c in resolvedColumns"
            :key="c.key"
            :style="{ textAlign: c.align ?? 'left' }"
          >
            {{ cell(row, c.key) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <p v-if="!rowList.length" class="pl-table__empty">{{ emptyMessage ?? 'No data' }}</p>
  </div>
</template>

<style scoped>
.pl-table {
  width: 100%;
  overflow-x: auto;
}
.pl-table__row {
  cursor: pointer;
}
.pl-table__empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  color: var(--pl-fg-muted, #64748b);
  font-size: 13px;
}
</style>
