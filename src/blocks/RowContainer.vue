<script setup lang="ts">
/**
 * Built-in layout container: `row` (SPEC §8 nested tree).
 * A horizontal flex container. `children[]` render into the default slot via the
 * recursive renderer, so arbitrarily deep nesting works.
 *
 * With `columns` the row is a 12-column track: each child's basis is the exact
 * width of `layout.colSpan` grid columns (BlockRenderer exposes it as
 * `--pl-col-span`), so rows line up like a CSS grid while every block is shown.
 * It stays flex so that `auto` children can grow into the room a block hidden
 * from the current role leaves (Studio's renderer re-shares such rows too).
 * Below 560px of row width every child takes the full row.
 */
import { computed, type CSSProperties } from 'vue'

const props = defineProps<{
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  /** Grid columns (Studio sends 12); missing keeps the flex row. */
  columns?: number
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

const cols = computed(() => {
  const n = Math.round(Number(props.columns))
  return Number.isFinite(n) && n > 0 ? Math.min(24, n) : 0
})

const style = computed<CSSProperties>(() =>
  cols.value
    ? {
        '--pl-row-columns': String(cols.value),
        '--pl-row-gap': `${props.gap ?? 16}px`,
        gap: `${props.gap ?? 16}px`,
        alignItems: ALIGN[props.align ?? 'stretch'],
      }
    : {
        gap: `${props.gap ?? 16}px`,
        alignItems: ALIGN[props.align ?? 'stretch'],
        justifyContent: JUSTIFY[props.justify ?? 'start'],
        flexWrap: (props.wrap ?? true) ? 'wrap' : 'nowrap',
      },
)
</script>

<template>
  <div v-if="cols" class="pl-row-cq">
    <div class="pl-row pl-row--grid" :style="style">
      <slot />
    </div>
  </div>
  <div v-else class="pl-row" :style="style">
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

<!-- Not scoped: the children are BlockRenderer wrappers, which carry no scope id of this component. -->
<style>
.pl-row-cq {
  container-type: inline-size;
  width: 100%;
}
.pl-row.pl-row--grid {
  flex-wrap: nowrap;
}
/* Basis = width of N columns of a grid with the row's gap; the bases of a full row add up to it. */
.pl-row--grid > * {
  --pl-col: calc((100% - (var(--pl-row-columns) - 1) * var(--pl-row-gap)) / var(--pl-row-columns));
  flex: var(--pl-col-grow, 0) 1
    calc(var(--pl-col) * var(--pl-col-span, 12) + (var(--pl-col-span, 12) - 1) * var(--pl-row-gap));
  min-width: 0;
}
/* GRID_STACK_BELOW in engine/layout.ts */
@container (max-width: 559px) {
  .pl-row.pl-row--grid {
    flex-wrap: wrap;
  }
  .pl-row--grid > * {
    flex-basis: 100%;
  }
}
</style>
