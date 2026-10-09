<script setup lang="ts">
/**
 * Built-in block: `button` (SPEC §3 palette).
 * Thin wrapper over the ui-kit `Button` atom. `click` is the event the action
 * pipeline (SPEC §2 events) binds to.
 */
import { Button } from '@platon-rs/platon-ui-kit'

const props = defineProps<{
  label?: string
  variant?: string
  size?: string
  outlined?: boolean
  disabled?: boolean
  iconOnly?: boolean
  /** Stretch to the full width of the parent container. */
  block?: boolean
}>()

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

function onClick(ev: MouseEvent) {
  if (props.disabled) return
  emit('click', ev)
}
</script>

<template>
  <Button
    class="pl-button"
    :class="{ 'pl-button--block': block }"
    :variant="variant ?? 'primary'"
    :size="size"
    :outlined="outlined"
    :disabled="disabled"
    :icon-only="iconOnly"
    @click="onClick"
  >
    <slot>{{ label ?? 'Button' }}</slot>
  </Button>
</template>

<style scoped>
.pl-button--block {
  width: 100%;
}
</style>
