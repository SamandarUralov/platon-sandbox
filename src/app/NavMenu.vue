<script setup lang="ts">
/**
 * Recursive navigation menu (SPEC §7) rendered from the explicit `menu` tree,
 * filtered by the active role.
 */
import type { MenuNode } from '@/contracts'
import { isVisibleToRole } from '@/engine'

defineProps<{ nodes: MenuNode[]; role: string | null; activePage: string | null }>()
const emit = defineEmits<{ (e: 'navigate', pageId: string): void }>()
</script>

<template>
  <ul class="pl-nav">
    <template v-for="node in nodes" :key="node.id">
      <li v-if="isVisibleToRole(node.visible_to, role)" class="pl-nav__item">
        <button
          v-if="node.page"
          type="button"
          class="pl-nav__link"
          :class="{ 'pl-nav__link--active': node.page === activePage }"
          @click="emit('navigate', node.page!)"
        >
          {{ node.label }}
        </button>
        <span v-else class="pl-nav__group">{{ node.label }}</span>
        <NavMenu
          v-if="node.children?.length"
          :nodes="node.children"
          :role="role"
          :active-page="activePage"
          @navigate="(p) => emit('navigate', p)"
        />
      </li>
    </template>
  </ul>
</template>

<style scoped>
.pl-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pl-nav .pl-nav {
  padding-left: 12px;
}
.pl-nav__link,
.pl-nav__group {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--pl-fg, #0f172a);
  border: none;
  background: transparent;
  cursor: pointer;
}
.pl-nav__group {
  cursor: default;
  font-weight: 600;
  color: var(--pl-fg-muted, #64748b);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pl-nav__link:hover {
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 10%, transparent);
}
.pl-nav__link--active {
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 16%, transparent);
  color: var(--pl-accent, #6366f1);
  font-weight: 600;
}
</style>
