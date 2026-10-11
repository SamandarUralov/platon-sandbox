<script setup lang="ts">
/**
 * Built-in block: `area` (Studio UI kit chart).
 * The line chart with gridlines, a y axis and a filled area. Reads the same props as `line`
 * (`title`, `rows`, `groupBy`); everything is forwarded to `LineChart` with `area` set.
 */
import LineChart from './LineChart.vue'
</script>

<template>
  <LineChart area />
</template>
