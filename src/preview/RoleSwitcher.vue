<script setup lang="ts">
/**
 * "Preview as <role>" switcher (SPEC §5, §7).
 *
 * Preview mode only. Picking a role writes `store.role`, which drives:
 *  - live `visible_to` filtering of the menu / pages / blocks, and
 *  - the CRUD permission matrix (disabled/hidden controls), and
 *  - `ctx.user.role` for user code (the store is the single source of truth).
 *
 * The component is presentational: it reflects `modelValue` (the active role)
 * and emits changes; the shell owns the store wiring.
 */
import { computed } from 'vue'

const props = defineProps<{ roles: string[]; modelValue: string | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', role: string | null): void }>()

const current = computed(() => props.modelValue ?? '')

function onChange(ev: Event) {
  const value = (ev.target as HTMLSelectElement).value
  emit('update:modelValue', value === '' ? null : value)
}

function initials(role: string): string {
  return role.slice(0, 1).toUpperCase()
}
</script>

<template>
  <label class="pl-role-switcher">
    <span class="pl-role-switcher__label">Preview as</span>
    <span class="pl-role-switcher__control">
      <span v-if="current" class="pl-role-switcher__avatar" aria-hidden="true">
        {{ initials(current) }}
      </span>
      <select
        class="pl-role-switcher__select"
        :value="current"
        aria-label="Preview as role"
        @change="onChange"
      >
        <option value="">All roles</option>
        <option v-for="role in roles" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
      <span class="pl-role-switcher__chevron" aria-hidden="true">▾</span>
    </span>
  </label>
</template>

<style scoped>
.pl-role-switcher {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.pl-role-switcher__label {
  color: var(--pl-fg-muted, #64748b);
  font-weight: 600;
  white-space: nowrap;
}
.pl-role-switcher__control {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 6px;
  border: 1px solid var(--pl-border, #e2e8f0);
  border-radius: 999px;
  background: var(--pl-surface, #ffffff);
  transition: box-shadow 0.12s ease, border-color 0.12s ease;
}
.pl-role-switcher__control:focus-within {
  border-color: var(--pl-accent, #6366f1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pl-accent, #6366f1) 18%, transparent);
}
.pl-role-switcher__avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--pl-accent, #6366f1);
}
.pl-role-switcher__select {
  appearance: none;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: var(--pl-fg, #0f172a);
  text-transform: capitalize;
  padding-right: 2px;
  cursor: pointer;
  outline: none;
}
.pl-role-switcher__chevron {
  color: var(--pl-fg-muted, #64748b);
  font-size: 10px;
  pointer-events: none;
}
</style>
