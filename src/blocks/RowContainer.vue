<script setup lang="ts">
/**
 * Built-in layout container: `row` (SPEC §8 nested tree).
 * A horizontal flex container. `children[]` render into the default slot via the
 * recursive renderer, so arbitrarily deep nesting works.
 */
import { computed, type CSSProperties } from 'vue'

const props = defineProps<{
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
}>()

const ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
}
const JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
}

const style = computed<CSSProperties>(() => ({
  gap: `${props.gap ?? 16}px`,
  alignItems: ALIGN[props.align ?? 'stretch'],
  justifyContent: JUSTIFY[props.justify ?? 'start'],
  flexWrap: (props.wrap ?? true) ? 'wrap' : 'nowrap',
}))
</script>

<template>
  <div class="pl-row" :style="style">
    <slot />
  </div>
</template>

<style scoped>
.pl-row {
  display: flex;
  flex-direction: row;
  width: 100%;
}
.pl-row > * {
  flex: 1 1 0;
  min-width: 0;
}
</style>
