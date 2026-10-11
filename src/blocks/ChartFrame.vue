<script setup lang="ts">
/**
 * Shared card frame for the chart blocks: surface, `title` and an optional headline value on the
 * right. Not registered itself; each chart block renders its plot in the default slot.
 */
defineProps<{ title?: string; headline?: string | number; kind?: string }>()
</script>

<template>
  <div class="pl-chart" :data-chart="kind">
    <div v-if="title || headline !== undefined" class="pl-chart__head">
      <span class="pl-chart__title">{{ title }}</span>
      <span v-if="headline !== undefined" class="pl-chart__headline">{{ headline }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.pl-chart {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-chart__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.pl-chart__title {
  font-size: 14px;
  font-weight: 700;
}
.pl-chart__headline {
  margin-left: auto;
  font-size: 18px;
  font-weight: 700;
}
</style>
