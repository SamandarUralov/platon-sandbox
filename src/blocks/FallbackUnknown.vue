<script setup lang="ts">
/**
 * FallbackUnknown (SPEC §3). Rendered when `registry[block.component]` misses.
 * Must never crash — it is the safety net for unknown component keys.
 */
defineProps<{ component?: string; blockId?: string }>()
</script>

<template>
  <div class="pl-unknown" role="alert">
    <span class="pl-unknown__badge">Unknown component</span>
    <code class="pl-unknown__name">{{ component ?? '(missing component key)' }}</code>
    <span v-if="blockId" class="pl-unknown__id">block: {{ blockId }}</span>
  </div>
</template>

<style scoped>
.pl-unknown {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed var(--pl-danger, #dc2626);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pl-danger, #dc2626) 8%, transparent);
  color: var(--pl-danger, #dc2626);
  font-size: 13px;
}
.pl-unknown__badge {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 11px;
}
.pl-unknown__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}
.pl-unknown__id {
  opacity: 0.7;
}
</style>
