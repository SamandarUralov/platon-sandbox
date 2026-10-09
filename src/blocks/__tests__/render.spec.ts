/**
 * Every palette block must mount with default (empty) props without throwing and
 * produce DOM — the renderer only ever hands a block its (possibly absent) props,
 * so a missing prop can never crash a block (SPEC §3/§9).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRegistry } from '@/engine/registry'

// Keys contributed by this worker (the three foundation blocks are covered by
// their own foundation specs; listed here too since defaults must still render).
const PALETTE_KEYS = [
  'page_header',
  'stat_group',
  'data_table',
  'text',
  'image',
  'button',
  'numbers',
  'table',
  'pagination',
  'form',
  'text_input',
  'text_area',
  'select',
  'checkbox',
  'radio_group',
  'switch',
  'date_picker',
  'file_upload',
  'row',
  'column',
  'card',
] as const

describe('palette blocks render with default props', () => {
  const registry = createRegistry({ includeUiKit: false })

  for (const key of PALETTE_KEYS) {
    it(`renders "${key}" with no props`, () => {
      const component = registry.resolve(key)
      // Not the fallback — a real builtin is registered for the key.
      expect(registry.has(key)).toBe(true)
      expect(component).not.toBe(registry.fallback)

      const wrapper = mount(component)
      expect(wrapper.html()).toBeTruthy()
      wrapper.unmount()
    })
  }
})
