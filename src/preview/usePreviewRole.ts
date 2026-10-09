/**
 * Reactive handle to the active Preview role + permission checks.
 *
 * The "Preview as <role>" switcher writes `store.role`, which is the same value
 * exposed to user code as `ctx.user.role` (SPEC §4/§7). This composable gives
 * shell/block components a reactive view of that role and a bound `can()` for
 * visual CRUD gating, so they never read the store's role wiring directly.
 */
import { computed, type ComputedRef } from 'vue'
import type { BlockPermissions } from '@/contracts'
import { useSandboxStore } from '@/state'
import { can, type PermissionOp } from '@/roles'

export interface PreviewRole {
  /** Active role, or null for the unfiltered "All roles" view. */
  role: ComputedRef<string | null>
  /** All roles defined by the project meta. */
  roles: ComputedRef<string[]>
  /** Select a role (null = All roles); mirrors the switcher. */
  setRole(role: string | null): void
  /** Visual CRUD check for the active role (SPEC §7). */
  can(permissions: BlockPermissions | undefined, op: PermissionOp): boolean
}

export function usePreviewRole(): PreviewRole {
  const store = useSandboxStore()
  const role = computed(() => store.role)
  const roles = computed(() => store.roles)
  return {
    role,
    roles,
    setRole: (next) => store.setRole(next),
    can: (permissions, op) => can(permissions, op, store.role),
  }
}
