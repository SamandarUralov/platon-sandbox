/**
 * Roles & permissions visibility tests (SPEC §7).
 *
 * Unit-covers the pure `isVisibleToRole` helper and the render-level effect of
 * the "Preview as <role>" filter on block visibility.
 */
import { describe, expect, it } from 'vitest'
import type { ProjectMeta } from '@/contracts'
import { isVisibleToRole } from '@/engine/roles'
import { mountPage } from './helpers'

describe('isVisibleToRole', () => {
  it('shows nodes with no restriction to everyone', () => {
    expect(isVisibleToRole(undefined, null)).toBe(true)
    expect(isVisibleToRole([], 'technician')).toBe(true)
  })

  it('shows restricted nodes only to matching roles', () => {
    expect(isVisibleToRole(['admin'], 'admin')).toBe(true)
    expect(isVisibleToRole(['admin', 'dispatcher'], 'dispatcher')).toBe(true)
    expect(isVisibleToRole(['admin'], 'technician')).toBe(false)
  })

  it('does not hide restricted nodes when no role is active (Interface)', () => {
    // Interface only *defines* roles; with no active role nothing is hidden.
    expect(isVisibleToRole(['admin'], null)).toBe(true)
  })
})

function roleMeta(): ProjectMeta {
  return {
    schemaVersion: 1,
    id: 'roles',
    name: 'Roles',
    theme: { tokens: {} },
    roles: ['admin', 'technician'],
    data_models: [],
    custom_components: [],
    global_state: {},
    global_hooks: [],
    menu: [],
    pages: [
      {
        id: 'p',
        label: 'P',
        path: '/',
        parent: null,
        in_menu: true,
        visible_to: [],
        blocks: [
          { id: 'public', component: 'page_header', props: { title: 'Public Block' } },
          { id: 'admin-only', component: 'page_header', props: { title: 'Admin Block' }, visible_to: ['admin'] },
        ],
      },
    ],
  }
}

describe('render-level role filtering', () => {
  it('hides blocks not visible to the active role in Preview', () => {
    const { wrapper } = mountPage(roleMeta(), { mode: 'preview', role: 'technician' })
    expect(wrapper.text()).toContain('Public Block')
    expect(wrapper.text()).not.toContain('Admin Block')
    expect(wrapper.find('[data-block-id="admin-only"]').exists()).toBe(false)
  })

  it('shows role-restricted blocks to the matching role', () => {
    const { wrapper } = mountPage(roleMeta(), { mode: 'preview', role: 'admin' })
    expect(wrapper.text()).toContain('Public Block')
    expect(wrapper.text()).toContain('Admin Block')
  })

  it('shows everything when no role is active', () => {
    const { wrapper } = mountPage(roleMeta(), { mode: 'preview', role: null })
    expect(wrapper.text()).toContain('Public Block')
    expect(wrapper.text()).toContain('Admin Block')
  })
})
