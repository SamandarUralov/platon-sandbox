<script setup lang="ts">
/**
 * Built-in block: `select` (SPEC §3 palette).
 * Composed from the ui-kit `Select` primitives (trigger/value/content/item).
 * `options` may be strings or `{ label, value }`. `v-model` + semantic `change`.
 */
import { computed } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platon-rs/platon-ui-kit'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

const props = defineProps<{
  modelValue?: string | number
  options?: (Option | string | number)[]
  placeholder?: string
  disabled?: boolean
  size?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const normalized = computed<Option[]>(() =>
  (props.options ?? []).map((o) =>
    typeof o === 'object' && o !== null ? o : { label: String(o), value: o },
  ),
)

function onUpdate(value: string | number) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <Select
    class="pl-select"
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="onUpdate"
  >
    <SelectTrigger :size="size">
      <SelectValue :placeholder="placeholder ?? 'Select…'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="opt in normalized"
        :key="String(opt.value)"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        {{ opt.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
