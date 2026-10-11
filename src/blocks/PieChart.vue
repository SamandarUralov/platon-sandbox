<script setup lang="ts">
/**
 * Built-in block: `pie` (Studio UI kit chart).
 * The donut chart drawn as filled wedges. Reads the same props as `donut` (`title`, `rows`,
 * `groupBy`); everything is forwarded to `DonutChart` with `pie` set.
 */
import DonutChart from './DonutChart.vue'
</script>

<template>
  <DonutChart pie />
</template>
