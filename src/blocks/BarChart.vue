<script setup lang="ts">
/**
 * Built-in block: `bar` (Studio UI kit chart).
 * Vertical bars of record counts per `groupBy` value from the injected `rows` (the block's
 * `query`); sample months until both exist. The last bar uses the full accent. Clicking a bar
 * emits `click` with `{ label, value }`.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { chartData, niceMax, SAMPLE_BAR, ticks, type Datum } from './charts'
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

const data = computed(() => chartData(props.rows, props.groupBy, SAMPLE_BAR))
const max = computed(() => niceMax(Math.max(...data.value.map((d) => d.value))))
const axis = computed(() => ticks(max.value))
</script>

<template>
  <ChartFrame :title="title" kind="bar">
    <div class="pl-bar">
      <div class="pl-bar__axis">
        <span v-for="k in axis" :key="k">{{ k }}</span>
      </div>
      <div class="pl-bar__plot">
        <button
          v-for="(d, i) in data"
          :key="d.label"
          type="button"
          class="pl-bar__col"
          :title="`${d.label}: ${d.value}`"
          :data-label="d.label"
          :data-value="d.value"
          @click.stop="emit('click', d)"
        >
          <span class="pl-bar__val">{{ d.value }}</span>
          <span
            class="pl-bar__bar"
            :class="{ 'pl-bar__bar--last': i === data.length - 1 }"
            :style="{ height: `${(d.value / max) * 100}%` }"
          />
          <span class="pl-bar__label">{{ d.label }}</span>
        </button>
      </div>
    </div>
  </ChartFrame>
</template>

<style scoped>
.pl-bar {
  display: flex;
  gap: 8px;
  height: 176px;
  padding-bottom: 20px;
}
.pl-bar__axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  text-align: right;
  color: var(--pl-fg-muted, #64748b);
}
.pl-bar__plot {
  display: flex;
  flex: 1;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
}
.pl-bar__col {
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
.pl-bar__val {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--pl-fg-muted, #64748b);
  opacity: 0;
}
.pl-bar__col:hover .pl-bar__val {
  opacity: 1;
}
.pl-bar__bar {
  width: 100%;
  max-width: 40px;
  border-radius: 4px 4px 0 0;
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 38%, transparent);
}
.pl-bar__bar--last {
  background: var(--pl-accent, #6366f1);
}
.pl-bar__label {
  position: absolute;
  bottom: -20px;
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--pl-fg-muted, #64748b);
}
</style>
