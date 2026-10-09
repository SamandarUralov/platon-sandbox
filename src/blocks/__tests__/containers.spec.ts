/**
 * Nested container contract (SPEC §8): the interpreter resolves each block via
 * the registry and renders `children[]` into the component's default slot,
 * recursively. Container blocks (`row`/`column`/`card`/`form`) must expose that
 * default slot so arbitrarily deep trees render.
 *
 * This spec drives a minimal recursive renderer (the same shape as the engine's
 * BlockRenderer, minus the mode/host/store wiring) over the real registry.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, type PropType } from 'vue'
import type { Block } from '@/contracts'
import { createRegistry } from '@/engine/registry'

const registry = createRegistry({ includeUiKit: false })

const RecursiveRenderer = defineComponent({
  name: 'RecursiveRenderer',
  props: { block: { type: Object as PropType<Block>, required: true } },
  setup(props) {
    return () => {
      const component = registry.resolve(props.block.component)
      const children = props.block.children ?? []
      return h(
        component,
        { ...(props.block.props ?? {}) },
        children.length
          ? { default: () => children.map((c) => h(RecursiveRenderer, { block: c, key: c.id })) }
          : undefined,
      )
    }
  },
})

function renderTree(block: Block) {
  return mount(RecursiveRenderer, { props: { block } })
}

describe('layout containers render nested children', () => {
  it('row renders each child block', () => {
    const tree: Block = {
      id: 'r',
      component: 'row',
      children: [
        { id: 'b1', component: 'button', props: { label: 'First' } },
        { id: 'b2', component: 'button', props: { label: 'Second' } },
      ],
    }
    const wrapper = renderTree(tree)
    expect(wrapper.find('.pl-row').exists()).toBe(true)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toContain('First')
    expect(buttons[1].text()).toContain('Second')
  })

  it('column renders each child block', () => {
    const tree: Block = {
      id: 'c',
      component: 'column',
      children: [
        { id: 't1', component: 'text', props: { text: 'Alpha' } },
        { id: 't2', component: 'text', props: { text: 'Beta' } },
      ],
    }
    const wrapper = renderTree(tree)
    expect(wrapper.find('.pl-column').exists()).toBe(true)
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
  })

  it('card renders its body children', () => {
    const tree: Block = {
      id: 'card',
      component: 'card',
      props: { title: 'Profile' },
      children: [{ id: 'n', component: 'numbers', props: { label: 'Visits', value: 42 } }],
    }
    const wrapper = renderTree(tree)
    expect(wrapper.find('.pl-card').exists()).toBe(true)
    expect(wrapper.find('.pl-card__title').text()).toBe('Profile')
    expect(wrapper.find('.pl-card__body').text()).toContain('Visits')
    expect(wrapper.text()).toContain('42')
  })

  it('form renders child controls in its body', () => {
    const tree: Block = {
      id: 'f',
      component: 'form',
      props: { title: 'Sign up', submitLabel: 'Create' },
      children: [
        { id: 'in', component: 'text_input', props: { label: 'Email' } },
        { id: 'sw', component: 'switch', props: { label: 'Newsletter' } },
      ],
    }
    const wrapper = renderTree(tree)
    expect(wrapper.find('form.pl-form').exists()).toBe(true)
    expect(wrapper.find('.pl-form__body').findAll('.pl-text-input, .pl-switch').length).toBe(2)
  })

  it('renders a deeply nested card > column > row > button tree', () => {
    const tree: Block = {
      id: 'root',
      component: 'card',
      props: { title: 'Dashboard' },
      children: [
        {
          id: 'col',
          component: 'column',
          children: [
            { id: 'hd', component: 'text', props: { text: 'Welcome', variant: 'h2' } },
            {
              id: 'row',
              component: 'row',
              children: [
                { id: 'a', component: 'button', props: { label: 'Save' } },
                { id: 'b', component: 'button', props: { label: 'Delete' } },
              ],
            },
          ],
        },
      ],
    }
    const wrapper = renderTree(tree)
    // Full nesting chain is present.
    expect(wrapper.find('.pl-card .pl-column .pl-row').exists()).toBe(true)
    expect(wrapper.find('.pl-card__title').text()).toBe('Dashboard')
    expect(wrapper.find('h2.pl-text').text()).toBe('Welcome')
    const buttons = wrapper.find('.pl-row').findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Save', 'Delete'])
  })

  it('leaf blocks ignore children (no default slot) without crashing', () => {
    const tree: Block = {
      id: 'leaf',
      component: 'numbers',
      props: { label: 'Total', value: 7 },
      children: [{ id: 'ignored', component: 'text', props: { text: 'nope' } }],
    }
    const wrapper = renderTree(tree)
    expect(wrapper.find('.pl-numbers').exists()).toBe(true)
    expect(wrapper.text()).toContain('Total')
    // numbers has no default slot, so the child is not rendered.
    expect(wrapper.text()).not.toContain('nope')
  })
})
