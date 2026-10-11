<script setup lang="ts">
/**
 * Built-in block: `steps` (Studio UI kit).
 * Multi-step progress: `steps` (labels, string[] or a list string) and `current` (0-based index
 * of the active step). Back / Next move the step (inner UI state) and emit `change` with it.
 */
import { computed, ref, watch } from 'vue'
import { listProp, num } from './blockUtils'

const props = defineProps<{
  title?: string
  steps?: string[] | string
  current?: number | string
}>()

const emit = defineEmits<{ (e: 'change', step: number): void }>()

const labels = computed(() => {
  const l = listProp(props.steps)
  return l.length ? l : ['Requested', 'Scheduled', 'In progress', 'Done']
})
const clamp = (i: number) => Math.max(0, Math.min(labels.value.length - 1, Math.round(i)))
const step = ref(clamp(num(props.current, 1)))
watch(
  () => [props.current, labels.value.length],
  () => (step.value = clamp(num(props.current, 1))),
)

function go(i: number) {
  step.value = clamp(i)
  emit('change', step.value)
}
</script>

<template>
  <div class="pl-steps">
    <div v-if="title" class="pl-steps__title">{{ title }}</div>
    <div class="pl-steps__track">
      <template v-for="(l, i) in labels" :key="i">
        <div class="pl-steps__step" :class="{ 'pl-steps__step--done': i <= step }">
          <span class="pl-steps__dot">
            <svg v-if="i < step" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="pl-steps__label">{{ l }}</span>
        </div>
        <span v-if="i < labels.length - 1" class="pl-steps__bar" :class="{ 'pl-steps__bar--done': i < step }" />
      </template>
    </div>
    <div class="pl-steps__actions">
      <button type="button" class="pl-steps__btn" :disabled="step === 0" @click.stop="go(step - 1)">Back</button>
      <button
        type="button"
        class="pl-steps__btn pl-steps__btn--primary"
        :disabled="step >= labels.length - 1"
        @click.stop="go(step + 1)"
      >
        Next step
      </button>
    </div>
  </div>
</template>

<style scoped>
.pl-steps {
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-steps__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
}
.pl-steps__track {
  display: flex;
  align-items: center;
  overflow-x: auto;
}
.pl-steps__step {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-steps__step--done {
  color: var(--pl-fg, #0f172a);
}
.pl-steps__dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid var(--pl-border, #e5e7eb);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.pl-steps__step--done .pl-steps__dot {
  border-color: var(--pl-accent, #6366f1);
  background: var(--pl-accent, #6366f1);
  color: #ffffff;
}
.pl-steps__label {
  font-size: 12.5px;
  font-weight: 600;
}
.pl-steps__bar {
  flex: 1;
  min-width: 16px;
  height: 2px;
  margin: 0 8px;
  border-radius: 2px;
  background: var(--pl-border, #e5e7eb);
}
.pl-steps__bar--done {
  background: var(--pl-accent, #6366f1);
}
.pl-steps__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.pl-steps__btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 8px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.pl-steps__btn--primary {
  border-color: var(--pl-accent, #6366f1);
  background: var(--pl-accent, #6366f1);
  color: #ffffff;
}
.pl-steps__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
