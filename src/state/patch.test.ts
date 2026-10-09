import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, watchEffect } from 'vue'
import type { ProjectMeta } from '@/contracts'
import { fieldOpsMeta } from '@/demo/fieldops'
import { useSandboxStore } from '@/state'

const clone = (m: ProjectMeta): ProjectMeta => structuredClone(m)

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('store.applyPatch — reactivity', () => {
  it('reactively updates dependents when a block prop is patched', async () => {
    const store = useSandboxStore()
    store.loadMeta(clone(fieldOpsMeta), { mode: 'interface' })

    const scope = effectScope()
    let seen: unknown
    scope.run(() => {
      watchEffect(() => {
        seen = store.meta?.pages[0].blocks[0].props?.title
      })
    })

    expect(seen).toBe('Dashboard')

    const ok = store.applyPatch({ blockId: 'dash-header', path: 'props.title', value: 'Live Ops' })
    expect(ok).toBe(true)
    await nextTick()
    expect(seen).toBe('Live Ops')

    scope.stop()
  })

  it('patches an array element path reactively', async () => {
    const store = useSandboxStore()
    store.loadMeta(clone(fieldOpsMeta), { mode: 'interface' })

    const scope = effectScope()
    let seen: unknown
    scope.run(() => {
      watchEffect(() => {
        const stats = store.meta?.pages[0].blocks[1]
        seen = (stats?.items?.[0] as { value?: unknown } | undefined)?.value
      })
    })

    expect(seen).toBe(12)
    store.applyPatch({ blockId: 'dash-stats', path: 'items.0.value', value: 99 })
    await nextTick()
    expect(seen).toBe(99)
    scope.stop()
  })

  it('does not mutate the original meta (immutable rebuild)', () => {
    const store = useSandboxStore()
    const source = clone(fieldOpsMeta)
    store.loadMeta(source, { mode: 'interface' })

    store.applyPatch({ blockId: 'dash-header', path: 'props.title', value: 'Changed' })

    // The shared demo const is untouched; the loaded copy's root identity changed.
    expect(fieldOpsMeta.pages[0].blocks[0].props?.title).toBe('Dashboard')
    expect(source).not.toBe(store.meta)
  })

  it('patches a nested child block through the tree', () => {
    const store = useSandboxStore()
    const meta: ProjectMeta = {
      ...clone(fieldOpsMeta),
      pages: [
        {
          id: 'p1',
          label: 'P1',
          path: '/p1',
          blocks: [
            {
              id: 'outer',
              component: 'section',
              children: [{ id: 'inner', component: 'page_header', props: { title: 'Before' } }],
            },
          ],
        },
      ],
    }
    store.loadMeta(meta, { mode: 'interface' })

    const ok = store.applyPatch({ blockId: 'inner', path: 'props.title', value: 'After' })
    expect(ok).toBe(true)
    expect(store.meta?.pages[0].blocks[0].children?.[0].props?.title).toBe('After')
  })

  it('returns false for an unknown block id', () => {
    const store = useSandboxStore()
    store.loadMeta(clone(fieldOpsMeta), { mode: 'interface' })
    expect(store.applyPatch({ blockId: 'nope', path: 'props.x', value: 1 })).toBe(false)
  })
})

describe('init → patch round-trip', () => {
  it('applies an edit on top of a freshly initialized meta and reads it back', () => {
    const store = useSandboxStore()

    // init: full meta.
    store.loadMeta(clone(fieldOpsMeta), { mode: 'interface', pageId: 'work_orders' })
    expect(store.currentPage?.id).toBe('work_orders')
    const before = store.meta?.pages.find((p) => p.id === 'work_orders')?.blocks[0].props?.title
    expect(before).toBe('Work orders')

    // patch: edit a prop.
    const ok = store.applyPatch({ blockId: 'wo-header', path: 'props.subtitle', value: 'Edited' })
    expect(ok).toBe(true)

    // round-trip read.
    const page = store.meta?.pages.find((p) => p.id === 'work_orders')
    expect(page?.blocks[0].props?.title).toBe('Work orders')
    expect(page?.blocks[0].props?.subtitle).toBe('Edited')
  })
})
