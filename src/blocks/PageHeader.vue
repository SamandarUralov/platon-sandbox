<script setup lang="ts">
/**
 * Built-in block: `page_header` (SPEC §3 reference set).
 * Title + optional subtitle + optional action buttons (ui-kit Button/Badge).
 */
import { computed } from 'vue'
import { Badge, Button } from '@platon-rs/platon-ui-kit'

interface HeaderAction {
  label: string
  variant?: string
  icon?: string
}

const props = defineProps<{
  title?: string
  subtitle?: string
  badge?: string
  badgeVariant?: string
  actions?: HeaderAction[]
}>()

const emit = defineEmits<{ (e: 'action', action: HeaderAction, index: number): void }>()

const actionList = computed<HeaderAction[]>(() => props.actions ?? [])
</script>

<template>
  <header class="pl-page-header">
    <div class="pl-page-header__text">
      <div class="pl-page-header__titlerow">
        <h1 class="pl-page-header__title">{{ title ?? 'Untitled page' }}</h1>
        <Badge v-if="badge" :variant="badgeVariant ?? 'secondary'">{{ badge }}</Badge>
      </div>
      <p v-if="subtitle" class="pl-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="actionList.length" class="pl-page-header__actions">
      <Button
        v-for="(a, i) in actionList"
        :key="i"
        :variant="a.variant ?? 'primary'"
        @click="emit('action', a, i)"
      >
        {{ a.label }}
      </Button>
    </div>
  </header>
</template>

<style scoped>
.pl-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--pl-border, #e5e7eb);
}
.pl-page-header__titlerow {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pl-page-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: var(--pl-fg, #0f172a);
}
.pl-page-header__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-page-header__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
