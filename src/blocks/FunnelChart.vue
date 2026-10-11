<script setup lang="ts">
/**
 * Built-in block: `funnel` (Studio UI kit chart).
 * Drop-off between stages: record counts per `groupBy` value from the injected `rows` in
 * first-seen order (sample stages otherwise), each bar sized against the first stage. Clicking a
 * stage emits `click` with `{ label, value }`.
 */
import { computed } from 'vue'
import ChartFrame from './ChartFrame.vue'
import { chartData, SAMPLE_FUNNEL, type Datum } from './charts'
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

const data = computed(() => chartData(props.rows, props.groupBy, SAMPLE_FUNNEL))
const first = computed(() => data.value[0]?.value || 1)
</script>

<template>
  <ChartFrame :title="title" kind="funnel">
    <ol class="pl-funnel">
      <li v-for="(d, i) in data" :key="d.label">
        <button
          type="button"
          class="pl-funnel__stage"
          :style="{ width: `${Math.max(22, (d.value / first) * 100)}%`, opacity: Math.max(0.35, 1 - i * 0.12) }"
          :title="`${d.label}: ${d.value} (${Math.round((d.value / first) * 100)}%)`"
          :data-label="d.label"
          :data-value="d.value"
          @click.stop="emit('click', d)"
        >
          <span class="pl-funnel__text">{{ d.label }} · {{ d.value }}</span>
        </button>
      </li>
    </ol>
  </ChartFrame>
</template>

<style scoped>
.pl-funnel {
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-funnel li + li {
  margin-top: 6px;
}
.pl-funnel__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  margin: 0 auto;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background: var(--pl-accent, #6366f1);
  color: #ffffff;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.pl-funnel__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
