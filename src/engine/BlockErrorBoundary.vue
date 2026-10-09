<script setup lang="ts">
/**
 * Per-block error boundary (SPEC §9, MANDATORY).
 *
 * Wraps a single block's subtree. If that block throws during render/update, we
 * catch it here, show an inline error card, and STOP propagation so sibling
 * blocks keep rendering. The error is reported upward (console + Studio bridge).
 */
import { onErrorCaptured, ref } from 'vue'

const props = defineProps<{ blockId: string; component: string }>()
const emit = defineEmits<{ (e: 'block-error', payload: { blockId: string; error: unknown }): void }>()

const failed = ref(false)
const message = ref('')

onErrorCaptured((err) => {
  failed.value = true
  message.value = err instanceof Error ? err.message : String(err)
  emit('block-error', { blockId: props.blockId, error: err })
  // Returning false stops the error from propagating to parent boundaries.
  return false
})
</script>

<template>
  <div
    v-if="failed"
    class="pl-block-error"
    role="alert"
    :data-block-id="blockId"
  >
    <div class="pl-block-error__head">
      <span class="pl-block-error__tag">Block error</span>
      <code class="pl-block-error__comp">{{ component }}</code>
    </div>
    <p class="pl-block-error__msg">{{ message }}</p>
    <span class="pl-block-error__id">block: {{ blockId }}</span>
  </div>
  <slot v-else />
</template>

<style scoped>
.pl-block-error {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--pl-danger, #dc2626);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pl-danger, #dc2626) 7%, transparent);
  color: var(--pl-danger, #dc2626);
  font-size: 13px;
}
.pl-block-error__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pl-block-error__tag {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.03em;
}
.pl-block-error__comp {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}
.pl-block-error__msg {
  margin: 0;
  color: var(--pl-fg, #0f172a);
  opacity: 0.85;
}
.pl-block-error__id {
  font-size: 11px;
  opacity: 0.6;
}
</style>
