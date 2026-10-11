<script setup lang="ts">
/**
 * Built-in block: `scatter` (Studio UI kit chart).
 * Relation of two numbers: one dot per injected row at (`xField`, `yField`); rows whose values
 * are not numbers are skipped, and sample points show until both fields yield data. Clicking a
 * dot emits `click` with `{ x, y, label }`.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { niceMax, numericPoints, SAMPLE_SCATTER, type Point } from './charts'
import type { Row } from './blockUtils'

const props = defineProps<{
  title?: string
  rows?: Row[]
  xField?: string
  yField?: string
  source?: string
  columns?: unknown
  count?: number
}>()

const emit = defineEmits<{ (e: 'click', p: Point): void }>()

const points = computed(() => numericPoints(props.rows, props.xField, props.yField) ?? SAMPLE_SCATTER)
const xMax = computed(() => niceMax(Math.max(...points.value.map((p) => p.x))))
const yMax = computed(() => niceMax(Math.max(...points.value.map((p) => p.y))))
const yTicks = computed(() => [4, 3, 2, 1, 0].map((i) => Math.round((yMax.value / 4) * i * 10) / 10))
const xTicks = computed(() => [0, 1, 2, 3, 4].map((i) => Math.round((xMax.value / 4) * i * 10) / 10))
</script>

<template>
  <ChartFrame :title="title" kind="scatter">
    <div class="pl-scatter">
      <div class="pl-scatter__axis">
        <span v-for="k in yTicks" :key="k">{{ k }}</span>
      </div>
      <div class="pl-scatter__plot">
        <div class="pl-scatter__area">
          <span v-for="i in 5" :key="i" class="pl-scatter__grid" :style="{ top: `${(i - 1) * 25}%` }" />
          <button
            v-for="(p, i) in points"
            :key="i"
            type="button"
            class="pl-scatter__dot"
            :style="{ left: `${(p.x / xMax) * 100}%`, bottom: `${(p.y / yMax) * 100}%` }"
            :title="`${p.label ? `${p.label}: ` : ''}${p.x}, ${p.y}`"
            @click.stop="emit('click', p)"
          />
        </div>
        <div class="pl-scatter__xaxis">
          <span v-for="k in xTicks" :key="k">{{ k }}</span>
        </div>
      </div>
    </div>
  </ChartFrame>
</template>

<style scoped>
.pl-scatter {
  display: flex;
  gap: 8px;
}
.pl-scatter__axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 176px;
  font-size: 11px;
  text-align: right;
  color: var(--pl-fg-muted, #64748b);
}
.pl-scatter__plot {
  flex: 1;
  min-width: 0;
}
.pl-scatter__area {
  position: relative;
  height: 176px;
}
.pl-scatter__grid {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid color-mix(in srgb, var(--pl-border, #e5e7eb) 70%, transparent);
}
.pl-scatter__dot {
  position: absolute;
  width: 10px;
  height: 10px;
  padding: 0;
  border: 2px solid var(--pl-surface, #ffffff);
  border-radius: 999px;
  background: var(--pl-accent, #6366f1);
  transform: translate(-50%, 50%);
  cursor: pointer;
}
.pl-scatter__xaxis {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
