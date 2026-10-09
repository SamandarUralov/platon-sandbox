/**
 * Registry contract (SPEC §3): every palette key this worker adds must resolve
 * from the `builtin` layer, and the foundation's reference blocks must stay
 * registered (additive-only change).
 */
import { describe, it, expect } from 'vitest'
import { createRegistry } from '@/engine/registry'

const NEW_PALETTE_KEYS = [
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

const FOUNDATION_KEYS = ['page_header', 'stat_group', 'data_table'] as const

describe('palette registration', () => {
  const registry = createRegistry()

  it('registers every new palette key as a builtin', () => {
    for (const key of NEW_PALETTE_KEYS) {
      expect(registry.has(key), `missing key: ${key}`).toBe(true)
      expect(registry.layerOf(key), `wrong layer: ${key}`).toBe('builtin')
      expect(registry.resolve(key)).not.toBe(registry.fallback)
    }
  })

  it('keeps the foundation reference blocks registered (additive only)', () => {
    for (const key of FOUNDATION_KEYS) {
      expect(registry.layerOf(key)).toBe('builtin')
    }
  })

  it('still falls back to Unknown for unregistered keys (never throws)', () => {
    expect(registry.has('does_not_exist')).toBe(false)
    expect(registry.resolve('does_not_exist')).toBe(registry.fallback)
    expect(registry.layerOf('does_not_exist')).toBeNull()
  })
})
