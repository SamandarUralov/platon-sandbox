<script setup lang="ts">
/**
 * Built-in block: `hbar` (Studio UI kit chart).
 * Horizontal bars ranking record counts per `groupBy` value from the injected `rows` (sample
 * months otherwise), largest first, top 12. Clicking a bar emits `click` with `{ label, value }`.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { chartData, niceMax, SAMPLE_BAR, type Datum } from './charts'
import type { Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  groupBy?: string
  source?: string
  columns?: unknown
  count?: number
}>()

const emit = defineEmits<{ (e: 'click', d: Datum): void }>()

const ranked = computed(() =>
  [...chartData(props.rows, props.groupBy, SAMPLE_BAR)].sort((a, b) => b.value - a.value).slice(0, 12),
)
const max = computed(() => niceMax(Math.max(...ranked.value.map((d) => d.value))))
</script>

<template>
  <ChartFrame :title="title" kind="hbar">
    <ul class="pl-hbar">
      <li v-for="d in ranked" :key="d.label">
        <button
          type="button"
          class="pl-hbar__row"
          :title="`${d.label}: ${d.value}`"
          :data-label="d.label"
          :data-value="d.value"
          @click.stop="emit('click', d)"
        >
          <span class="pl-hbar__label">{{ d.label }}</span>
          <span class="pl-hbar__track">
            <span class="pl-hbar__bar" :style="{ width: `${(d.value / max) * 100}%` }" />
          </span>
          <span class="pl-hbar__value">{{ d.value }}</span>
        </button>
      </li>
    </ul>
  </ChartFrame>
</template>

<style scoped>
.pl-hbar {
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-hbar li + li {
  margin-top: 8px;
}
.pl-hbar__row {
  display: grid;
  grid-template-columns: minmax(0, 7rem) 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.pl-hbar__label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pl-hbar__track {
  height: 12px;
  overflow: hidden;
  border-radius: 0 4px 4px 0;
  background: color-mix(in srgb, var(--pl-fg-muted, #64748b) 12%, transparent);
}
.pl-hbar__bar {
  display: block;
  height: 100%;
  border-radius: 0 4px 4px 0;
  background: var(--pl-accent, #6366f1);
}
.pl-hbar__value {
  width: 32px;
  text-align: right;
  font-weight: 600;
}
</style>
