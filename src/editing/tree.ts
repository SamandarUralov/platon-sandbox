/**
 * Block-tree helpers for the edit overlay (SPEC §8 nested tree).
 *
 * The Sandbox owns the authoritative block tree, so hit-testing and
 * drop-target resolution derive parent/child/index/depth relationships from
 * the meta — never from DOM nesting, which may differ (wrappers, portals).
 */

import type { Block } from '@/contracts'

/** A flattened block node carrying its position in the tree. */
export interface TreeNode {
  block: Block
  /** Parent block id, or null for a top-level (page-root) block. */
  parentId: string | null
  /** Insertion index within the parent's children (or page blocks). */
  index: number
  /** Depth from the page root (top-level blocks are depth 0). */
  depth: number
}

/**
 * Components treated as containers (drop targets) even before they hold any
 * children. Any block that already declares a `children` array is a container
 * regardless; this set lets empty layout shells accept the first drop too.
 */
export const DEFAULT_CONTAINER_COMPONENTS: ReadonlySet<string> = new Set([
  'container',
  'section',
  'card',
  'grid',
  'row',
  'column',
  'stack',
  'form',
  'tabs',
  'tab',
  'accordion',
  'panel',
  'group',
])

/**
 * Whether a block may host children. Default: it already has a `children`
 * array, or its component is a known layout container. Callers can override
 * with a custom predicate (e.g. driven by the component registry).
 */
export function isContainerBlock(
  block: Block,
  containers: ReadonlySet<string> = DEFAULT_CONTAINER_COMPONENTS,
): boolean {
  return Array.isArray(block.children) || containers.has(block.component)
}

/** Flatten a block tree depth-first into positioned nodes. */
export function flattenTree(rootBlocks: Block[]): TreeNode[] {
  const out: TreeNode[] = []
  const walk = (blocks: Block[], parentId: string | null, depth: number): void => {
    blocks.forEach((block, index) => {
      out.push({ block, parentId, index, depth })
      if (block.children?.length) walk(block.children, block.id, depth + 1)
    })
  }
  walk(rootBlocks, null, 0)
  return out
}

/** Direct children of a container id (or the top-level blocks for `null`). */
export function childrenOf(rootBlocks: Block[], parentId: string | null): Block[] {
  if (parentId === null) return rootBlocks
  for (const node of flattenTree(rootBlocks)) {
    if (node.block.id === parentId) return node.block.children ?? []
  }
  return []
}
