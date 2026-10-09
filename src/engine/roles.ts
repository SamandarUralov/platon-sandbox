/**
 * Roles & permissions visibility (SPEC §7).
 *
 * The role SWITCHER ("Preview as <role>") and CRUD-matrix enforcement UI are a
 * later worker's job. The foundation ships the pure `visible_to` filter helper
 * so the renderer and menu can gate nodes consistently in both modes.
 *
 * Rule: no `visible_to` (or empty) ⇒ visible to everyone. In Interface mode
 * roles are only *defined*, so the active role is typically null and everything
 * shows; the same helper powers Preview's live filter once a role is selected.
 */

export function isVisibleToRole(visibleTo: string[] | undefined, role: string | null): boolean {
  if (!visibleTo || visibleTo.length === 0) return true
  if (!role) return true // no active role (e.g. Interface) ⇒ don't hide.
  return visibleTo.includes(role)
}
