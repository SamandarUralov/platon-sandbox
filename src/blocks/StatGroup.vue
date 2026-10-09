<script setup lang="ts">
/**
 * Built-in block: `stat_group` (SPEC §3 reference set).
 * Renders a responsive grid of stat cards from `items[]`.
 */
import { computed } from 'vue'
import { Badge } from '@platon-rs/platon-ui-kit'

interface StatItem {
  label: string
  value: string | number
  delta?: string | number
  deltaType?: 'up' | 'down' | 'neutral'
  hint?: string
}

const props = defineProps<{ items?: StatItem[] }>()
const stats = computed<StatItem[]>(() => props.items ?? [])
</script>

<template>
  <div class="pl-stat-group">
    <div v-for="(s, i) in stats" :key="i" class="pl-stat">
      <span class="pl-stat__label">{{ s.label }}</span>
      <span class="pl-stat__value">{{ s.value }}</span>
      <div v-if="s.delta !== undefined || s.hint" class="pl-stat__meta">
        <Badge
          v-if="s.delta !== undefined"
          :variant="s.deltaType === 'down' ? 'error' : s.deltaType === 'up' ? 'success' : 'secondary'"
        >
          {{ s.delta }}
        </Badge>
        <span v-if="s.hint" class="pl-stat__hint">{{ s.hint }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pl-stat-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.pl-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--pl-border, #e5e7eb);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
}
.pl-stat__label {
  font-size: 13px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-stat__value {
  font-size: 26px;
  font-weight: 680;
  color: var(--pl-fg, #0f172a);
  line-height: 1.1;
}
.pl-stat__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pl-stat__hint {
  font-size: 12px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
