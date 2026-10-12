import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { emitNames, eventPayload } from '../forward'

describe('forwarding block events to the Studio', () => {
  it('reads the events a component declares', () => {
    expect(emitNames(defineComponent({ emits: ['click', 'update:modelValue'] }))).toEqual(['click', 'update:modelValue'])
    expect(emitNames(defineComponent({ emits: { change: null, 'row-click': null } }))).toEqual(['change', 'row-click'])
    expect(emitNames(defineComponent({}))).toEqual([])
    expect(emitNames(null)).toEqual([])
  })

  it('keeps plain data and drops what postMessage cannot carry', () => {
    expect(eventPayload({ id: 'r1', due: '2026-10-01', n: 2 })).toEqual({ id: 'r1', due: '2026-10-01', n: 2 })
    expect(eventPayload([1, 2])).toEqual([1, 2])
    expect(eventPayload('Daily')).toBe('Daily')
    expect(eventPayload(new MouseEvent('click'))).toBeUndefined()
    expect(eventPayload({ el: document.createElement('div'), f: () => 1, k: 'v' })).toEqual({ k: 'v' })
    expect(eventPayload(undefined)).toBeUndefined()
  })
})
