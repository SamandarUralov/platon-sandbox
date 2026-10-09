import { describe, it, expect, beforeEach } from 'vitest'
import { computed, watchEffect } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { ProjectMeta } from '@/contracts'
import { useSandboxStore } from '@/state'
import { buildCtx } from '../ctx'
import type { EngineContext } from '../engine'

/** A meta small enough to control, large enough to patch a nested block. */
const meta: ProjectMeta = {
  schemaVersion: 1,
  id: 'test',
  name: 'Test',
  theme: { tokens: {} },
  roles: [],
  data_models: [],
  custom_components: [],
  global_state: { counter: 1 },
  global_hooks: [],
  menu: [],
  pages: [
    {
      id: 'p1',
      label: 'P1',
      path: '/',
      blocks: [
        {
          id: 'header',
          component: 'page_header',
          props: { title: 'Original' },
          children: [{ id: 'child', component: 'button', props: { label: 'Go' } }],
        },
      ],
    },
  ],
}

// buildCtx only touches engine.query/http in fields it exposes, not in the block
// path exercised here — a minimal stub suffices.
const fakeEngine = {
  query: { run: async () => null },
  http: {},
} as unknown as EngineContext

describe('ctx.blocks — reactive read/write (SPEC §4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSandboxStore().loadMeta(meta, { mode: 'preview' })
  })

  it('reads a block by id', () => {
    const ctx = buildCtx({ engine: fakeEngine })
    const header = ctx.blocks.get('header') as { props: { title: string } } | undefined
    expect(header?.props.title).toBe('Original')
  })

  it('mutates a block reactively via ctx.blocks.set', () => {
    const ctx = buildCtx({ engine: fakeEngine })
    const title = computed(
      () => (ctx.blocks.get('header') as { props?: { title?: string } } | undefined)?.props?.title,
    )

    const seen: Array<string | undefined> = []
    const stop = watchEffect(() => seen.push(title.value), { flush: 'sync' })

    expect(title.value).toBe('Original')
    ctx.blocks.set('header', 'props.title', 'Changed')

    expect(title.value).toBe('Changed')
    expect(seen).toContain('Changed')
    stop()
  })

  it('mutates a nested child block reactively', () => {
    const ctx = buildCtx({ engine: fakeEngine })
    ctx.blocks.set('child', 'props.label', 'Done')
    const child = ctx.blocks.get('child') as { props: { label: string } }
    expect(child.props.label).toBe('Done')
  })

  it('exposes global state through ctx.state.global', () => {
    const ctx = buildCtx({ engine: fakeEngine })
    expect(ctx.state.global.counter).toBe(1)
  })
})
