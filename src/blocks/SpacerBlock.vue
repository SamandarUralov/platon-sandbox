<script setup lang="ts">
/**
 * Built-in block: `spacer` (Studio UI kit).
 * Empty vertical space. `size` is the height in px (clamped to 4–240, default 24).
 */
import { computed } from 'vue'
import { num } from './blockUtils'

const props = defineProps<{ title?: string; size?: number | string }>()

const height = computed(() => Math.min(240, Math.max(4, num(props.size, 24))))
</script>

<template>
  <div class="pl-spacer" :style="{ height: `${height}px` }" aria-hidden="true" />
</template>

<style scoped>
.pl-spacer {
  width: 100%;
}
</style>
