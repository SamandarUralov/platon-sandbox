<script setup lang="ts">
/**
 * Built-in block: `stacked` (Studio UI kit chart).
 * Stacked bars: record counts per `groupBy` value split by `seriesBy` value from the injected
 * `rows` (sample series otherwise), with a legend. Clicking a column emits `click` with
 * `{ label, values }`.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { groupCounts2, niceMax, SAMPLE_STACKED, seriesColor } from './charts'
import type { Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  groupBy?: string
  seriesBy?: string
  source?: string
  columns?: unknown
  count?: number
}>()

const emit = defineEmits<{ (e: 'click', d: { label: string; values: number[] }): void }>()

const data = computed(() => {
  const real = groupCounts2(props.rows, props.groupBy, props.seriesBy)
  return real?.labels.length ? real : SAMPLE_STACKED
})
const totals = computed(() => data.value.labels.map((_, i) => data.value.series.reduce((a, s) => a + (s.values[i] ?? 0), 0)))
const max = computed(() => niceMax(Math.max(1, ...totals.value)))
const axis = computed(() => [4, 3, 2, 1, 0].map((i) => Math.round((max.value / 4) * i)))
</script>

<template>
  <ChartFrame :title="title" kind="stacked">
    <div class="pl-stacked">
      <div class="pl-stacked__axis">
        <span v-for="k in axis" :key="k">{{ k }}</span>
      </div>
      <div class="pl-stacked__plot">
        <button
          v-for="(label, i) in data.labels"
          :key="label"
          type="button"
          class="pl-stacked__col"
          :title="`${label}: ${data.series.map((s) => `${s.name} ${s.values[i]}`).join(', ')}`"
          :data-label="label"
          :data-value="totals[i]"
          @click.stop="emit('click', { label, values: data.series.map((s) => s.values[i] ?? 0) })"
        >
          <span class="pl-stacked__stack" :style="{ height: `${((totals[i] ?? 0) / max) * 100}%` }">
            <span
              v-for="(s, k) in data.series"
              :key="s.name"
              class="pl-stacked__seg"
              :style="{ flexGrow: s.values[i] ?? 0, background: seriesColor(k) }"
            />
          </span>
          <span class="pl-stacked__label">{{ label }}</span>
        </button>
      </div>
    </div>
    <ul class="pl-stacked__legend">
      <li v-for="(s, k) in data.series" :key="s.name">
        <span class="pl-stacked__swatch" :style="{ background: seriesColor(k) }" />{{ s.name }}
      </li>
    </ul>
  </ChartFrame>
</template>

<style scoped>
.pl-stacked {
  display: flex;
  gap: 8px;
  height: 176px;
  padding-bottom: 20px;
}
.pl-stacked__axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  text-align: right;
  color: var(--pl-fg-muted, #64748b);
}
.pl-stacked__plot {
  display: flex;
  flex: 1;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
}
.pl-stacked__col {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
.pl-stacked__stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  width: 100%;
  max-width: 40px;
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}
.pl-stacked__seg {
  width: 100%;
}
.pl-stacked__label {
  position: absolute;
  bottom: -20px;
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--pl-fg-muted, #64748b);
}
.pl-stacked__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}
.pl-stacked__legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pl-stacked__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>
