<script setup lang="ts">
/**
 * Built-in block: `gauge` (Studio UI kit).
 * One value against a target on a 180° arc: `title`, `value` (default 72), `max` (target,
 * default 100) and `unit` (default "%").
 */
import { computed } from 'vue'
import { arcPath } from './charts'
import { num, str } from './blockUtils'

const props = defineProps<{
  title?: string
  value?: number | string
  max?: number | string
  unit?: string
}>()

const target = computed(() => Math.max(1, num(props.max, 100)))
const current = computed(() => num(props.value, 72))
const unit = computed(() => str(props.unit, '%'))
const share = computed(() => Math.min(1, Math.max(0, current.value / target.value)))
const track = arcPath(60, 60, 46, -Math.PI / 2, Math.PI / 2)
const fill = computed(() =>
  share.value > 0 ? arcPath(60, 60, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * share.value) : '',
)
</script>

<template>
  <div class="pl-gauge">
    <div v-if="title" class="pl-gauge__title">{{ title }}</div>
    <svg viewBox="0 0 120 70" class="pl-gauge__svg" role="img" :aria-label="`${current} of ${target}`">
      <path :d="track" fill="none" class="pl-gauge__track" stroke-width="12" stroke-linecap="round" />
      <path v-if="fill" :d="fill" fill="none" class="pl-gauge__fill" stroke-width="12" stroke-linecap="round" />
      <text x="60" y="58" text-anchor="middle" class="pl-gauge__value">{{ current }}{{ unit }}</text>
    </svg>
    <div class="pl-gauge__target">Target {{ target }}{{ unit }}</div>
  </div>
</template>

<style scoped>
.pl-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-gauge__title {
  align-self: flex-start;
  font-size: 14px;
  font-weight: 700;
}
.pl-gauge__svg {
  width: 176px;
  margin-top: 8px;
}
.pl-gauge__track {
  stroke: color-mix(in srgb, var(--pl-fg-muted, #64748b) 16%, transparent);
}
.pl-gauge__fill {
  stroke: var(--pl-accent, #6366f1);
}
.pl-gauge__value {
  fill: var(--pl-fg, #0f172a);
  font-size: 18px;
  font-weight: 700;
}
.pl-gauge__target {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
