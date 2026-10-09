<script setup lang="ts">
/**
 * Built-in block: `form` (SPEC §3 palette, §8 container).
 *
 * A layout container: its `children[]` (rendered into the default slot by the
 * recursive renderer, SPEC §8) are the form controls. Emits `submit` (native
 * submit, default prevented) and `reset` for the action pipeline.
 */
import { computed } from 'vue'
import { Button } from '@platon-rs/platon-ui-kit'

const props = defineProps<{
  title?: string
  description?: string
  submitLabel?: string
  cancelLabel?: string
  /** Hide the built-in submit/cancel row. */
  hideActions?: boolean
  disabled?: boolean
  /** Spacing between child controls (px). */
  gap?: number
}>()

const emit = defineEmits<{
  (e: 'submit', ev: Event): void
  (e: 'reset'): void
}>()

const bodyStyle = computed(() => ({ gap: `${props.gap ?? 16}px` }))

function onSubmit(ev: Event) {
  ev.preventDefault()
  if (props.disabled) return
  emit('submit', ev)
}
function onCancel() {
  emit('reset')
}
</script>

<template>
  <form class="pl-form" novalidate @submit="onSubmit">
    <header v-if="title || description" class="pl-form__header">
      <h3 v-if="title" class="pl-form__title">{{ title }}</h3>
      <p v-if="description" class="pl-form__description">{{ description }}</p>
    </header>

    <div class="pl-form__body" :style="bodyStyle">
      <!-- Nested child blocks (form controls) render here (SPEC §8). -->
      <slot />
    </div>

    <footer v-if="!hideActions" class="pl-form__actions">
      <Button v-if="cancelLabel" variant="secondary" outlined type="button" @click="onCancel">
        {{ cancelLabel }}
      </Button>
      <Button variant="primary" type="submit" :disabled="disabled">
        {{ submitLabel ?? 'Submit' }}
      </Button>
    </footer>
  </form>
</template>

<style scoped>
.pl-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
}
.pl-form__title {
  margin: 0;
  font-size: 16px;
  font-weight: 640;
  color: var(--pl-fg, #0f172a);
}
.pl-form__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-form__body {
  display: flex;
  flex-direction: column;
}
.pl-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
