<script lang="ts">
/**
 * Bottom console / error panel for the mock-studio playground (SPEC §9).
 *
 * Shows the stream of Sandbox → Studio `console` / `error` messages plus local
 * protocol events (ready, block-selected, …) and the playground's own meta-JSON
 * validation errors, so the whole runtime can be exercised without the Studio.
 */
export interface LogEntry {
  id: number
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'event'
  text: string
  source?: string
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ entries: LogEntry[] }>()
const emit = defineEmits<{ (e: 'clear'): void }>()

const filter = ref<'all' | 'error' | 'event'>('all')

const visible = computed(() =>
  props.entries.filter((e) => {
    if (filter.value === 'all') return true
    if (filter.value === 'error') return e.level === 'error' || e.level === 'warn'
    return e.level === 'event'
  }),
)

const errorCount = computed(() => props.entries.filter((e) => e.level === 'error').length)
</script>

<template>
  <section class="pg-console" data-testid="console-panel">
    <header class="pg-console__bar">
      <strong class="pg-console__title">Console</strong>
      <span v-if="errorCount" class="pg-console__errors" data-testid="console-error-count">
        {{ errorCount }} error{{ errorCount === 1 ? '' : 's' }}
      </span>
      <div class="pg-console__filters">
        <button
          v-for="f in (['all', 'error', 'event'] as const)"
          :key="f"
          type="button"
          class="pg-console__filter"
          :class="{ 'pg-console__filter--active': filter === f }"
          :data-testid="`console-filter-${f}`"
          @click="filter = f"
        >
          {{ f }}
        </button>
      </div>
      <button type="button" class="pg-console__clear" data-testid="console-clear" @click="emit('clear')">
        Clear
      </button>
    </header>
    <ol class="pg-console__log">
      <li
        v-for="entry in visible"
        :key="entry.id"
        class="pg-console__row"
        :class="`pg-console__row--${entry.level}`"
        data-testid="console-row"
      >
        <span class="pg-console__level">{{ entry.level }}</span>
        <span class="pg-console__text">{{ entry.text }}</span>
        <span v-if="entry.source" class="pg-console__source">{{ entry.source }}</span>
      </li>
      <li v-if="!visible.length" class="pg-console__empty">No messages.</li>
    </ol>
  </section>
</template>

<style scoped>
.pg-console {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0b1120;
  color: #e2e8f0;
  border-top: 1px solid #1e293b;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.pg-console__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.pg-console__title {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}
.pg-console__errors {
  color: #f87171;
  font-weight: 700;
}
.pg-console__filters {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.pg-console__filter {
  border: 1px solid #1e293b;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  text-transform: capitalize;
  font: inherit;
}
.pg-console__filter--active {
  background: #1e293b;
  color: #e2e8f0;
}
.pg-console__clear {
  border: 1px solid #1e293b;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font: inherit;
}
.pg-console__log {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow: auto;
  flex: 1;
}
.pg-console__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.5);
  white-space: pre-wrap;
  word-break: break-word;
}
.pg-console__level {
  flex-shrink: 0;
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 700;
  width: 42px;
  color: #64748b;
}
.pg-console__row--error .pg-console__level,
.pg-console__row--error .pg-console__text {
  color: #f87171;
}
.pg-console__row--warn .pg-console__level,
.pg-console__row--warn .pg-console__text {
  color: #fbbf24;
}
.pg-console__row--event .pg-console__level {
  color: #38bdf8;
}
.pg-console__text {
  flex: 1;
}
.pg-console__source {
  color: #64748b;
  flex-shrink: 0;
}
.pg-console__empty {
  padding: 12px;
  color: #475569;
  text-align: center;
}
</style>
