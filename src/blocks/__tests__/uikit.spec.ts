/**
 * Studio "UI kit" blocks: every type Studio's sandbox adapter sends under its own name resolves
 * to a real built-in (not FallbackUnknown), mounts with Studio's default props and with no props,
 * containers stack all panels in Interface but show one in Preview, and charts count injected
 * rows by `groupBy`.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import type { Block, Mode, ProjectMeta } from '@/contracts'
import { safeParseBlock } from '@/contracts'
import { createRegistry } from '@/engine/registry'
import { createEngine, EngineKey } from '@/engine/engine'
import { CapabilitiesKey, capabilitiesFor, ModeKey } from '@/engine/mode'
import { HostKey, noopHost, type SandboxHost } from '@/engine/host'
import BlockRenderer from '@/engine/BlockRenderer.vue'
import { useSandboxStore } from '@/state'
import BarChart from '@/blocks/BarChart.vue'
import DonutChart from '@/blocks/DonutChart.vue'
import StackedChart from '@/blocks/StackedChart.vue'
import ListBlock from '@/blocks/ListBlock.vue'
import DetailBlock from '@/blocks/DetailBlock.vue'
import { listProp, columnKeys } from '@/blocks/blockUtils'

/** Studio `defaultProps()` per type, as the adapter sends them (`{ title, ...props }`). */
const STUDIO_DEFAULTS: Record<string, Record<string, unknown>> = {
  divider: {},
  spacer: { size: 24 },
  badge: { text: 'New', variant: 'primary', size: 'md' },
  breadcrumb: { items: ['Home', 'Work orders', 'WO-1042'] },
  empty: { title: 'Nothing here yet', text: 'Create the first one to get started.', icon: 'inbox', buttonLabel: 'Create' },
  alert: { title: 'Heads up', variant: 'warning', text: 'Something people should know.' },
  steps: { steps: ['Requested', 'Scheduled', 'In progress', 'Done'], current: 1 },
  progress: { title: 'Progress' },
  timeline: { title: 'Timeline' },
  calendar: { title: 'Calendar', source: 'work_orders' },
  segmented: { title: 'Priority', options: ['Low', 'Normal', 'High'], variant: 'primary', outlined: true },
  richtext: { title: 'Notes', mode: 'edit', minHeight: 140 },
  gauge: { title: 'Jobs done on time', value: 72, max: 100, unit: '%' },
  list: { title: 'Work orders', source: 'work_orders', columns: ['title', 'status', 'technician'], filter: 'none' },
  detail: { title: 'Details', source: 'work_orders', columns: ['title', 'status', 'technician', 'created'] },
  bar: { title: 'Bar chart' },
  line: { title: 'Line chart' },
  donut: { title: 'Donut chart' },
  area: { title: 'Area chart' },
  pie: { title: 'Pie chart' },
  hbar: { title: 'Horizontal bars' },
  stacked: { title: 'Stacked bars', seriesBy: 'priority' },
  funnel: { title: 'Funnel' },
  scatter: { title: 'Scatter plot', xField: 'id', yField: 'id' },
  tabs: { tabs: ['Details', 'Parts', 'Photos'], position: 'top', gap: 16 },
  accordion: { panels: ['General', 'Details', 'History'], open: 'first', gap: 16 },
}
const UIKIT_KEYS = Object.keys(STUDIO_DEFAULTS)

describe('Studio UI kit registration', () => {
  const registry = createRegistry()

  it('registers every UI kit type as a builtin', () => {
    expect(UIKIT_KEYS).toHaveLength(26)
    for (const key of UIKIT_KEYS) {
      expect(registry.layerOf(key), `missing/wrong layer: ${key}`).toBe('builtin')
      expect(registry.resolve(key)).not.toBe(registry.fallback)
    }
  })

  it('accepts the adapter node shape in the block schema', () => {
    for (const key of UIKIT_KEYS) {
      const node: Block = {
        id: `b-${key}`,
        component: key,
        props: STUDIO_DEFAULTS[key],
        query: { table: 'work_orders', columns: ['title', 'status'] },
      }
      expect(safeParseBlock(node).success, key).toBe(true)
    }
  })
})

describe('Studio UI kit blocks mount', () => {
  const registry = createRegistry({ includeUiKit: false })
  for (const key of UIKIT_KEYS) {
    it(`"${key}" mounts with no props and with Studio defaults`, () => {
      const component = registry.resolve(key)
      const bare = mount(component)
      expect(bare.html()).toBeTruthy()
      bare.unmount()
      const withDefaults = mount(component, { props: STUDIO_DEFAULTS[key] })
      expect(withDefaults.html()).toBeTruthy()
      withDefaults.unmount()
    })
  }

  it('accepts list props as a comma or newline separated string', () => {
    expect(listProp('A, B\nC')).toEqual(['A', 'B', 'C'])
    expect(listProp(['A', ' B '])).toEqual(['A', 'B'])
    expect(columnKeys([{ key: 'id' }, 'title'])).toEqual(['id', 'title'])
    const crumbs = mount(registry.resolve('breadcrumb'), { props: { items: 'Home\nOrders\nWO-7' } })
    expect(crumbs.text()).toContain('WO-7')
  })
})

describe('charts group injected rows by groupBy', () => {
  const rows = [
    { id: 1, status: 'open', priority: 'high' },
    { id: 2, status: 'done', priority: 'low' },
    { id: 3, status: 'open', priority: 'low' },
    { id: 4, status: 'open', priority: 'high' },
  ]

  it('bar counts per group', () => {
    const w = mount(BarChart, { props: { title: 'By status', rows, groupBy: 'status' } })
    const bars = w.findAll('[data-label]').map((b) => [b.attributes('data-label'), b.attributes('data-value')])
    expect(bars).toEqual([
      ['open', '3'],
      ['done', '1'],
    ])
  })

  it('donut counts per group and totals', () => {
    const w = mount(DonutChart, { props: { rows, groupBy: 'priority' } })
    const items = w.findAll('[data-label]').map((b) => [b.attributes('data-label'), b.attributes('data-value')])
    expect(items).toEqual([
      ['high', '2'],
      ['low', '2'],
    ])
    expect(w.text()).toContain('4')
  })

  it('stacked splits by seriesBy', () => {
    const w = mount(StackedChart, { props: { rows, groupBy: 'status', seriesBy: 'priority' } })
    const cols = w.findAll('[data-label]').map((b) => [b.attributes('data-label'), b.attributes('data-value')])
    expect(cols).toEqual([
      ['open', '3'],
      ['done', '1'],
    ])
  })

  it('falls back to sample data without groupBy', () => {
    const w = mount(BarChart, { props: { rows } })
    expect(w.findAll('[data-label]').map((b) => b.attributes('data-label'))).toContain('Oct')
  })
})

describe('data-bound records', () => {
  it('list renders one card per row with the first column as title', () => {
    const w = mount(ListBlock, {
      props: { rows: [{ id: 1, title: 'Fix boiler', status: 'open' }], columns: ['title', 'status'] },
    })
    expect(w.findAll('.pl-list__item')).toHaveLength(1)
    expect(w.find('.pl-list__name').text()).toBe('Fix boiler')
    expect(w.find('.pl-list__meta').text()).toContain('open')
  })

  it('list and detail show sample data without rows', () => {
    expect(mount(ListBlock, { props: { columns: ['title'] } }).findAll('.pl-list__item').length).toBeGreaterThan(0)
    const d = mount(DetailBlock, { props: { columns: ['title', 'status'] } })
    expect(d.findAll('.pl-detail__field')).toHaveLength(2)
    expect(d.text()).not.toContain('—')
  })

  it('detail shows the first row for the given columns', () => {
    const d = mount(DetailBlock, {
      props: { rows: [{ id: 9, title: 'Roof leak', status: 'done' }], columns: 'title, status' },
    })
    expect(d.text()).toContain('Roof leak')
    expect(d.text()).toContain('Status')
    expect(d.text()).not.toContain('9')
  })
})

// ---- Full renderer path (EngineProvider-equivalent wiring) -----------------------------------

const META: ProjectMeta = {
  schemaVersion: 1,
  id: 'uikit',
  name: 'UI kit',
  theme: { tokens: {} },
  roles: [],
  data_models: [
    {
      table: 'work_orders',
      columns: [
        { name: 'id', type: 'number' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'string' },
      ],
      seed: [
        { id: 1, title: 'A', status: 'open' },
        { id: 2, title: 'B', status: 'open' },
        { id: 3, title: 'C', status: 'done' },
      ],
    },
  ],
  custom_components: [],
  global_state: {},
  global_hooks: [],
  menu: [],
  pages: [{ id: 'p', label: 'P', path: '/', blocks: [] }],
}

const host: SandboxHost = noopHost()

function renderBlocks(blocks: Block[], mode: Mode) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSandboxStore().loadMeta(META, { mode })
  const engine = createEngine({ meta: META, mode })
  const modeRef = ref<Mode>(mode)
  const caps = computed(() => capabilitiesFor(modeRef.value, 'mock'))
  const Harness = defineComponent({
    setup: () => () => blocks.map((b) => h(BlockRenderer, { block: b, key: b.id })),
  })
  return mount(Harness, {
    attachTo: document.body,
    global: {
      plugins: [pinia],
      provide: {
        [EngineKey as symbol]: engine,
        [ModeKey as symbol]: modeRef,
        [CapabilitiesKey as symbol]: caps,
        [HostKey as symbol]: host,
      },
    },
  })
}

const panel = (id: string, text: string): Block => ({
  id,
  component: 'column',
  props: { gap: 16 },
  children: [{ id: `${id}-t`, component: 'text', props: { text } }],
})

const tabsNode: Block = {
  id: 'tabs1',
  component: 'tabs',
  props: { tabs: ['One', 'Two', 'Three'], position: 'top', gap: 16 },
  children: [panel('tabs1~0', 'Alpha'), panel('tabs1~1', 'Beta'), panel('tabs1~2', 'Gamma')],
}

const accordionNode: Block = {
  id: 'acc1',
  component: 'accordion',
  props: { panels: 'One\nTwo\nThree', open: 'first' },
  children: [panel('acc1~0', 'Alpha'), panel('acc1~1', 'Beta'), panel('acc1~2', 'Gamma')],
}

describe('tabs / accordion containers', () => {
  it('tabs: Interface stacks every panel under its label', () => {
    const w = renderBlocks([tabsNode], 'interface')
    const panels = w.findAll('.pl-tabs__panel')
    expect(panels).toHaveLength(3)
    expect(panels.map((p) => p.find('.pl-tabs__panel-label').text())).toEqual(['TabOne', 'TabTwo', 'TabThree'])
    for (const t of ['Alpha', 'Beta', 'Gamma']) expect(w.text()).toContain(t)
    // Each panel is the real `column` block, so it stays selectable / droppable.
    expect(w.findAll('[data-component="column"][data-block-id^="tabs1~"]')).toHaveLength(3)
    w.unmount()
  })

  it('tabs: Preview renders only the active panel and switches', async () => {
    const w = renderBlocks([tabsNode], 'preview')
    expect(w.text()).toContain('Alpha')
    expect(w.text()).not.toContain('Beta')
    expect(w.text()).not.toContain('Gamma')
    expect(w.findAll('[role="tab"]')).toHaveLength(3)
    w.unmount()
  })

  it('tabs: an empty container keeps the Drop here zone in Interface', () => {
    const w = renderBlocks([{ ...tabsNode, children: [] }], 'interface')
    expect(w.find('.pl-block__drop-zone').exists()).toBe(true)
    w.unmount()
  })

  it('accordion: Interface shows every panel open', () => {
    const w = renderBlocks([accordionNode], 'interface')
    const bodies = w.findAll('.pl-accordion__body')
    expect(bodies).toHaveLength(3)
    expect(bodies.every((b) => b.isVisible())).toBe(true)
    expect(w.findAll('.pl-accordion__label').map((l) => l.text())).toEqual(['One', 'Two', 'Three'])
    w.unmount()
  })

  it('accordion: Preview opens one panel and toggles', async () => {
    const w = renderBlocks([accordionNode], 'preview')
    const visible = () => w.findAll('.pl-accordion__body').filter((b) => b.isVisible()).map((b) => b.text())
    expect(visible()).toEqual(['Alpha'])
    await w.findAll('button.pl-accordion__head')[1]!.trigger('click')
    expect(visible()).toEqual(['Beta'])
    w.unmount()
  })
})

describe('charts through the renderer query path', () => {
  it('bar groups the mock rows injected from query', () => {
    const w = renderBlocks(
      [{ id: 'c', component: 'bar', props: { title: 'By status', groupBy: 'status' }, query: { table: 'work_orders' } }],
      'interface',
    )
    const bars = w.findAll('[data-label]').map((b) => [b.attributes('data-label'), b.attributes('data-value')])
    expect(bars).toEqual([
      ['open', '2'],
      ['done', '1'],
    ])
    w.unmount()
  })

  it('list renders the mock rows injected from query', () => {
    const w = renderBlocks(
      [
        {
          id: 'l',
          component: 'list',
          props: { title: 'Orders', columns: ['title', 'status'] },
          query: { table: 'work_orders', columns: ['title', 'status'] },
        },
      ],
      'interface',
    )
    expect(w.findAll('.pl-list__name').map((n) => n.text())).toEqual(['A', 'B', 'C'])
    w.unmount()
  })
})
