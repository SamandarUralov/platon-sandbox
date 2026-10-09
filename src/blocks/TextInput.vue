<script setup lang="ts">
/**
 * Built-in block: `text_input` (SPEC §3 palette).
 * Wrapper over the ui-kit `Input` atom. Supports `v-model` (`update:modelValue`)
 * and emits the semantic `change` event the action pipeline binds to.
 */
import { Input } from '@platon-rs/platon-ui-kit'

defineProps<{
  modelValue?: string | number
  type?: string
  placeholder?: string
  label?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean | string
  success?: boolean | string
  clearable?: boolean
  required?: boolean
  helperText?: string
  size?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
  (e: 'clear'): void
}>()

function onUpdate(value: string | number) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <Input
    class="pl-text-input"
    :model-value="modelValue"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :label="label"
    :disabled="disabled"
    :readonly="readonly"
    :error="error"
    :success="success"
    :clearable="clearable"
    :required="required"
    :helper-text="helperText"
    :size="size"
    @update:model-value="onUpdate"
    @clear="emit('clear')"
  />
</template>
