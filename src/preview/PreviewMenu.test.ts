/**
 * PreviewMenu render tests (SPEC §2 MenuNode, §7): the menu tree renders
 * recursively, leaf nodes navigate, group nodes are headers — and the tree it
 * receives is already role-filtered, so each role sees a different menu.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { fieldOpsMeta } from '@/demo/fieldops'
import { filterMenuTree } from '@/roles'
import PreviewMenu from './PreviewMenu.vue'

function mountFor(role: string | null, activePage: string | null = null) {
  return mount(PreviewMenu, {
    props: { nodes: filterMenuTree(fieldOpsMeta.menu, role), activePage },
  })
}

describe('PreviewMenu', () => {
  it('renders every leaf as a navigable button and groups as headers', () => {
    const wrapper = mountFor('admin')
    const links = wrapper.findAll('.pl-menu__link').map((b) => b.text())
    expect(links).toEqual(['Dashboard', 'Work orders', 'Job checklist'])
    expect(wrapper.findAll('.pl-menu__group').map((g) => g.text())).toEqual(['Operations'])
  })

  it('renders only what the customer role may see', () => {
    const wrapper = mountFor('customer')
    const links = wrapper.findAll('.pl-menu__link').map((b) => b.text())
    expect(links).toEqual(['Job checklist'])
    expect(wrapper.text()).not.toContain('Dashboard')
    expect(wrapper.text()).not.toContain('Work orders')
  })

  it('renders a nested sub-list for group children', () => {
    const wrapper = mountFor('admin')
    expect(wrapper.find('.pl-menu--nested').exists()).toBe(true)
  })

  it('marks the active page', () => {
    const wrapper = mountFor('admin', 'work_orders')
    const active = wrapper.find('.pl-menu__link--active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toBe('Work orders')
  })

  it('emits navigate with the page id on click', async () => {
    const wrapper = mountFor('admin')
    const dashboard = wrapper.findAll('.pl-menu__link').find((b) => b.text() === 'Dashboard')!
    await dashboard.trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['dashboard'])
  })
})
