import { describe, expect, it } from 'vitest'
import { gridRowOf, layoutStyle } from '../layout'

describe('block layout', () => {
  it('turns colSpan into the span a grid row reads; only auto blocks grow into free room', () => {
    expect(layoutStyle({ colSpan: 8 })).toEqual({ '--pl-col-span': '8', '--pl-col-grow': '0' })
    expect(layoutStyle({ colSpan: 4, auto: true })).toEqual({ '--pl-col-span': '4', '--pl-col-grow': '4' })
  })

  it('clamps spans to the 12-column grid and ignores everything else', () => {
    expect(layoutStyle({ colSpan: 40 })).toEqual({ '--pl-col-span': '12', '--pl-col-grow': '0' })
    expect(layoutStyle({ colSpan: 0 })).toEqual({ '--pl-col-span': '1', '--pl-col-grow': '0' })
    expect(layoutStyle({ colSpan: Number.NaN })).toBeUndefined()
    expect(layoutStyle({ row: 2 })).toBeUndefined()
    expect(layoutStyle(undefined)).toBeUndefined()
  })
})

describe('grid row of a block', () => {
  const rowWith = (width: number) => {
    const row = document.createElement('div')
    row.className = 'pl-row pl-row--grid'
    row.getBoundingClientRect = () => ({ width }) as DOMRect
    const block = document.createElement('div')
    row.appendChild(block)
    return block
  }

  it('measures the 12-column row a block sits in', () => {
    expect(gridRowOf(rowWith(900))).toEqual({ width: 900, stacked: false })
    expect(gridRowOf(rowWith(400))).toEqual({ width: 400, stacked: true })
  })

  it('is undefined outside a grid row', () => {
    const flex = document.createElement('div')
    flex.className = 'pl-row'
    const block = document.createElement('div')
    flex.appendChild(block)
    expect(gridRowOf(block)).toBeUndefined()
    expect(gridRowOf(document.createElement('div'))).toBeUndefined()
  })
})
