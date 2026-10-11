<script setup lang="ts">
/**
 * Built-in container: `tabs` (Studio UI kit).
 * Studio sends one child `column` node per tab, in order; `tabs` holds the labels (string[] or a
 * list string), `position` is top/bottom/left/right, `active` the initially open tab index and
 * `gap` (px) the spacing between stacked panels.
 *
 * Interface (edit overlay): every panel is rendered stacked under its label so every cell stays
 * visible and droppable. Preview: real tabs via the ui-kit `TabsContainer`, showing only the
 * active tab's child; switching emits `change` with the tab index.
 */
import { computed, ref, useSlots, watch } from 'vue'
import { TabsContainer } from '@platon-rs/platon-ui-kit'
import { listProp, num, oneOf, RenderNode, slotNodes, str, useEditMode } from './blockUtils'

const props = defineProps<{
  title?: string
  tabs?: string[] | string
  position?: string
  active?: number | string
  gap?: number | string
}>()

const emit = defineEmits<{ (e: 'change', index: number): void }>()

const slots = useSlots()
const editing = useEditMode()

const panels = () => slotNodes(slots.default?.())
const labelsFor = (count: number) => {
  const l = listProp(props.tabs)
  const base = l.length ? l : ['Details', 'Parts', 'Photos']
  return Array.from({ length: Math.max(base.length, count) }, (_, i) => base[i] ?? `Tab ${i + 1}`)
}

const position = computed(() => oneOf(props.position, ['top', 'bottom', 'left', 'right'] as const, 'top'))
const gap = computed(() => `${Math.max(0, num(props.gap, 16))}px`)
const current = ref(String(Math.max(0, Math.round(num(props.active, 0)))))
watch(
  () => props.active,
  () => (current.value = String(Math.max(0, Math.round(num(props.active, 0))))),
)

function onTab(v: unknown) {
  current.value = String(v)
  emit('change', Number(v))
}
</script>

<template>
  <!-- One slot call per render: `list` holds this render's panel vnodes. -->
  <template v-for="list in [panels()]" :key="'panels'">
    <!-- Interface: all panels stacked, each under its label. -->
    <section v-if="editing" class="pl-tabs pl-tabs--edit" :style="{ gap }">
      <div v-if="title" class="pl-tabs__title">{{ title }}</div>
      <div v-for="(label, i) in labelsFor(list.length)" :key="i" class="pl-tabs__panel" :data-panel="i">
        <div class="pl-tabs__panel-label"><span class="pl-tabs__chip">Tab</span>{{ label }}</div>
        <div class="pl-tabs__panel-body">
          <RenderNode v-if="list[i]" :node="list[i]!" />
          <div v-else class="pl-tabs__empty">Empty tab</div>
        </div>
      </div>
    </section>

    <!-- Preview: real tabs, one child per tab. -->
    <section v-else class="pl-tabs">
      <TabsContainer
        :model-value="current"
        :tabs="labelsFor(list.length).map((label, i) => ({ value: String(i), label }))"
        :position="position"
        :label="str(title) || 'Tabs'"
        @update:model-value="onTab"
      >
        <template #content="{ tab, active }">
          <div v-if="active" class="pl-tabs__content" :data-panel="tab.value">
            <RenderNode v-if="list[Number(tab.value)]" :node="list[Number(tab.value)]!" />
            <div v-else class="pl-tabs__empty">Empty tab</div>
          </div>
        </template>
      </TabsContainer>
    </section>
  </template>
</template>

<style scoped>
.pl-tabs {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  color: var(--pl-fg, #0f172a);
}
.pl-tabs--edit {
  padding: 12px;
}
.pl-tabs__title {
  font-size: 14px;
  font-weight: 700;
}
.pl-tabs__panel {
  min-width: 0;
  border: 1px dashed var(--pl-border, #e5e7eb);
  border-radius: 10px;
}
.pl-tabs__panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px dashed var(--pl-border, #e5e7eb);
  font-size: 12.5px;
  font-weight: 600;
}
.pl-tabs__chip {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pl-accent, #6366f1);
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 12%, transparent);
}
.pl-tabs__panel-body,
.pl-tabs__content {
  padding: 12px;
}
.pl-tabs__content {
  padding: 16px;
}
.pl-tabs__empty {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
