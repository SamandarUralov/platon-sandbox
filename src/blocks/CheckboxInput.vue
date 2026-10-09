<script setup lang="ts">
/**
 * Built-in block: `checkbox` (SPEC §3 palette).
 * Wrapper over the ui-kit `Checkbox` atom with an associated label. `v-model`
 * carries the boolean checked state; emits semantic `change`.
 */
import { Checkbox } from '@platon-rs/platon-ui-kit'

const props = defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
  required?: boolean
  name?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

function onUpdate(value: boolean) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <label class="pl-checkbox" :class="{ 'pl-checkbox--disabled': disabled }">
    <Checkbox
      :model-value="modelValue"
      :disabled="disabled"
      :required="required"
      :name="name"
      @update:model-value="onUpdate"
    />
    <span v-if="label || $slots.default" class="pl-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.pl-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.pl-checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.pl-checkbox__label {
  font-size: 14px;
  color: var(--pl-fg, #0f172a);
}
</style>
