/**
 * CRUD permissions matrix (SPEC §7).
 *
 * In Preview the Create/Edit/Delete capabilities are **visual only**: controls
 * are disabled/hidden for roles that lack the permission. Real enforcement is
 * the backend's job. These pure helpers compute "can this role do X on this
 * block?" and build the role×operation grid the preview shell renders.
 *
 * Rule: an absent matrix, or an absent list for an operation, means EVERYONE is
 * allowed (permissions are opt-in restrictions, mirroring `visible_to`). A null
 * active role (Interface / no selection) is never restricted.
 *
 * The contract field is `permissions.update`; the UI labels it "Edit". `'edit'`
 * is accepted as an alias of `'update'` everywhere here.
 */

import type { BlockPermissions } from '@/contracts'

/** Canonical CRUD operations as stored in the meta (`read` omitted from the UI matrix). */
export type CrudOp = 'create' | 'read' | 'update' | 'delete'

/** Operation names accepted at the API surface, including the `edit` alias. */
export type PermissionOp = CrudOp | 'edit'

/** The three write operations shown in the visual matrix, with display labels. */
export const CRUD_MATRIX_OPS: { op: CrudOp; label: string }[] = [
  { op: 'create', label: 'Create' },
  { op: 'update', label: 'Edit' },
  { op: 'delete', label: 'Delete' },
]

function normalizeOp(op: PermissionOp): CrudOp {
  return op === 'edit' ? 'update' : op
}

/**
 * Can `role` perform `op` given a block's permission matrix?
 *
 * - No matrix / no list for the op ⇒ allowed (unrestricted).
 * - List present ⇒ allowed only if it includes `role`.
 * - `role === null` ⇒ allowed (no active role to restrict against).
 */
export function can(
  permissions: BlockPermissions | undefined,
  op: PermissionOp,
  role: string | null,
): boolean {
  const list = permissions?.[normalizeOp(op)]
  if (!list || list.length === 0) return true
  if (!role) return true
  return list.includes(role)
}

/** Build the `{ create, update, delete }` capability map for a single role. */
export function capabilitiesFor(
  permissions: BlockPermissions | undefined,
  role: string | null,
): Record<CrudOp, boolean> {
  return {
    create: can(permissions, 'create', role),
    read: can(permissions, 'read', role),
    update: can(permissions, 'update', role),
    delete: can(permissions, 'delete', role),
  }
}

/** One cell of the visual matrix: a role × operation allow/deny verdict. */
export interface MatrixCell {
  role: string
  op: CrudOp
  label: string
  allowed: boolean
  /** True when the permission is explicitly restricted (a list exists for this op). */
  restricted: boolean
}

/**
 * Build the full role × operation grid for a block's permissions — the data the
 * preview `PermissionsMatrix` panel renders. `restricted` lets the UI distinguish
 * "everyone allowed" (no rule) from "allowed because this role is listed".
 */
export function permissionMatrix(
  permissions: BlockPermissions | undefined,
  roles: string[],
): MatrixCell[] {
  const cells: MatrixCell[] = []
  for (const role of roles) {
    for (const { op, label } of CRUD_MATRIX_OPS) {
      const list = permissions?.[op]
      cells.push({
        role,
        op,
        label,
        allowed: can(permissions, op, role),
        restricted: Boolean(list && list.length > 0),
      })
    }
  }
  return cells
}

/** True if a block declares any CRUD restriction worth showing in the matrix. */
export function hasPermissions(permissions: BlockPermissions | undefined): boolean {
  if (!permissions) return false
  return CRUD_MATRIX_OPS.some(({ op }) => {
    const list = permissions[op]
    return Array.isArray(list) && list.length > 0
  })
}
