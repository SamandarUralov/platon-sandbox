<script setup lang="ts">
/**
 * Built-in block: `progress` (Studio UI kit).
 * Completion per item. Studio's block has no data binding yet, so (like Studio's canvas) it shows
 * sample rows under the block `title`.
 */
defineProps<{ title?: string }>()

const ROWS = [
  { label: 'Sam Ortiz', value: 7, max: 8 },
  { label: 'Priya Nair', value: 5, max: 8 },
  { label: 'Leo Brandt', value: 8, max: 8 },
  { label: 'Ana Costa', value: 3, max: 8 },
]
</script>

<template>
  <div class="pl-progress">
    <div v-if="title" class="pl-progress__title">{{ title }}</div>
    <div v-for="r in ROWS" :key="r.label" class="pl-progress__row">
      <div class="pl-progress__head">
        <span class="pl-progress__label">{{ r.label }}</span>
        <span class="pl-progress__value">{{ r.value }} / {{ r.max }} jobs</span>
      </div>
      <div class="pl-progress__track">
        <div
          class="pl-progress__fill"
          :class="{ 'pl-progress__fill--full': r.value >= r.max }"
          :style="{ width: `${(r.value / r.max) * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pl-progress {
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-progress__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
}
.pl-progress__row + .pl-progress__row {
  margin-top: 12px;
}
.pl-progress__head {
  display: flex;
  margin-bottom: 4px;
  font-size: 12.5px;
}
.pl-progress__label {
  font-weight: 500;
}
.pl-progress__value {
  margin-left: auto;
  color: var(--pl-fg-muted, #64748b);
}
.pl-progress__track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pl-fg-muted, #64748b) 14%, transparent);
}
.pl-progress__fill {
  height: 100%;
  border-radius: 999px;
  background: var(--pl-accent, #6366f1);
}
.pl-progress__fill--full {
  background: var(--pl-success, #16a34a);
}
</style>
