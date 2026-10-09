<script setup lang="ts">
/**
 * Preview navigation menu (SPEC §2 MenuNode, §7).
 *
 * Renders the explicit, studio-managed `menu` tree recursively. The tree handed
 * in is already role-filtered by the shell (`filterMenuTree`), so this component
 * is purely presentational: group nodes render as section headers, leaf nodes
 * (with a `page`) render as navigable buttons.
 */
import type { MenuNode } from '@/contracts'

defineProps<{ nodes: MenuNode[]; activePage: string | null; depth?: number }>()
const emit = defineEmits<{ (e: 'navigate', pageId: string): void }>()
</script>

<template>
  <ul class="pl-menu" :class="{ 'pl-menu--nested': (depth ?? 0) > 0 }">
    <li v-for="node in nodes" :key="node.id" class="pl-menu__item">
      <button
        v-if="node.page"
        type="button"
        class="pl-menu__link"
        :class="{ 'pl-menu__link--active': node.page === activePage }"
        @click="emit('navigate', node.page!)"
      >
        <span v-if="node.icon" class="pl-menu__icon" aria-hidden="true" />
        <span class="pl-menu__text">{{ node.label }}</span>
      </button>
      <div v-else class="pl-menu__group">{{ node.label }}</div>
      <PreviewMenu
        v-if="node.children?.length"
        :nodes="node.children"
        :active-page="activePage"
        :depth="(depth ?? 0) + 1"
        @navigate="(p) => emit('navigate', p)"
      />
    </li>
  </ul>
</template>

<style scoped>
.pl-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pl-menu--nested {
  margin-left: 10px;
  padding-left: 8px;
  border-left: 1px solid var(--pl-border, #e2e8f0);
}
.pl-menu__link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--pl-fg, #0f172a);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}
.pl-menu__link:hover {
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 9%, transparent);
}
.pl-menu__link--active {
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 15%, transparent);
  color: var(--pl-accent, #6366f1);
  font-weight: 650;
}
.pl-menu__icon {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.55;
  flex-shrink: 0;
}
.pl-menu__group {
  padding: 10px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pl-fg-muted, #64748b);
}
</style>
