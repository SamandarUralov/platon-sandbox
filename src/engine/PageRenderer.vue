<script setup lang="ts">
/**
 * Page renderer (SPEC §8). Renders a page's top-level blocks; nested children
 * are handled recursively by BlockRenderer. v1 layout is a fluid single column
 * / responsive grid (per-breakpoint layout is OPEN, deferred).
 */
import { computed, onBeforeUnmount, provide, reactive, watch } from 'vue'
import type { Ctx, PageMeta } from '@/contracts'
import { isVisibleToRole } from './roles'
import { useSandboxStore } from '@/state'
import { useCapabilities } from './mode'
import { useEngine } from './engine'
import { useHost } from './host'
import { buildCtx, CtxKey } from './ctx'
import { createLifecycleRunner, type LifecycleRunner } from './lifecycle'
import BlockRenderer from './BlockRenderer.vue'

const props = defineProps<{ page: PageMeta }>()
const store = useSandboxStore()
const caps = useCapabilities()
const engine = useEngine()
const host = useHost()

const blocks = computed(() => props.page.blocks ?? [])

// Page-scoped reactive state bag for `ctx.state.page` (reset on page change).
const pageState = reactive<Record<string, unknown>>({})

// A page-scoped `ctx` (SPEC §4), provided to the whole block tree.
const ctx: Ctx = buildCtx({
  engine,
  pageState,
  navigate: (to) => store.navigateTo(to),
  emit: (event, payload) => host.reportConsole('info', [`[emit] ${event}`, payload]),
})
provide(CtxKey, ctx)

// The runner for the page currently mounted (captures that page's lifecycle).
let activeRunner: LifecycleRunner | null = null

function enterPage(): void {
  if (!caps.value.lifecycle) return // SPEC §5: lifecycle OFF in Interface.
  for (const k of Object.keys(pageState)) delete pageState[k] // fresh page state
  const runner = createLifecycleRunner({
    logic: engine.logic,
    lifecycle: props.page.lifecycle,
    pageId: props.page.id,
    onError: (error, source) =>
      host.reportError({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        pageId: props.page.id,
        ...(source ? { blockId: source } : {}),
      }),
  })
  activeRunner = runner
  void runner.runInit(ctx) // onPageInit → onBeforeRender → onPageReady (SPEC §4)
}

function leavePage(): void {
  const runner = activeRunner
  activeRunner = null
  if (runner) void runner.runLeave(ctx) // onBeforeLeave → onPageLeave
}

// On page swap: leave the previous page, then enter the new one.
watch(
  () => props.page.id,
  (_id, prev) => {
    if (prev !== undefined) leavePage()
    enterPage()
  },
  { immediate: true },
)

onBeforeUnmount(leavePage)

function onBackgroundClick() {
  if (caps.value.editOverlay) store.selectBlock(null)
}
</script>

<template>
  <div class="pl-page" @click="onBackgroundClick">
    <template v-if="isVisibleToRole(page.visible_to, store.role)">
      <BlockRenderer v-for="block in blocks" :key="block.id" :block="block" />
    </template>
    <div v-else class="pl-page__hidden">
      This page is not visible to the current role.
    </div>
  </div>
</template>

<style scoped>
.pl-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.pl-page__hidden {
  padding: 40px;
  text-align: center;
  color: var(--pl-fg-muted, #64748b);
  font-size: 14px;
}
</style>
