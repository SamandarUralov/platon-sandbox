<script setup lang="ts">
/**
 * Built-in block: `text` (SPEC §3 palette).
 * A typography primitive — heading / body / caption text. Semantic block (no
 * ui-kit atom exists for raw text); colour + size read from theme tokens.
 */
import { computed } from 'vue'

type TextVariant = 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption' | 'overline'

const props = defineProps<{
  text?: string
  /** Typographic role; also picks a sensible default tag. */
  variant?: TextVariant
  /** Override the rendered HTML tag. */
  as?: string
  align?: 'left' | 'center' | 'right'
  weight?: number | string
  /** Explicit colour (CSS value or theme token like `var(--pl-accent)`). */
  color?: string
  /** Render with the muted foreground token. */
  muted?: boolean
  /** Clamp to N lines with an ellipsis. */
  truncate?: number
}>()

const DEFAULT_TAG: Record<TextVariant, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  subtitle: 'p',
  body: 'p',
  caption: 'span',
  overline: 'span',
}

const variant = computed<TextVariant>(() => props.variant ?? 'body')
const tag = computed(() => props.as ?? DEFAULT_TAG[variant.value])

const style = computed(() => {
  const s: Record<string, string> = {}
  if (props.align) s.textAlign = props.align
  if (props.weight !== undefined) s.fontWeight = String(props.weight)
  if (props.color) s.color = props.color
  if (props.truncate && props.truncate > 0) {
    s.display = '-webkit-box'
    s.webkitLineClamp = String(props.truncate)
    s.webkitBoxOrient = 'vertical'
    s.overflow = 'hidden'
  }
  return s
})
</script>

<template>
  <component
    :is="tag"
    class="pl-text"
    :class="[`pl-text--${variant}`, { 'pl-text--muted': muted }]"
    :style="style"
  >
    <slot>{{ text }}</slot>
  </component>
</template>

<style scoped>
.pl-text {
  margin: 0;
  color: var(--pl-fg, #0f172a);
  font-family: inherit;
}
.pl-text--muted {
  color: var(--pl-fg-muted, #64748b);
}
.pl-text--h1 {
  font-size: 28px;
  font-weight: 680;
  line-height: 1.2;
}
.pl-text--h2 {
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
}
.pl-text--h3 {
  font-size: 18px;
  font-weight: 620;
  line-height: 1.3;
}
.pl-text--subtitle {
  font-size: 15px;
  font-weight: 500;
  color: var(--pl-fg-muted, #64748b);
}
.pl-text--body {
  font-size: 14px;
  line-height: 1.55;
}
.pl-text--caption {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-text--overline {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pl-fg-muted, #64748b);
}
</style>
