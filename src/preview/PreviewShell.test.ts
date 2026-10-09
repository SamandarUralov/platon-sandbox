/**
 * Preview shell integration (SPEC §5 Preview, §7).
 *
 * Mounts the real shell (SandboxRoot → EngineProvider → PreviewShell) in Preview
 * mode and asserts that switching the active role live re-draws the canvas:
 * blocks appear/disappear per `visible_to`, and hidden pages auto-redirect to the
 * first page the role may see. Also checks the "Preview as <role>" switcher is
 * wired to the store (the same value exposed as `ctx.user.role`).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useSandboxStore } from '@/state'
import { fieldOpsMeta } from '@/demo/fieldops'
import SandboxRoot from '@/app/SandboxRoot.vue'

let store: ReturnType<typeof useSandboxStore>

function mountShell() {
  const pinia = createPinia()
  setActivePinia(pinia)
  store = useSandboxStore()
  store.loadMeta(fieldOpsMeta, { mode: 'preview', role: 'admin' })
  return mount(SandboxRoot, { global: { plugins: [pinia] } })
}

async function setRole(wrapper: VueWrapper, role: string | null) {
  store.setRole(role)
  await nextTick()
  await flushPromises()
  await nextTick()
}

const shows = (wrapper: VueWrapper, blockId: string) =>
  wrapper.find(`[data-block-id="${blockId}"]`).exists()

describe('PreviewShell — live role filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the preview chrome (menu + role switcher) in preview mode', () => {
    const wrapper = mountShell()
    expect(wrapper.find('.pl-preview').exists()).toBe(true)
    expect(wrapper.find('.pl-role-switcher').exists()).toBe(true)
    expect(wrapper.find('.pl-menu').exists()).toBe(true)
  })

  it('admin sees the KPI block on the dashboard', () => {
    const wrapper = mountShell()
    expect(shows(wrapper, 'dash-header')).toBe(true)
    expect(shows(wrapper, 'dash-stats')).toBe(true)
    expect(shows(wrapper, 'dash-recent')).toBe(true)
  })

  it('switching admin → dispatcher hides the admin-only KPI block live', async () => {
    const wrapper = mountShell()
    expect(shows(wrapper, 'dash-stats')).toBe(true)
    await setRole(wrapper, 'dispatcher')
    expect(shows(wrapper, 'dash-header')).toBe(true) // page still visible
    expect(shows(wrapper, 'dash-stats')).toBe(false) // block now hidden
  })

  it('switching to technician redirects off the hidden dashboard to work orders', async () => {
    const wrapper = mountShell()
    await setRole(wrapper, 'technician')
    expect(shows(wrapper, 'dash-header')).toBe(false) // dashboard not visible
    expect(shows(wrapper, 'wo-header')).toBe(true) // auto-navigated here
    expect(shows(wrapper, 'wo-table')).toBe(true)
    expect(shows(wrapper, 'wo-stats')).toBe(false) // dispatch stats hidden from techs
  })

  it('customer lands on the only page they may see', async () => {
    const wrapper = mountShell()
    await setRole(wrapper, 'customer')
    expect(shows(wrapper, 'cl-header')).toBe(true)
    expect(shows(wrapper, 'cl-table')).toBe(true)
    expect(shows(wrapper, 'wo-header')).toBe(false)
  })

  it('the role switcher drives store.role (→ ctx.user.role)', async () => {
    const wrapper = mountShell()
    const select = wrapper.find('.pl-role-switcher__select')
    await select.setValue('technician')
    expect(store.role).toBe('technician')
  })
})
