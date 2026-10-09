<script setup lang="ts">
/**
 * Recursive block renderer (SPEC §8, the interpreter core).
 *
 * For one block it:
 *  1. validates it (zod) — invalid ⇒ skip + warn, siblings keep rendering (§9);
 *  2. applies role visibility (`visible_to`, §7);
 *  3. resolves the component from the registry (unknown ⇒ FallbackUnknown, §3);
 *  4. resolves data binding (`query`) via the engine (mock in Interface, §6);
 *  5. renders inside a per-block error boundary (§9);
 *  6. recurses over `children[]` in the component's default slot (§8);
 *  7. in Interface mode, wires the edit overlay (select/hover, §5).
 */
import { computed } from 'vue'
import type { Block } from '@/contracts'
import { safeParseBlock } from '@/contracts'
import { useEngine } from './engine'
import { useCapabilities } from './mode'
import { useHost } from './host'
import { isVisibleToRole } from './roles'
import { useSandboxStore } from '@/state'
import BlockErrorBoundary from './BlockErrorBoundary.vue'

const props = defineProps<{ block: Block }>()

const engine = useEngine()
const caps = useCapabilities()
const host = useHost()
const store = useSandboxStore()

/** zod validation (SPEC §9). Invalid ⇒ render nothing + warn once. */
const validation = computed(() => safeParseBlock(props.block))
const valid = computed(() => validation.value.success)

const visible = computed(() => isVisibleToRole(props.block.visible_to, store.role))

const component = computed(() => engine.registry.resolve(props.block.component))
const isUnknown = computed(() => !engine.registry.has(props.block.component))

/** Resolve `query` data for Interface mode (mock store); undefined otherwise. */
const queryData = computed(() => {
  if (!props.block.query) return undefined
  if (caps.value.dataLive) return undefined // Preview resolves live (later worker).
  try {
    return engine.query.runSync(props.block.query)
  } catch (err) {
    host.reportError({
      message: `query failed for block ${props.block.id}: ${String(err)}`,
      blockId: props.block.id,
    })
    return { rows: [], count: 0 }
  }
})

/** Columns from the data model, when the query targets a known table. */
const queryColumns = computed(() => {
  const q = props.block.query
  if (!q || caps.value.dataLive) return undefined
  const table = typeof q === 'string' ? undefined : q.table
  if (!table) return undefined
  const cols = engine.dataSource.columns(table)
  return cols.length ? cols.map((c) => ({ key: c.name })) : undefined
})

/** Final props handed to the resolved component. */
const finalProps = computed<Record<string, unknown>>(() => {
  const base: Record<string, unknown> = { ...(props.block.props ?? {}) }
  if (isUnknown.value) {
    base.component = props.block.component
    base.blockId = props.block.id
  }
  if (props.block.items && base.items === undefined) base.items = props.block.items
  if (queryData.value) {
    if (base.rows === undefined) base.rows = queryData.value.rows
    base.count = queryData.value.count
    if (base.columns === undefined && queryColumns.value) base.columns = queryColumns.value
  }
  return base
})

const children = computed<Block[]>(() => props.block.children ?? [])

const overlayActive = computed(() => caps.value.editOverlay)
const isSelected = computed(() => store.selectedBlockId === props.block.id)
const isHover = computed(() => store.hoverBlockId === props.block.id)

function onSelect(ev: MouseEvent) {
  if (!overlayActive.value) return
  ev.stopPropagation()
  store.selectBlock(props.block.id)
  host.selectBlock(props.block.id)
}
function onEnter() {
  if (!overlayActive.value) return
  store.hoverBlock(props.block.id)
  host.hoverBlock(props.block.id)
}
function onLeave() {
  if (!overlayActive.value) return
  if (store.hoverBlockId === props.block.id) {
    store.hoverBlock(null)
    host.hoverBlock(null)
  }
}

function onBlockError({ blockId, error }: { blockId: string; error: unknown }) {
  host.reportError({
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    blockId,
  })
}

// Warn once for invalid blocks (SPEC §9).
if (!valid.value) {
  const issues = validation.value.success ? '' : validation.value.error.message
  host.reportConsole('warn', [`[renderer] skipping invalid block`, props.block, issues])
}
</script>

<template>
  <template v-if="valid && visible">
    <div
      class="pl-block"
      :class="{
        'pl-block--overlay': overlayActive,
        'pl-block--selected': overlayActive && isSelected,
        'pl-block--hover': overlayActive && isHover,
      }"
      :data-block-id="block.id"
      :data-component="block.component"
      @click="onSelect"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      <BlockErrorBoundary :block-id="block.id" :component="block.component" @block-error="onBlockError">
        <component :is="component" v-bind="finalProps">
          <!-- Recurse over children (SPEC §8). -->
          <BlockRenderer v-for="child in children" :key="child.id" :block="child" />
        </component>
      </BlockErrorBoundary>
    </div>
  </template>
</template>

<style scoped>
.pl-block {
  position: relative;
}
.pl-block--overlay {
  cursor: pointer;
  border-radius: 10px;
  transition: box-shadow 0.12s ease;
}
.pl-block--overlay.pl-block--hover {
  box-shadow: 0 0 0 1px var(--pl-accent, #6366f1);
}
.pl-block--overlay.pl-block--selected {
  box-shadow: 0 0 0 2px var(--pl-accent, #6366f1);
}
</style>
