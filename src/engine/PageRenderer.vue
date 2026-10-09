<script setup lang="ts">
/**
 * Page renderer (SPEC §8). Renders a page's top-level blocks; nested children
 * are handled recursively by BlockRenderer. v1 layout is a fluid single column
 * / responsive grid (per-breakpoint layout is OPEN, deferred).
 */
import { computed } from 'vue'
import type { PageMeta } from '@/contracts'
import { isVisibleToRole } from './roles'
import { useSandboxStore } from '@/state'
import { useCapabilities } from './mode'
import BlockRenderer from './BlockRenderer.vue'

const props = defineProps<{ page: PageMeta }>()
const store = useSandboxStore()
const caps = useCapabilities()

const blocks = computed(() => props.page.blocks ?? [])

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
