<script setup lang="ts">
/**
 * Built-in block: `line` (Studio UI kit chart), also the plot behind `area`.
 * Trend of record counts per `groupBy` value from the injected `rows` (sample months
 * otherwise), drawn as an SVG polyline with a soft fill; the last value is the headline. `area`
 * adds gridlines, a y axis and a stronger fill. Clicking emits `click` with the last datum.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { chartData, linePoints, niceMax, SAMPLE_LINE, ticks, type Datum } from './charts'
import type { Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  groupBy?: string
  source?: string
  columns?: unknown
  count?: number
  /** Area variant (set by the `area` block). */
  area?: boolean
}>()

const emit = defineEmits<{ (e: 'click', d: Datum | undefined): void }>()

const W = 600
const H = 160
const data = computed(() => chartData(props.rows, props.groupBy, SAMPLE_LINE))
const max = computed(() => niceMax(Math.max(...data.value.map((d) => d.value))))
const axis = computed(() => ticks(max.value))
const poly = computed(() =>
  linePoints(data.value, W, H, max.value)
    .map((p) => p.map((n) => n.toFixed(1)).join(','))
    .join(' '),
)
const fillPts = computed(() => `0,${H} ${poly.value} ${W},${H}`)
const last = computed(() => data.value.at(-1))
</script>

<template>
  <ChartFrame :title="title" :headline="last?.value" :kind="area ? 'area' : 'line'">
    <div class="pl-line">
      <div v-if="area" class="pl-line__axis">
        <span v-for="k in axis" :key="k">{{ k }}</span>
      </div>
      <div class="pl-line__plot">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
          class="pl-line__svg"
          @click.stop="emit('click', last)"
        >
          <template v-if="area">
            <line
              v-for="i in 4"
              :key="i"
              x1="0"
              :x2="W"
              :y1="(H / 4) * (i - 1)"
              :y2="(H / 4) * (i - 1)"
              class="pl-line__grid"
              vector-effect="non-scaling-stroke"
            />
          </template>
          <polygon :points="fillPts" class="pl-line__fill" :class="{ 'pl-line__fill--area': area }" />
          <polyline
            :points="poly"
            fill="none"
            class="pl-line__stroke"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
            stroke-linejoin="round"
          />
        </svg>
        <div class="pl-line__labels">
          <span
            v-for="(d, i) in data"
            v-show="i % 2 === 0 || data.length < 8"
            :key="i"
            :title="`${d.label}: ${d.value}`"
            >{{ d.label }}</span
          >
        </div>
      </div>
    </div>
  </ChartFrame>
</template>

<style scoped>
.pl-line {
  display: flex;
  gap: 8px;
}
.pl-line__axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 160px;
  font-size: 11px;
  text-align: right;
  color: var(--pl-fg-muted, #64748b);
}
.pl-line__plot {
  flex: 1;
  min-width: 0;
}
.pl-line__svg {
  display: block;
  width: 100%;
  height: 160px;
  overflow: visible;
  cursor: pointer;
}
.pl-line__grid {
  stroke: color-mix(in srgb, var(--pl-border, #e5e7eb) 70%, transparent);
}
.pl-line__fill {
  fill: color-mix(in srgb, var(--pl-accent, #6366f1) 10%, transparent);
}
.pl-line__fill--area {
  fill: color-mix(in srgb, var(--pl-accent, #6366f1) 24%, transparent);
}
.pl-line__stroke {
  stroke: var(--pl-accent, #6366f1);
}
.pl-line__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
