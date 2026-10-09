import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { ProjectMeta } from '@/contracts'
import { HostKey, noopHost } from '@/engine'
import { useSandboxStore } from '@/state'
import { fieldOpsMeta } from '@/demo/fieldops'
import SandboxRoot from '@/app/SandboxRoot.vue'

const clone = (m: ProjectMeta): ProjectMeta => structuredClone(m)

let wrapper: VueWrapper | null = null

beforeEach(() => {
  setActivePinia(createPinia())
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('patch → reactive render (integration)', () => {
  it('re-renders the canvas when a patched prop changes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSandboxStore()
    store.loadMeta(clone(fieldOpsMeta), { mode: 'interface' })

    wrapper = mount(SandboxRoot, {
      global: {
        plugins: [pinia],
        provide: { [HostKey as symbol]: noopHost() },
      },
    })
    await nextTick()

    const title = () => wrapper!.find('.pl-page-header__title')
    expect(title().text()).toBe('Dashboard')

    store.applyPatch({ blockId: 'dash-header', path: 'props.title', value: 'Live Ops' })
    await nextTick()
    await nextTick()

    expect(title().text()).toBe('Live Ops')
  })
})
