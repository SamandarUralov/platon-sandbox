<script setup lang="ts">
/**
 * Built-in block: `date_picker` (SPEC §3 palette).
 * Wrapper over the ui-kit `DatePicker` atom. `v-model` + semantic `change`;
 * forwards the atom's `save`/`cancel` events for action wiring.
 */
import { DatePicker } from '@platon-rs/platon-ui-kit'

defineProps<{
  modelValue?: string
  placeholder?: string
  label?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean | string
  success?: boolean | string
  required?: boolean
  /** Include a time picker alongside the date. */
  time?: boolean
  helperText?: string
  locale?: string
  size?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'save', value: string): void
  (e: 'cancel'): void
}>()

function onUpdate(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <DatePicker
    class="pl-date-picker"
    :model-value="modelValue"
    :placeholder="placeholder"
    :label="label"
    :disabled="disabled"
    :readonly="readonly"
    :error="error"
    :success="success"
    :required="required"
    :time="time"
    :helper-text="helperText"
    :locale="locale"
    :size="size"
    @update:model-value="onUpdate"
    @save="emit('save', $event)"
    @cancel="emit('cancel')"
  />
</template>
