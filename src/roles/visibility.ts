/**
 * Role visibility filtering (SPEC §7).
 *
 * `visible_to` gates nodes at three levels — page, block, and the navigation
 * menu tree — against the active role selected in the "Preview as <role>"
 * switcher. These are PURE functions (no Vue, no store) so they are trivially
 * unit-testable and reusable by both the renderer and the preview shell.
 *
 * Built on top of the foundation's `isVisibleToRole` stub (`@/engine`) rather
 * than re-implementing the base rule — this module only adds the tree-level
 * filters the preview shell needs.
 *
 * Base rule (inherited): no `visible_to` (or empty) ⇒ visible to everyone;
 * a null active role (e.g. Interface mode, where roles are only *defined*) ⇒
 * nothing is hidden.
 */

import type { Block, MenuNode, PageMeta } from '@/contracts'
import { isVisibleToRole } from '@/engine'

export { isVisibleToRole }

/** True if a page is visible to the active role (SPEC §7). */
export function isPageVisible(page: Pick<PageMeta, 'visible_to'>, role: string | null): boolean {
  return isVisibleToRole(page.visible_to, role)
}

/** True if a block is visible to the active role (SPEC §7). */
export function isBlockVisible(block: Pick<Block, 'visible_to'>, role: string | null): boolean {
  return isVisibleToRole(block.visible_to, role)
}

/**
 * Recursively filter the block tree for a role. A hidden block drops its whole
 * subtree; visible blocks keep only their visible children. Returns a new tree
 * (inputs are never mutated) so switching roles re-derives cleanly.
 */
export function filterBlockTree(blocks: Block[] | undefined, role: string | null): Block[] {
  if (!blocks?.length) return []
  const out: Block[] = []
  for (const block of blocks) {
    if (!isBlockVisible(block, role)) continue
    out.push(block.children?.length ? { ...block, children: filterBlockTree(block.children, role) } : block)
  }
  return out
}

/**
 * Recursively filter the navigation menu tree for a role (SPEC §7).
 *
 * - A node explicitly hidden by its own `visible_to` is dropped outright.
 * - A *group* node (no `page`) that ends up with no visible children is also
 *   dropped, so the sidebar never shows empty section headers.
 * - A *leaf* node (has `page`) is kept when visible, even with no children.
 */
export function filterMenuTree(nodes: MenuNode[] | undefined, role: string | null): MenuNode[] {
  if (!nodes?.length) return []
  const out: MenuNode[] = []
  for (const node of nodes) {
    if (!isVisibleToRole(node.visible_to, role)) continue
    const children = node.children?.length ? filterMenuTree(node.children, role) : undefined
    const isGroup = !node.page
    // Drop groups that have been emptied out by child-level filtering.
    if (isGroup && node.children?.length && !children?.length) continue
    out.push(children ? { ...node, children } : node)
  }
  return out
}

/**
 * Collect the page ids reachable through the filtered menu tree for a role.
 * Useful for routing guards and tests.
 */
export function visiblePageIds(nodes: MenuNode[] | undefined, role: string | null): string[] {
  const ids: string[] = []
  const walk = (list: MenuNode[]) => {
    for (const n of list) {
      if (n.page) ids.push(n.page)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(filterMenuTree(nodes, role))
  return ids
}
