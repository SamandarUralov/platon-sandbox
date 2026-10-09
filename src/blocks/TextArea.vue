<script setup lang="ts">
/**
 * Built-in block: `text_area` (SPEC §3 palette).
 * Wrapper over the ui-kit `Textarea` atom. `v-model` + semantic `change`.
 */
import { Textarea } from '@platon-rs/platon-ui-kit'

defineProps<{
  modelValue?: string
  placeholder?: string
  label?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean | string
  success?: boolean | string
  required?: boolean
  minLength?: number
  maxLength?: number
  helperText?: string
  resize?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

function onUpdate(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <Textarea
    class="pl-text-area"
    :model-value="modelValue"
    :placeholder="placeholder"
    :label="label"
    :disabled="disabled"
    :readonly="readonly"
    :error="error"
    :success="success"
    :required="required"
    :min-length="minLength"
    :max-length="maxLength"
    :helper-text="helperText"
    :resize="resize"
    @update:model-value="onUpdate"
    @focus="emit('focus')"
    @blur="emit('blur')"
  />
</template>
