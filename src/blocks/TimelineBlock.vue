<script setup lang="ts">
/**
 * Built-in block: `timeline` (Studio UI kit).
 * Activity in order. Studio's block has no data binding yet, so (like Studio's canvas) it shows
 * sample entries under the block `title`.
 */
defineProps<{ title?: string }>()

const ENTRIES = [
  { who: 'Sam Ortiz', what: 'completed WO-1042 · Boiler check', when: '10 min ago', tone: 'success' },
  { who: 'Dispatcher', what: 'assigned WO-1047 to Priya Nair', when: '1 h ago', tone: 'info' },
  { who: 'Northwind Clinics', what: 'requested a visit · Roof leak', when: '3 h ago', tone: 'warning' },
  { who: 'System', what: 'flagged WO-1031 as overdue', when: 'Yesterday', tone: 'error' },
]
</script>

<template>
  <div class="pl-timeline">
    <div v-if="title" class="pl-timeline__title">{{ title }}</div>
    <ol class="pl-timeline__list">
      <li v-for="(e, i) in ENTRIES" :key="i" class="pl-timeline__item">
        <span v-if="i < ENTRIES.length - 1" class="pl-timeline__line" />
        <span class="pl-timeline__dot" :class="`pl-timeline__dot--${e.tone}`">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
        </span>
        <span class="pl-timeline__body">
          <b>{{ e.who }}</b> <span class="pl-timeline__what">{{ e.what }}</span>
          <span class="pl-timeline__when">{{ e.when }}</span>
        </span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.pl-timeline {
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-timeline__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
}
.pl-timeline__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-timeline__item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
}
.pl-timeline__item:last-child {
  padding-bottom: 0;
}
.pl-timeline__line {
  position: absolute;
  top: 24px;
  bottom: 0;
  left: 11px;
  width: 1px;
  background: var(--pl-border, #e5e7eb);
}
.pl-timeline__dot {
  --tone: var(--pl-accent, #6366f1);
  z-index: 1;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 14%, var(--pl-surface, #ffffff));
}
.pl-timeline__dot--success {
  --tone: var(--pl-success, #16a34a);
}
.pl-timeline__dot--warning {
  --tone: var(--pl-warning, #b45309);
}
.pl-timeline__dot--error {
  --tone: var(--pl-danger, #dc2626);
}
.pl-timeline__body {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.pl-timeline__what {
  color: var(--pl-fg, #0f172a);
  opacity: 0.85;
}
.pl-timeline__when {
  display: block;
  font-size: 11.5px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
