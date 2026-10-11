<script setup lang="ts">
/**
 * Built-in block: `list` (Studio UI kit, data-bound).
 * One card per record: the first column is the card title, the next columns its meta line.
 * `rows` are injected by the renderer from the block's `query`; `columns` are the field keys
 * Studio picked (string[], a list string, or `{ key }[]` from the data model). Without rows it
 * shows sample records so the block never looks empty. Clicking a card emits `rowClick`.
 */
import { computed } from 'vue'
import { cellText, columnKeys, str, type Row } from './blockUtils'
import { sampleRows } from './sampleRecords'

const props = defineProps<{
  title?: string
  rows?: Row[]
  columns?: unknown
  count?: number
  emptyMessage?: string
}>()

const emit = defineEmits<{ (e: 'rowClick', row: Row, index: number): void }>()

const sample = computed(() => !Array.isArray(props.rows))
const keys = computed(() => {
  const k = columnKeys(props.columns)
  if (k.length) return k.slice(0, 5)
  const first = Array.isArray(props.rows) ? props.rows[0] : undefined
  if (first) return Object.keys(first).filter((x) => x !== 'id').slice(0, 3)
  return []
})
const rowList = computed<Row[]>(() => (Array.isArray(props.rows) ? props.rows : sampleRows(keys.value)))
const items = computed(() => {
  const ks = keys.value.length ? keys.value : Object.keys(rowList.value[0] ?? {})
  return rowList.value.slice(0, 12).map((row) => ({
    row,
    title: cellText(row[ks[0] ?? 'id'] ?? row.id),
    meta: ks.slice(1).map((k) => cellText(row[k])),
  }))
})
</script>

<template>
  <div class="pl-list" :class="{ 'pl-list--sample': sample }">
    <div v-if="title" class="pl-list__title">{{ title }}</div>
    <button
      v-for="(it, i) in items"
      :key="str(it.row.id, String(i))"
      type="button"
      class="pl-list__item"
      @click.stop="emit('rowClick', it.row, i)"
    >
      <span class="pl-list__main">
        <span class="pl-list__name">{{ it.title }}</span>
        <span v-if="it.meta.length" class="pl-list__meta">
          <span v-for="(m, j) in it.meta" :key="j">{{ m }}</span>
        </span>
      </span>
      <svg class="pl-list__chev" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
    <div v-if="!items.length" class="pl-list__empty">{{ emptyMessage ?? 'No records to show.' }}</div>
  </div>
</template>

<style scoped>
.pl-list {
  overflow: hidden;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-list__title {
  padding: 12px 16px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
  font-size: 14px;
  font-weight: 700;
}
.pl-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--pl-border, #e5e7eb) 70%, transparent);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.pl-list__item:last-of-type {
  border-bottom: 0;
}
.pl-list__item:hover {
  background: color-mix(in srgb, var(--pl-fg-muted, #64748b) 7%, transparent);
}
.pl-list__main {
  flex: 1;
  min-width: 0;
}
.pl-list__name {
  display: block;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pl-list__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-list__chev {
  color: var(--pl-fg-muted, #64748b);
}
.pl-list__empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 12.5px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
