<script setup lang="ts">
/**
 * Built-in block: `breadcrumb` (Studio UI kit).
 * Where the page sits: `items` (string[] or a comma/newline separated string), the last one is
 * the current page. Earlier items are buttons emitting `click` with `{ index, label }`.
 */
import { computed } from 'vue'
import { listProp } from './blockUtils'

const props = defineProps<{ title?: string; items?: string[] | string }>()

const emit = defineEmits<{ (e: 'click', crumb: { index: number; label: string }): void }>()

const crumbs = computed(() => {
  const l = listProp(props.items)
  return l.length ? l : ['Home', 'Work orders', 'WO-1042']
})
</script>

<template>
  <nav class="pl-breadcrumb" aria-label="Breadcrumb">
    <ol class="pl-breadcrumb__list">
      <li v-for="(c, i) in crumbs" :key="i" class="pl-breadcrumb__item">
        <svg v-if="i" class="pl-breadcrumb__sep" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span v-if="i === crumbs.length - 1" class="pl-breadcrumb__current" aria-current="page">{{ c }}</span>
        <button v-else type="button" class="pl-breadcrumb__link" @click="emit('click', { index: i, label: c })">
          {{ c }}
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.pl-breadcrumb {
  font-size: 13px;
}
.pl-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-breadcrumb__item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pl-breadcrumb__sep {
  color: var(--pl-fg-muted, #64748b);
  opacity: 0.7;
}
.pl-breadcrumb__current {
  font-weight: 600;
  color: var(--pl-fg, #0f172a);
}
.pl-breadcrumb__link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--pl-fg-muted, #64748b);
  cursor: pointer;
}
.pl-breadcrumb__link:hover {
  color: var(--pl-accent, #6366f1);
  text-decoration: underline;
}
</style>
