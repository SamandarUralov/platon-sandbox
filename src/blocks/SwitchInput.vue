<script setup lang="ts">
/**
 * Built-in block: `switch` (SPEC §3 palette).
 * Wrapper over the ui-kit `Switch` atom with an associated label. `v-model`
 * carries the boolean on/off state; emits semantic `change`.
 */
import { Switch } from '@platon-rs/platon-ui-kit'

const props = defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
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
  <label class="pl-switch" :class="{ 'pl-switch--disabled': disabled }">
    <Switch
      :model-value="modelValue"
      :disabled="disabled"
      :name="name"
      @update:model-value="onUpdate"
    />
    <span v-if="label || $slots.default" class="pl-switch__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.pl-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.pl-switch--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.pl-switch__label {
  font-size: 14px;
  color: var(--pl-fg, #0f172a);
}
</style>
