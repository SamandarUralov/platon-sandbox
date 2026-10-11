<script setup lang="ts">
/**
 * Built-in block: `badge` (Studio UI kit).
 * Wrapper over the ui-kit `Badge` atom: `text`, `variant` (primary/secondary/info/success/
 * warning/error) and `size` (sm/md/lg). Emits `click`.
 */
import { computed } from 'vue'
import { Badge } from '@platon-rs/platon-ui-kit'
import { KIT_VARIANTS, oneOf, str } from './blockUtils'

const props = defineProps<{
  title?: string
  text?: string
  variant?: string
  size?: string
}>()

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const variant = computed(() => oneOf(props.variant, KIT_VARIANTS, 'primary'))
const size = computed(() => oneOf(props.size, ['sm', 'md', 'lg'] as const, 'md'))
const label = computed(() => str(props.text) || 'New')
</script>

<template>
  <div class="pl-badge">
    <Badge :variant="variant" :size="size" @click="emit('click', $event)">{{ label }}</Badge>
  </div>
</template>

<style scoped>
.pl-badge {
  display: flex;
  cursor: default;
}
</style>
