<script setup lang="ts">
/**
 * Built-in block: `image` (SPEC §3 palette).
 * Responsive image with object-fit, optional caption + rounded corners. Semantic
 * block (no ui-kit atom for a plain image); surfaces click for action wiring.
 */
import { computed } from 'vue'

const props = defineProps<{
  src?: string
  alt?: string
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  width?: string | number
  height?: string | number
  /** Border radius (e.g. `12px`, `50%`). */
  radius?: string | number
  caption?: string
}>()

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

function dim(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined
  return typeof v === 'number' ? `${v}px` : v
}

const frameStyle = computed(() => ({
  width: dim(props.width),
  borderRadius: dim(props.radius),
}))

const imgStyle = computed(() => ({
  objectFit: props.fit ?? 'cover',
  height: dim(props.height),
  borderRadius: dim(props.radius),
}))

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>',
  )
</script>

<template>
  <figure class="pl-image" :style="frameStyle">
    <img
      class="pl-image__img"
      :src="src || PLACEHOLDER"
      :alt="alt ?? caption ?? ''"
      :style="imgStyle"
      @click="emit('click', $event)"
    />
    <figcaption v-if="caption" class="pl-image__caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.pl-image {
  margin: 0;
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  max-width: 100%;
}
.pl-image__img {
  display: block;
  width: 100%;
  max-width: 100%;
  background: var(--pl-surface-muted, #f1f5f9);
}
.pl-image__caption {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
  text-align: center;
}
</style>
