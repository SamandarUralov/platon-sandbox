<script setup lang="ts">
/**
 * Built-in layout container: `card` (SPEC §8 nested tree).
 * A surface with optional title/subtitle header and a footer slot. `children[]`
 * render into the default slot (card body) via the recursive renderer.
 */
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  subtitle?: string
  /** Inner padding (px). */
  padding?: number
  /** Drop the surface border/shadow (bare grouping). */
  flat?: boolean
}>()

const bodyStyle = computed(() => ({ padding: `${props.padding ?? 20}px` }))
</script>

<template>
  <section class="pl-card" :class="{ 'pl-card--flat': flat }">
    <header v-if="title || subtitle || $slots.header" class="pl-card__header">
      <slot name="header">
        <h3 v-if="title" class="pl-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="pl-card__subtitle">{{ subtitle }}</p>
      </slot>
    </header>

    <div class="pl-card__body" :style="bodyStyle">
      <!-- Nested child blocks render here (SPEC §8). -->
      <slot />
    </div>

    <footer v-if="$slots.footer" class="pl-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.pl-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  overflow: hidden;
}
.pl-card--flat {
  border: 0;
  background: transparent;
}
.pl-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
}
.pl-card--flat .pl-card__header {
  border-bottom: 0;
  padding-left: 0;
  padding-right: 0;
}
.pl-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 640;
  color: var(--pl-fg, #0f172a);
}
.pl-card__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pl-card--flat .pl-card__body {
  padding-left: 0;
  padding-right: 0;
}
.pl-card__footer {
  padding: 14px 20px;
  border-top: 1px solid var(--pl-border, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
