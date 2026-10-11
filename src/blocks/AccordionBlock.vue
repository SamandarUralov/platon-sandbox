<script setup lang="ts">
/**
 * Built-in container: `accordion` (Studio UI kit).
 * Studio sends one child `column` node per panel, in order; `panels` holds the labels (string[]
 * or a list string), `open` which panels start open ('first' | 'all' | 'none'), `multiple`
 * whether several may be open at once, plus `title` and `gap` (px).
 *
 * Interface (edit overlay): every panel is rendered open, stacked under its label, so every cell
 * stays visible and droppable. Preview: a real accordion; toggling emits `change` with the open
 * panel indexes.
 */
import { ref, useSlots, watch } from 'vue'
import { listProp, num, RenderNode, slotNodes, str, useEditMode } from './blockUtils'

const props = defineProps<{
  title?: string
  panels?: string[] | string
  open?: string
  multiple?: boolean
  gap?: number | string
}>()

const emit = defineEmits<{ (e: 'change', open: number[]): void }>()

const slots = useSlots()
const editing = useEditMode()

const nodes = () => slotNodes(slots.default?.())
const labelsFor = (count: number) => {
  const l = listProp(props.panels)
  const base = l.length ? l : ['Section 1', 'Section 2', 'Section 3']
  return Array.from({ length: Math.max(base.length, count) }, (_, i) => base[i] ?? `Section ${i + 1}`)
}

const startOpen = (): number[] => {
  const o = str(props.open, 'first')
  if (o === 'all') return labelsFor(0).map((_, i) => i)
  return o === 'none' ? [] : [0]
}
const opened = ref<number[]>(startOpen())
watch(
  () => [props.open, props.panels],
  () => (opened.value = startOpen()),
)

function toggle(i: number) {
  const isOpen = opened.value.includes(i)
  if (props.multiple === true) opened.value = isOpen ? opened.value.filter((x) => x !== i) : [...opened.value, i]
  else opened.value = isOpen ? [] : [i]
  emit('change', [...opened.value])
}
</script>

<template>
  <!-- One slot call per render: `list` holds this render's panel vnodes. -->
  <section
    v-for="list in [nodes()]"
    :key="'panels'"
    class="pl-accordion"
    :class="{ 'pl-accordion--edit': editing }"
  >
    <div v-if="title" class="pl-accordion__title">{{ title }}</div>
    <div v-for="(label, i) in labelsFor(list.length)" :key="i" class="pl-accordion__panel" :data-panel="i">
      <div v-if="editing" class="pl-accordion__head pl-accordion__head--static">
        <span class="pl-accordion__label">{{ label }}</span>
      </div>
      <button
        v-else
        type="button"
        class="pl-accordion__head"
        :aria-expanded="opened.includes(i)"
        @click.stop="toggle(i)"
      >
        <span class="pl-accordion__label">{{ label }}</span>
        <svg
          class="pl-accordion__chev"
          :class="{ 'pl-accordion__chev--open': opened.includes(i) }"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <div
        v-show="editing || opened.includes(i)"
        class="pl-accordion__body"
        :style="{ paddingBottom: `${Math.max(8, num(gap, 16))}px` }"
      >
        <RenderNode v-if="list[i]" :node="list[i]!" />
        <div v-else class="pl-accordion__empty">Empty panel</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pl-accordion {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-accordion__title {
  padding: 12px 16px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
  font-size: 14px;
  font-weight: 700;
}
.pl-accordion__panel + .pl-accordion__panel {
  border-top: 1px solid var(--pl-border, #e5e7eb);
}
.pl-accordion__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.pl-accordion__head:hover {
  background: color-mix(in srgb, var(--pl-fg-muted, #64748b) 7%, transparent);
}
.pl-accordion__head--static {
  cursor: default;
}
.pl-accordion__head--static:hover {
  background: none;
}
.pl-accordion__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pl-accordion__chev {
  flex-shrink: 0;
  color: var(--pl-fg-muted, #64748b);
  transition: transform 0.15s ease;
}
.pl-accordion__chev--open {
  transform: rotate(180deg);
}
.pl-accordion__body {
  padding: 4px 16px 16px;
}
.pl-accordion__empty {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
