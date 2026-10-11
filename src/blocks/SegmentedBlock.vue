<script setup lang="ts">
/**
 * Built-in block: `segmented` (Studio UI kit).
 * Options as a button group via the ui-kit `MultiselectButton`: `title` (label), `options`
 * (string[] or a list string), `variant`, `outlined` (default true), `multiple` (default false)
 * and `size`. Emits `change` with the picked value (or values when `multiple`) and
 * `update:modelValue` with the raw selection array.
 */
import { computed, ref } from 'vue'
import { MultiselectButton } from '@platon-rs/platon-ui-kit'
import { KIT_VARIANTS, listProp, oneOf } from './blockUtils'

const props = defineProps<{
  title?: string
  options?: string[] | string
  variant?: string
  outlined?: boolean
  multiple?: boolean
  size?: string
}>()

const emit = defineEmits<{
  (e: 'change', value: string | string[] | undefined): void
  (e: 'update:modelValue', value: string[]): void
}>()

const opts = computed(() => {
  const o = listProp(props.options)
  return (o.length ? o : ['Low', 'Normal', 'High', 'Urgent']).map((v) => ({ value: v, label: v }))
})
const variant = computed(() => oneOf(props.variant, KIT_VARIANTS, 'primary'))
const size = computed(() => oneOf(props.size, ['small-x', 'small', 'medium', 'large', 'large-x'] as const, 'medium'))
const picked = ref<string[]>([])

function onPick(v: string[]) {
  picked.value = v
  emit('update:modelValue', v)
  emit('change', props.multiple === true ? [...v] : v[0])
}
</script>

<template>
  <div class="pl-segmented">
    <div v-if="title" class="pl-segmented__label">{{ title }}</div>
    <MultiselectButton
      :model-value="picked"
      :options="opts"
      :multiple="multiple === true"
      :outlined="outlined !== false"
      :variant="variant"
      :size="size"
      @update:model-value="onPick"
    />
  </div>
</template>

<style scoped>
.pl-segmented {
  min-width: 0;
}
.pl-segmented__label {
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pl-fg, #0f172a);
}
</style>
