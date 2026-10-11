<script setup lang="ts">
/**
 * Built-in block: `alert` (Studio UI kit).
 * A highlighted message: `title`, `text` and `variant` (info/success/warning/error, default
 * warning). It can be dismissed (inner UI state) and shown again.
 */
import { computed, ref } from 'vue'
import { oneOf, str } from './blockUtils'

const props = defineProps<{
  title?: string
  text?: string
  variant?: string
}>()

const VARIANTS = ['info', 'success', 'warning', 'error'] as const
const variant = computed(() => oneOf(props.variant, VARIANTS, 'warning'))
const heading = computed(() => str(props.title) || 'Heads up')
const dismissed = ref(false)

/** Lucide-style glyph paths per variant. */
const ICON: Record<(typeof VARIANTS)[number], string> = {
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  success: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9 12l2 2 4-4',
  warning: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6',
}
</script>

<template>
  <div class="pl-alert-wrap">
    <div v-if="!dismissed" class="pl-alert" :class="`pl-alert--${variant}`" role="alert">
      <svg class="pl-alert__icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path :d="ICON[variant]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="pl-alert__body">
        <div class="pl-alert__title">{{ heading }}</div>
        <div v-if="text" class="pl-alert__text">{{ text }}</div>
      </div>
      <button type="button" class="pl-alert__close" aria-label="Dismiss" @click.stop="dismissed = true">×</button>
    </div>
    <button v-else type="button" class="pl-alert__restore" @click.stop="dismissed = false">
      Alert dismissed · show again
    </button>
  </div>
</template>

<style scoped>
.pl-alert {
  --tone: var(--pl-warning, #b45309);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 11%, var(--pl-surface, #ffffff));
  border: 1px solid color-mix(in srgb, var(--tone) 24%, transparent);
}
.pl-alert--info {
  --tone: var(--pl-accent, #6366f1);
}
.pl-alert--success {
  --tone: var(--pl-success, #16a34a);
}
.pl-alert--error {
  --tone: var(--pl-danger, #dc2626);
}
.pl-alert__icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.pl-alert__body {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.pl-alert__title {
  font-weight: 700;
}
.pl-alert__text {
  opacity: 0.9;
  color: var(--pl-fg, #0f172a);
}
.pl-alert__close {
  padding: 0 2px;
  border: 0;
  background: none;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  opacity: 0.7;
  cursor: pointer;
}
.pl-alert__close:hover {
  opacity: 1;
}
.pl-alert__restore {
  padding: 0;
  border: 0;
  background: none;
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
  text-decoration: underline;
  cursor: pointer;
}
</style>
