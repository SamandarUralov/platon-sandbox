<script setup lang="ts">
/**
 * Built-in block: `numbers` (SPEC §3 palette).
 * A single prominent metric (value + label + optional delta), as opposed to the
 * `stat_group` grid. Uses the ui-kit `Badge` atom for the delta chip.
 */
import { computed } from 'vue'
import { Badge } from '@platon-rs/platon-ui-kit'

const props = defineProps<{
  label?: string
  value?: string | number
  prefix?: string
  suffix?: string
  /** Decimal places when `value` is numeric. */
  precision?: number
  delta?: string | number
  deltaType?: 'up' | 'down' | 'neutral'
  hint?: string
  align?: 'left' | 'center' | 'right'
}>()

const formattedValue = computed<string>(() => {
  const v = props.value
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'number' && Number.isFinite(v)) {
    const opts =
      props.precision !== undefined
        ? { minimumFractionDigits: props.precision, maximumFractionDigits: props.precision }
        : undefined
    return new Intl.NumberFormat(undefined, opts).format(v)
  }
  return String(v)
})

const deltaVariant = computed(() =>
  props.deltaType === 'down' ? 'error' : props.deltaType === 'up' ? 'success' : 'secondary',
)
</script>

<template>
  <div class="pl-numbers" :style="{ textAlign: align ?? 'left' }">
    <span v-if="label" class="pl-numbers__label">{{ label }}</span>
    <div class="pl-numbers__valuerow">
      <span class="pl-numbers__value">
        <span v-if="prefix" class="pl-numbers__affix">{{ prefix }}</span>{{ formattedValue }}<span
          v-if="suffix"
          class="pl-numbers__affix"
          >{{ suffix }}</span
        >
      </span>
      <Badge v-if="delta !== undefined" :variant="deltaVariant">{{ delta }}</Badge>
    </div>
    <span v-if="hint" class="pl-numbers__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.pl-numbers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pl-numbers__label {
  font-size: 13px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-numbers__valuerow {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.pl-numbers__value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--pl-fg, #0f172a);
}
.pl-numbers__affix {
  font-size: 20px;
  font-weight: 600;
  color: var(--pl-fg-muted, #64748b);
  margin: 0 2px;
}
.pl-numbers__hint {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
