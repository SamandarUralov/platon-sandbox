<script setup lang="ts">
/**
 * Built-in block: `detail` (Studio UI kit, data-bound "Record details").
 * Read-only label/value pairs of the first injected row for the given `columns` (field keys:
 * string[], a list string, or `{ key }[]`). Without rows it shows a sample record; with an empty
 * result every value reads "—".
 */
import { computed } from 'vue'
import { cellText, columnKeys, humanize, type Row } from './blockUtils'
import { sampleRows } from './sampleRecords'

const props = defineProps<{
  title?: string
  rows?: Row[]
  columns?: unknown
  count?: number
}>()

const keys = computed(() => {
  const k = columnKeys(props.columns)
  if (k.length) return k
  const first = Array.isArray(props.rows) ? props.rows[0] : undefined
  return first ? Object.keys(first) : []
})
const record = computed<Row | undefined>(() =>
  Array.isArray(props.rows) ? props.rows[0] : sampleRows(keys.value, 1)[0],
)
const fields = computed(() => {
  const ks = keys.value.length ? keys.value : Object.keys(record.value ?? {})
  return ks.map((k) => ({ key: k, label: humanize(k), value: record.value ? cellText(record.value[k]) : '—' }))
})
</script>

<template>
  <div class="pl-detail">
    <div v-if="title" class="pl-detail__title">{{ title }}</div>
    <dl class="pl-detail__grid">
      <div v-for="f in fields" :key="f.key" class="pl-detail__field">
        <dt class="pl-detail__label">{{ f.label }}</dt>
        <dd class="pl-detail__value">{{ f.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.pl-detail {
  padding: 20px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-detail__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
}
.pl-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px 16px;
  margin: 0;
}
.pl-detail__field {
  min-width: 0;
}
.pl-detail__label {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-detail__value {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
