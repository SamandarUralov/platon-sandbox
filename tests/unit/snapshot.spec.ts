/**
 * Snapshot / golden tests (SPEC §2, §3, §8).
 *
 * Renders the canonical FieldOps meta (and a few edge-case metas) through the
 * real EngineProvider › PageRenderer chain and freezes the resulting block tree
 * as golden HTML. Mock data is faker-seeded deterministically (seed 1337 in the
 * mock store), so these snapshots are stable across runs.
 */
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { fieldOpsMeta } from '@/demo/fieldops'
import type { ProjectMeta } from '@/contracts'
import { mountBlocks, mountPage } from './helpers'

/** A container component that renders its default slot — needed to exercise the
 *  recursive child renderer (the built-in blocks don't expose a slot outlet). */
const SlotContainer = defineComponent({
  name: 'SlotContainer',
  setup(_, { slots }) {
    return () => h('div', { class: 'pl-slot-container' }, slots.default?.())
  },
})

describe('FieldOps golden render (Interface mode)', () => {
  for (const pageId of ['dashboard', 'work_orders', 'job_checklist']) {
    it(`renders the "${pageId}" page tree`, () => {
      const { wrapper } = mountPage(fieldOpsMeta, { pageId, mode: 'interface' })
      expect(wrapper.html()).toMatchSnapshot()
    })
  }

  it('renders a data_table with mock rows for the dashboard', () => {
    const { wrapper } = mountPage(fieldOpsMeta, { pageId: 'dashboard', mode: 'interface' })
    const table = wrapper.find('[data-component="data_table"]')
    expect(table.exists()).toBe(true)
    // Default mock seed is 8 rows (createMockStore DEFAULT_SEED_COUNT).
    expect(table.findAll('tbody tr').length).toBe(8)
  })

  it('renders every built-in block type on the dashboard', () => {
    const { wrapper } = mountPage(fieldOpsMeta, { pageId: 'dashboard', mode: 'interface' })
    expect(wrapper.find('[data-component="page_header"]').exists()).toBe(true)
    expect(wrapper.find('[data-component="stat_group"]').exists()).toBe(true)
    expect(wrapper.find('[data-component="data_table"]').exists()).toBe(true)
  })
})

describe('Preview mode golden render', () => {
  it('leaves query-bound tables empty in Preview (live data is a later worker)', () => {
    // SPEC §5/§6: Interface resolves mock data; Preview resolves live (not yet
    // wired), so the table renders with no mock rows.
    const { wrapper } = mountPage(fieldOpsMeta, { pageId: 'dashboard', mode: 'preview' })
    const table = wrapper.find('[data-component="data_table"]')
    expect(table.exists()).toBe(true)
    expect(table.findAll('tbody tr').length).toBe(0)
    expect(wrapper.html()).toMatchSnapshot()
  })
})

/* ------------------------------------------------------------------ *
 * Edge-case metas
 * ------------------------------------------------------------------ */

function baseMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    schemaVersion: 1,
    id: 'edge',
    name: 'Edge',
    theme: { tokens: {} },
    roles: [],
    data_models: [],
    custom_components: [],
    global_state: {},
    global_hooks: [],
    menu: [],
    pages: [
      {
        id: 'p1',
        label: 'Page 1',
        path: '/',
        parent: null,
        in_menu: true,
        visible_to: [],
        blocks: [],
      },
    ],
    ...overrides,
  }
}

describe('edge-case golden render', () => {
  it('renders an empty page without crashing', () => {
    const { wrapper } = mountPage(baseMeta())
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the Unknown placeholder for an unregistered component', () => {
    const meta = baseMeta()
    meta.pages[0].blocks = [{ id: 'b1', component: 'definitely_not_a_real_component' }]
    const { wrapper } = mountPage(meta)
    expect(wrapper.text()).toContain('Unknown component')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders deeply nested children recursively', () => {
    const meta = baseMeta()
    const blocks = [
      {
        id: 'outer',
        component: 'container',
        children: [
          {
            id: 'inner',
            component: 'stat_group',
            items: [{ label: 'Nested stat', value: 42 }],
          },
        ],
      },
    ]
    const { wrapper } = mountBlocks(meta, blocks, { extraComponents: { container: SlotContainer } })
    expect(wrapper.find('[data-block-id="outer"]').exists()).toBe(true)
    expect(wrapper.find('[data-block-id="inner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nested stat')
    expect(wrapper.html()).toMatchSnapshot()
  })
})
