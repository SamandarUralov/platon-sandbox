<script setup lang="ts">
/**
 * Built-in layout container: `column` (SPEC §8 nested tree).
 * A vertical flex container. `children[]` render into the default slot via the
 * recursive renderer, so arbitrarily deep nesting works.
 */
import { computed } from 'vue'

const props = defineProps<{
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}>()

const ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}
const JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
}

const style = computed(() => ({
  gap: `${props.gap ?? 16}px`,
  alignItems: ALIGN[props.align ?? 'stretch'],
  justifyContent: JUSTIFY[props.justify ?? 'start'],
}))
</script>

<template>
  <div class="pl-column" :style="style">
    <slot />
  </div>
</template>

<style scoped>
.pl-column {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
