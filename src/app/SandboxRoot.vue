<script setup lang="ts">
/**
 * Sandbox shell: sidebar menu + topbar + current page (SPEC §5, §7, §8).
 *
 * The role switcher ("Preview as <role>") and bottom Console panel are stubbed
 * minimally here; richer versions are later workers. In Interface mode the
 * sidebar/topbar frame the canvas; page selection swaps the canvas (SPEC §5).
 */
import { computed } from 'vue'
import { useSandboxStore } from '@/state'
import { EngineProvider, PageRenderer } from '@/engine'
import NavMenu from './NavMenu.vue'

const store = useSandboxStore()

const meta = computed(() => store.meta)
const page = computed(() => store.currentPage)
const engineKey = computed(() => (meta.value ? `${meta.value.id}:${store.mode}` : 'none'))

function navigate(pageId: string) {
  store.navigateTo(pageId)
}
</script>

<template>
  <div v-if="meta" class="pl-shell">
    <EngineProvider :key="engineKey" :meta="meta" :mode="store.mode">
      <aside class="pl-shell__sidebar">
        <div class="pl-shell__brand">{{ meta.name }}</div>
        <NavMenu
          :nodes="meta.menu"
          :role="store.role"
          :active-page="store.currentPageId"
          @navigate="navigate"
        />
      </aside>
      <div class="pl-shell__main">
        <header class="pl-shell__topbar">
          <span class="pl-shell__page">{{ page?.label ?? '—' }}</span>
          <span class="pl-shell__mode" :class="`pl-shell__mode--${store.mode}`">
            {{ store.mode }}
          </span>
        </header>
        <main class="pl-shell__canvas">
          <PageRenderer v-if="page" :page="page" />
          <div v-else class="pl-shell__empty">No page to display.</div>
        </main>
      </div>
    </EngineProvider>
  </div>
  <div v-else class="pl-shell__boot">Waiting for project meta…</div>
</template>

<style scoped>
.pl-shell {
  display: flex;
  min-height: 100vh;
  background: var(--pl-bg, #f8fafc);
  color: var(--pl-fg, #0f172a);
}
.pl-shell__sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--pl-surface, #ffffff);
  border-right: 1px solid var(--pl-border, #e2e8f0);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pl-shell__brand {
  font-size: 16px;
  font-weight: 700;
  padding: 4px 8px;
  color: var(--pl-fg, #0f172a);
}
.pl-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pl-shell__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 24px;
  border-bottom: 1px solid var(--pl-border, #e2e8f0);
  background: var(--pl-surface, #ffffff);
}
.pl-shell__page {
  font-weight: 600;
  font-size: 14px;
}
.pl-shell__mode {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
}
.pl-shell__mode--interface {
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 14%, transparent);
  color: var(--pl-accent, #6366f1);
}
.pl-shell__mode--preview {
  background: color-mix(in srgb, var(--pl-success, #16a34a) 16%, transparent);
  color: var(--pl-success, #16a34a);
}
.pl-shell__canvas {
  flex: 1;
  overflow: auto;
}
.pl-shell__empty,
.pl-shell__boot {
  padding: 48px;
  text-align: center;
  color: var(--pl-fg-muted, #64748b);
}
</style>
