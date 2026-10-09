<script setup lang="ts">
/**
 * Preview shell — the full application chrome (SPEC §5 Preview, §7).
 *
 * Left: role-filtered navigation menu rendered from the explicit `menu` tree.
 * Top: the "Preview as <role>" switcher. Center: the live canvas (PageRenderer),
 * which re-filters pages/blocks by `visible_to` the instant the role changes.
 * Below the canvas: the visual CRUD permission matrix for the active page.
 *
 * Mounted inside the engine scope (SandboxRoot's EngineProvider) in Preview
 * mode. The store is the single source of truth for the active role, so the
 * switcher also drives `ctx.user.role` for user code.
 */
import { computed, onMounted, watch } from 'vue'
import { useSandboxStore } from '@/state'
import { PageRenderer } from '@/engine'
import { filterMenuTree, isPageVisible, visiblePageIds } from '@/roles'
import RoleSwitcher from './RoleSwitcher.vue'
import PreviewMenu from './PreviewMenu.vue'
import PermissionsMatrix from './PermissionsMatrix.vue'

const store = useSandboxStore()

const meta = computed(() => store.meta)
const role = computed(() => store.role)
const roles = computed(() => store.roles)
const page = computed(() => store.currentPage)

/** Live, role-filtered menu tree (SPEC §7). Recomputes on every role change. */
const menu = computed(() => filterMenuTree(meta.value?.menu, role.value))

const pageVisible = computed(() => (page.value ? isPageVisible(page.value, role.value) : false))

const activeRole = computed({
  get: () => store.role,
  set: (next: string | null) => store.setRole(next),
})

function navigate(pageId: string) {
  store.navigateTo(pageId)
}

/**
 * Keep the canvas on a page the active role may actually see: when a role switch
 * hides the current page, hop to the first page still reachable via the menu.
 */
function ensureVisiblePage() {
  if (!meta.value) return
  if (page.value && isPageVisible(page.value, role.value)) return
  const reachable = visiblePageIds(meta.value.menu, role.value)
  const next = reachable[0] ?? meta.value.pages.find((p) => isPageVisible(p, role.value))?.id
  if (next) store.navigateTo(next)
}

// Default to the first defined role on entry so Preview demonstrates filtering
// rather than opening in the unfiltered "All roles" state.
onMounted(() => {
  if (store.role == null && roles.value.length) store.setRole(roles.value[0])
  ensureVisiblePage()
})

watch(role, () => ensureVisiblePage())
</script>

<template>
  <div v-if="meta" class="pl-preview">
    <aside class="pl-preview__sidebar">
      <div class="pl-preview__brand">
        <span class="pl-preview__brand-mark" aria-hidden="true" />
        <span class="pl-preview__brand-name">{{ meta.name }}</span>
      </div>
      <nav class="pl-preview__nav">
        <PreviewMenu :nodes="menu" :active-page="store.currentPageId" @navigate="navigate" />
        <p v-if="!menu.length" class="pl-preview__nav-empty">No pages for this role.</p>
      </nav>
    </aside>

    <div class="pl-preview__main">
      <header class="pl-preview__topbar">
        <div class="pl-preview__crumbs">
          <span class="pl-preview__crumb-app">{{ meta.name }}</span>
          <span class="pl-preview__crumb-sep">/</span>
          <span class="pl-preview__crumb-page">{{ page?.label ?? '—' }}</span>
        </div>
        <RoleSwitcher v-model="activeRole" :roles="roles" />
      </header>

      <main class="pl-preview__canvas">
        <PageRenderer v-if="page && pageVisible" :page="page" />
        <div v-else-if="page" class="pl-preview__blocked">
          <strong>{{ page.label }}</strong> is not visible to
          <em>{{ role ?? 'the current role' }}</em>.
        </div>
        <div v-else class="pl-preview__blocked">No page to display.</div>

        <PermissionsMatrix
          v-if="page && pageVisible"
          class="pl-preview__perm"
          :blocks="page.blocks"
          :role="role"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.pl-preview {
  display: flex;
  min-height: 100vh;
  background: var(--pl-bg, #f8fafc);
  color: var(--pl-fg, #0f172a);
}
.pl-preview__sidebar {
  width: 248px;
  flex-shrink: 0;
  background: var(--pl-surface, #ffffff);
  border-right: 1px solid var(--pl-border, #e2e8f0);
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.pl-preview__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
}
.pl-preview__brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--pl-accent, #6366f1), color-mix(in srgb, var(--pl-accent, #6366f1) 55%, #22d3ee));
}
.pl-preview__brand-name {
  font-size: 15px;
  font-weight: 700;
}
.pl-preview__nav-empty {
  margin: 8px 12px;
  font-size: 13px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-preview__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pl-preview__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--pl-border, #e2e8f0);
  background: var(--pl-surface, #ffffff);
}
.pl-preview__crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  min-width: 0;
}
.pl-preview__crumb-app {
  color: var(--pl-fg-muted, #64748b);
  font-weight: 600;
}
.pl-preview__crumb-sep {
  color: var(--pl-border, #cbd5e1);
}
.pl-preview__crumb-page {
  font-weight: 650;
  color: var(--pl-fg, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pl-preview__canvas {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}
.pl-preview__canvas > :deep(.pl-page) {
  padding: 0;
  max-width: none;
}
.pl-preview__blocked {
  padding: 48px;
  text-align: center;
  color: var(--pl-fg-muted, #64748b);
  font-size: 14px;
  border: 1px dashed var(--pl-border, #e2e8f0);
  border-radius: 12px;
}
.pl-preview__perm {
  margin-top: 4px;
}
</style>
