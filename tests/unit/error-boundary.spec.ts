/**
 * Error-boundary & resilience tests (SPEC §3, §9).
 *
 * Guarantees the interpreter never lets one bad block take down the page:
 *   - a block that THROWS at render → inline error card, siblings keep rendering;
 *   - an UNKNOWN component key       → red placeholder, siblings keep rendering;
 *   - a schema-INVALID block         → skipped + warned, siblings keep rendering.
 */
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import type { Block, ProjectMeta } from '@/contracts'
import { mountBlocks, ThrowingBlock } from './helpers'

const meta: ProjectMeta = {
  schemaVersion: 1,
  id: 'boundary',
  name: 'Boundary',
  theme: { tokens: {} },
  roles: [],
  data_models: [],
  custom_components: [],
  global_state: {},
  global_hooks: [],
  menu: [],
  pages: [{ id: 'p', label: 'P', path: '/', parent: null, in_menu: true, visible_to: [], blocks: [] }],
}

const before: Block = { id: 'before', component: 'page_header', props: { title: 'Before' } }
const after: Block = { id: 'after', component: 'page_header', props: { title: 'After' } }

describe('per-block error boundary', () => {
  it('shows an inline error for a throwing block and still renders siblings', async () => {
    const boom: Block = { id: 'boom', component: 'boom' }
    const { wrapper, host } = mountBlocks(meta, [before, boom, after], {
      extraComponents: { boom: ThrowingBlock },
    })
    // The boundary catches in onErrorCaptured and flips a ref; let it re-render.
    await nextTick()

    // Inline error card is shown for the failed block.
    const errorCard = wrapper.find('.pl-block-error')
    expect(errorCard.exists()).toBe(true)
    expect(errorCard.text()).toContain('intentional block explosion')

    // Siblings before AND after the failure still rendered.
    expect(wrapper.text()).toContain('Before')
    expect(wrapper.text()).toContain('After')

    // The error was reported upward (console + Studio bridge) with attribution.
    expect(host.errors.some((e) => e.blockId === 'boom')).toBe(true)
  })
})

describe('unknown component resilience', () => {
  it('renders the Unknown placeholder and keeps siblings', () => {
    const unknown: Block = { id: 'u', component: 'no_such_component' }
    const { wrapper } = mountBlocks(meta, [before, unknown, after])

    const placeholder = wrapper.find('.pl-unknown')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toContain('Unknown component')
    expect(placeholder.text()).toContain('no_such_component')

    expect(wrapper.text()).toContain('Before')
    expect(wrapper.text()).toContain('After')
  })
})

describe('invalid-block resilience', () => {
  it('skips a schema-invalid block, warns, and keeps siblings', () => {
    // Missing required `component` → zod safeParse fails (SPEC §9).
    const invalid = { id: 'bad' } as unknown as Block
    const { wrapper, host } = mountBlocks(meta, [before, invalid, after])

    // The bad block produced no DOM node.
    expect(wrapper.find('[data-block-id="bad"]').exists()).toBe(false)

    // Siblings still rendered.
    expect(wrapper.text()).toContain('Before')
    expect(wrapper.text()).toContain('After')

    // A warning was emitted for the skipped block.
    expect(host.consoles.some((c) => c.level === 'warn')).toBe(true)
  })
})
