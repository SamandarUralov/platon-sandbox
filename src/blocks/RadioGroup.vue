<script setup lang="ts">
/**
 * Built-in block: `radio_group` (SPEC §3 palette).
 *
 * The ui-kit has no radio atom, so this semantic block composes native
 * `<input type="radio">` controls styled from the theme tokens. `options` may be
 * strings or `{ label, value }`. `v-model` + semantic `change`.
 */
import { computed, useId } from 'vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

const props = defineProps<{
  modelValue?: string | number
  options?: (Option | string | number)[]
  label?: string
  name?: string
  disabled?: boolean
  direction?: 'row' | 'column'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const autoName = useId()
const groupName = computed(() => props.name ?? autoName)

const normalized = computed<Option[]>(() =>
  (props.options ?? []).map((o) =>
    typeof o === 'object' && o !== null ? o : { label: String(o), value: o },
  ),
)

function onSelect(value: string | number) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <fieldset class="pl-radio-group" :class="`pl-radio-group--${direction ?? 'column'}`">
    <legend v-if="label" class="pl-radio-group__legend">{{ label }}</legend>
    <label
      v-for="opt in normalized"
      :key="String(opt.value)"
      class="pl-radio"
      :class="{ 'pl-radio--disabled': disabled || opt.disabled }"
    >
      <input
        type="radio"
        class="pl-radio__input"
        :name="groupName"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled || opt.disabled"
        @change="onSelect(opt.value)"
      />
      <span class="pl-radio__label">{{ opt.label }}</span>
    </label>
  </fieldset>
</template>

<style scoped>
.pl-radio-group {
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}
.pl-radio-group--column {
  flex-direction: column;
}
.pl-radio-group--row {
  flex-direction: row;
  flex-wrap: wrap;
}
.pl-radio-group__legend {
  padding: 0;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pl-fg, #0f172a);
}
.pl-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.pl-radio--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.pl-radio__input {
  accent-color: var(--pl-accent, #6366f1);
  width: 16px;
  height: 16px;
}
.pl-radio__label {
  font-size: 14px;
  color: var(--pl-fg, #0f172a);
}
</style>
