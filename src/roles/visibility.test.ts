/**
 * Role visibility filtering tests (SPEC §7): per-role block sets, menu tree
 * filtering, and that switching role changes what is visible.
 */
import { describe, expect, it } from 'vitest'
import { fieldOpsMeta } from '@/demo/fieldops'
import type { Block, PageMeta } from '@/contracts'
import {
  filterBlockTree,
  filterMenuTree,
  isBlockVisible,
  isPageVisible,
  isVisibleToRole,
  visiblePageIds,
} from './visibility'

const page = (id: string): PageMeta => {
  const p = fieldOpsMeta.pages.find((x) => x.id === id)
  if (!p) throw new Error(`missing page ${id}`)
  return p
}
const ids = (blocks: Block[]) => blocks.map((b) => b.id)

describe('isVisibleToRole', () => {
  it('shows nodes with no visible_to to everyone', () => {
    expect(isVisibleToRole(undefined, 'customer')).toBe(true)
    expect(isVisibleToRole([], 'customer')).toBe(true)
  })

  it('never hides when there is no active role (Interface mode)', () => {
    expect(isVisibleToRole(['admin'], null)).toBe(true)
  })

  it('gates by membership when a role is active', () => {
    expect(isVisibleToRole(['admin', 'dispatcher'], 'dispatcher')).toBe(true)
    expect(isVisibleToRole(['admin', 'dispatcher'], 'technician')).toBe(false)
  })
})

describe('filterBlockTree — correct blocks per role', () => {
  it('dashboard: admin sees KPIs, dispatcher does not', () => {
    const blocks = page('dashboard').blocks
    expect(ids(filterBlockTree(blocks, 'admin'))).toEqual(['dash-header', 'dash-stats', 'dash-recent'])
    expect(ids(filterBlockTree(blocks, 'dispatcher'))).toEqual(['dash-header', 'dash-recent'])
  })

  it('work orders: technician loses the dispatch stats block', () => {
    const blocks = page('work_orders').blocks
    expect(ids(filterBlockTree(blocks, 'dispatcher'))).toEqual(['wo-header', 'wo-stats', 'wo-table'])
    expect(ids(filterBlockTree(blocks, 'technician'))).toEqual(['wo-header', 'wo-table'])
  })

  it('switching role changes the visible block set', () => {
    const blocks = page('dashboard').blocks
    const asAdmin = ids(filterBlockTree(blocks, 'admin'))
    const asDispatcher = ids(filterBlockTree(blocks, 'dispatcher'))
    expect(asAdmin).not.toEqual(asDispatcher)
    expect(asAdmin).toContain('dash-stats')
    expect(asDispatcher).not.toContain('dash-stats')
  })

  it('null role (Interface) shows every block', () => {
    const blocks = page('dashboard').blocks
    expect(ids(filterBlockTree(blocks, null))).toEqual(['dash-header', 'dash-stats', 'dash-recent'])
  })

  it('does not mutate the input tree', () => {
    const blocks = page('work_orders').blocks
    const before = blocks.length
    filterBlockTree(blocks, 'technician')
    expect(blocks.length).toBe(before)
    expect(ids(blocks)).toEqual(['wo-header', 'wo-stats', 'wo-table'])
  })

  it('recurses into children, filtering nested blocks', () => {
    const nested: Block[] = [
      {
        id: 'container',
        component: 'section',
        children: [
          { id: 'kid-admin', component: 'text', visible_to: ['admin'] },
          { id: 'kid-all', component: 'text' },
        ],
      },
    ]
    const asCustomer = filterBlockTree(nested, 'customer')
    expect(asCustomer).toHaveLength(1)
    expect(ids(asCustomer[0].children!)).toEqual(['kid-all'])
    const asAdmin = filterBlockTree(nested, 'admin')
    expect(ids(asAdmin[0].children!)).toEqual(['kid-admin', 'kid-all'])
  })
})

describe('filterMenuTree — menu tree render per role', () => {
  const topIds = (role: string | null) => filterMenuTree(fieldOpsMeta.menu, role).map((n) => n.id)

  it('admin sees the whole tree', () => {
    const tree = filterMenuTree(fieldOpsMeta.menu, 'admin')
    expect(tree.map((n) => n.id)).toEqual(['m-dashboard', 'm-ops'])
    const ops = tree.find((n) => n.id === 'm-ops')!
    expect(ops.children!.map((c) => c.id)).toEqual(['m-work-orders', 'm-checklist'])
  })

  it('dispatcher: dashboard + operations (work orders only)', () => {
    const tree = filterMenuTree(fieldOpsMeta.menu, 'dispatcher')
    expect(tree.map((n) => n.id)).toEqual(['m-dashboard', 'm-ops'])
    expect(tree[1].children!.map((c) => c.id)).toEqual(['m-work-orders'])
  })

  it('technician: no dashboard, both operations entries', () => {
    expect(topIds('technician')).toEqual(['m-ops'])
    const ops = filterMenuTree(fieldOpsMeta.menu, 'technician')[0]
    expect(ops.children!.map((c) => c.id)).toEqual(['m-work-orders', 'm-checklist'])
  })

  it('customer: only the checklist under operations', () => {
    const tree = filterMenuTree(fieldOpsMeta.menu, 'customer')
    expect(tree.map((n) => n.id)).toEqual(['m-ops'])
    expect(tree[0].children!.map((c) => c.id)).toEqual(['m-checklist'])
  })

  it('drops group nodes whose children are all filtered out', () => {
    const menu = [
      {
        id: 'g',
        label: 'Admin area',
        children: [{ id: 'g-1', label: 'Settings', page: 'settings', visible_to: ['admin'] }],
      },
    ]
    expect(filterMenuTree(menu, 'customer')).toEqual([])
    expect(filterMenuTree(menu, 'admin')).toHaveLength(1)
  })

  it('null role renders the full menu (Interface)', () => {
    expect(topIds(null)).toEqual(['m-dashboard', 'm-ops'])
  })
})

describe('visiblePageIds', () => {
  it('lists reachable pages per role', () => {
    expect(visiblePageIds(fieldOpsMeta.menu, 'admin')).toEqual([
      'dashboard',
      'work_orders',
      'job_checklist',
    ])
    expect(visiblePageIds(fieldOpsMeta.menu, 'dispatcher')).toEqual(['dashboard', 'work_orders'])
    expect(visiblePageIds(fieldOpsMeta.menu, 'technician')).toEqual(['work_orders', 'job_checklist'])
    expect(visiblePageIds(fieldOpsMeta.menu, 'customer')).toEqual(['job_checklist'])
  })
})

describe('page/block visibility helpers', () => {
  it('isPageVisible reflects the page visible_to', () => {
    expect(isPageVisible(page('dashboard'), 'customer')).toBe(false)
    expect(isPageVisible(page('job_checklist'), 'customer')).toBe(true)
  })

  it('isBlockVisible reflects the block visible_to', () => {
    const stats = page('dashboard').blocks.find((b) => b.id === 'dash-stats')!
    expect(isBlockVisible(stats, 'admin')).toBe(true)
    expect(isBlockVisible(stats, 'dispatcher')).toBe(false)
  })
})
