<script setup lang="ts">
/**
 * Built-in block: `donut` (Studio UI kit chart), also the plot behind `pie`.
 * Share of a whole: record counts per `groupBy` value from the injected `rows` (sample statuses
 * otherwise), biggest categories kept and the rest folded into "Other", with a legend. `pie`
 * draws filled wedges instead of a ring. Clicking a slice emits `click` with it.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { arcPath, chartData, foldOther, SAMPLE_DONUT, seriesColor, wedgePath, type Datum } from './charts'
import type { Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  groupBy?: string
  source?: string
  columns?: unknown
  count?: number
  /** Filled wedges (set by the `pie` block). */
  pie?: boolean
}>()

const emit = defineEmits<{ (e: 'click', d: Datum): void }>()

const parts = computed(() => foldOther(chartData(props.rows, props.groupBy, SAMPLE_DONUT)))
const total = computed(() => parts.value.reduce((a, d) => a + d.value, 0))
const slices = computed(() => {
  let a = 0
  const sum = total.value || 1
  return parts.value.map((d, i) => {
    const a0 = a
    a += (d.value / sum) * Math.PI * 2
    return {
      ...d,
      d: props.pie ? wedgePath(60, 60, 54, a0, a) : arcPath(60, 60, 46, a0, a),
      color: seriesColor(i),
      pct: Math.round((d.value / sum) * 100),
    }
  })
})
</script>

<template>
  <ChartFrame :title="title" :kind="pie ? 'pie' : 'donut'">
    <div class="pl-donut">
      <svg viewBox="0 0 120 120" class="pl-donut__svg">
        <path
          v-for="s in slices"
          :key="s.label"
          :d="s.d"
          :fill="pie ? s.color : 'none'"
          :stroke="pie ? 'var(--pl-surface, #ffffff)' : s.color"
          :stroke-width="pie ? 2 : 16"
          class="pl-donut__slice"
          @click.stop="emit('click', { label: s.label, value: s.value })"
        >
          <title>{{ s.label }}: {{ s.value }} ({{ s.pct }}%)</title>
        </path>
        <template v-if="!pie">
          <text x="60" y="60" text-anchor="middle" class="pl-donut__total">{{ total }}</text>
          <text x="60" y="76" text-anchor="middle" class="pl-donut__caption">total</text>
        </template>
      </svg>
      <ul class="pl-donut__legend">
        <li v-for="s in slices" :key="s.label" class="pl-donut__item" :data-label="s.label" :data-value="s.value">
          <span class="pl-donut__swatch" :style="{ background: s.color }" />
          <span class="pl-donut__label">{{ s.label }}</span>
          <span class="pl-donut__value">{{ s.value }}</span>
          <span class="pl-donut__pct">{{ s.pct }}%</span>
        </li>
      </ul>
    </div>
  </ChartFrame>
</template>

<style scoped>
.pl-donut {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}
.pl-donut__svg {
  flex-shrink: 0;
  width: 128px;
  height: 128px;
}
.pl-donut__slice {
  cursor: pointer;
}
.pl-donut__total {
  fill: var(--pl-fg, #0f172a);
  font-size: 20px;
  font-weight: 700;
}
.pl-donut__caption {
  fill: var(--pl-fg-muted, #64748b);
  font-size: 10px;
}
.pl-donut__legend {
  flex: 1;
  min-width: 10rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12.5px;
}
.pl-donut__item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pl-donut__item + .pl-donut__item {
  margin-top: 6px;
}
.pl-donut__swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.pl-donut__label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pl-donut__value {
  font-weight: 600;
}
.pl-donut__pct {
  width: 36px;
  text-align: right;
  color: var(--pl-fg-muted, #64748b);
}
</style>
