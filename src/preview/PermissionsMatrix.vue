<script setup lang="ts">
/**
 * CRUD permission matrix — visual (SPEC §7).
 *
 * In Preview the Create/Edit/Delete capabilities are *visual only*: for the
 * active role each control renders enabled or disabled/hidden. Real enforcement
 * is the backend's job. This panel makes that gating inspectable: one row per
 * block that declares permissions, a cell per operation, reacting live to the
 * "Preview as <role>" switcher.
 */
import { computed } from 'vue'
import type { Block } from '@/contracts'
import { CRUD_MATRIX_OPS, can, hasPermissions } from '@/roles'

const props = defineProps<{ blocks: Block[]; role: string | null }>()

/** Flatten the block tree to the nodes that actually declare CRUD permissions. */
const permissionedBlocks = computed<Block[]>(() => {
  const out: Block[] = []
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (hasPermissions(b.permissions)) out.push(b)
      if (b.children?.length) walk(b.children)
    }
  }
  walk(props.blocks)
  return out
})

const ops = CRUD_MATRIX_OPS

function blockLabel(block: Block): string {
  const title = block.props?.title
  return typeof title === 'string' && title ? title : `${block.component} · ${block.id}`
}

function allowed(block: Block, op: (typeof CRUD_MATRIX_OPS)[number]['op']): boolean {
  return can(block.permissions, op, props.role)
}
</script>

<template>
  <section v-if="permissionedBlocks.length" class="pl-perm">
    <header class="pl-perm__head">
      <h3 class="pl-perm__title">CRUD permissions</h3>
      <span class="pl-perm__role">
        {{ role ? `as ${role}` : 'all roles' }}
      </span>
    </header>
    <table class="pl-perm__table">
      <thead>
        <tr>
          <th class="pl-perm__th pl-perm__th--name">Block</th>
          <th v-for="o in ops" :key="o.op" class="pl-perm__th">{{ o.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="block in permissionedBlocks" :key="block.id" class="pl-perm__row">
          <td class="pl-perm__name">{{ blockLabel(block) }}</td>
          <td v-for="o in ops" :key="o.op" class="pl-perm__cell">
            <span
              class="pl-perm__badge"
              :class="allowed(block, o.op) ? 'pl-perm__badge--on' : 'pl-perm__badge--off'"
              :title="allowed(block, o.op)
                ? `${o.label} enabled for ${role ?? 'all roles'}`
                : `${o.label} hidden/disabled for ${role ?? 'all roles'}`"
            >
              {{ allowed(block, o.op) ? 'Enabled' : 'Hidden' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="pl-perm__note">
      Visual only — real enforcement is the backend's responsibility.
    </p>
  </section>
</template>

<style scoped>
.pl-perm {
  border: 1px solid var(--pl-border, #e2e8f0);
  border-radius: 12px;
  background: var(--pl-surface, #ffffff);
  padding: 14px 16px;
}
.pl-perm__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.pl-perm__title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--pl-fg, #0f172a);
}
.pl-perm__role {
  font-size: 12px;
  font-weight: 600;
  color: var(--pl-accent, #6366f1);
  text-transform: capitalize;
}
.pl-perm__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pl-perm__th {
  text-align: center;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pl-fg-muted, #64748b);
  border-bottom: 1px solid var(--pl-border, #e2e8f0);
}
.pl-perm__th--name {
  text-align: left;
}
.pl-perm__name {
  padding: 8px 10px;
  color: var(--pl-fg, #0f172a);
  font-weight: 500;
}
.pl-perm__cell {
  text-align: center;
  padding: 8px 10px;
}
.pl-perm__badge {
  display: inline-block;
  min-width: 64px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
}
.pl-perm__badge--on {
  background: color-mix(in srgb, var(--pl-success, #16a34a) 16%, transparent);
  color: var(--pl-success, #16a34a);
}
.pl-perm__badge--off {
  background: color-mix(in srgb, var(--pl-fg-muted, #64748b) 14%, transparent);
  color: var(--pl-fg-muted, #94a3b8);
  text-decoration: line-through;
  opacity: 0.8;
}
.pl-perm__note {
  margin: 10px 0 0;
  font-size: 11px;
  color: var(--pl-fg-muted, #64748b);
}
</style>
