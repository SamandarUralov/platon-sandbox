/**
 * Query DSL parser tests (SPEC §6): count / where / equality, structured form,
 * literal coercion, and v1-scope error handling.
 */
import { describe, expect, it } from 'vitest'
import {
  QueryParseError,
  coerceLiteral,
  createQueryParser,
  defaultQueryParser,
  parseQueryText,
} from './queryParser'

describe('coerceLiteral', () => {
  it('coerces integers and floats to numbers', () => {
    expect(coerceLiteral('42')).toBe(42)
    expect(coerceLiteral('-7')).toBe(-7)
    expect(coerceLiteral('3.14')).toBe(3.14)
  })

  it('coerces booleans and null', () => {
    expect(coerceLiteral('true')).toBe(true)
    expect(coerceLiteral('false')).toBe(false)
    expect(coerceLiteral('null')).toBeNull()
  })

  it('strips matching quotes and keeps inner text verbatim', () => {
    expect(coerceLiteral("'open'")).toBe('open')
    expect(coerceLiteral('"in progress"')).toBe('in progress')
    expect(coerceLiteral("'true'")).toBe('true') // quoted → stays a string
  })

  it('leaves bare identifiers as strings', () => {
    expect(coerceLiteral('open')).toBe('open')
  })
})

describe('parseQueryText', () => {
  it('parses a bare table name → all rows, no aggregate', () => {
    expect(parseQueryText('work_orders')).toEqual({
      table: 'work_orders',
      where: [],
      aggregate: null,
    })
  })

  it('parses count(table) as a count aggregate', () => {
    expect(parseQueryText('count(work_orders)')).toEqual({
      table: 'work_orders',
      where: [],
      aggregate: 'count',
    })
  })

  it('parses count(table where col = value) with equality', () => {
    expect(parseQueryText('count(work_orders where status = open)')).toEqual({
      table: 'work_orders',
      where: [{ column: 'status', op: 'eq', value: 'open' }],
      aggregate: 'count',
    })
  })

  it('parses a where clause without count (returns rows)', () => {
    expect(parseQueryText('work_orders where priority = high')).toEqual({
      table: 'work_orders',
      where: [{ column: 'priority', op: 'eq', value: 'high' }],
      aggregate: null,
    })
  })

  it('coerces the where value by type', () => {
    expect(parseQueryText('count(tasks where id = 5)').where[0].value).toBe(5)
    expect(parseQueryText('count(tasks where done = true)').where[0].value).toBe(true)
    expect(parseQueryText("count(tasks where status = 'in progress')").where[0].value).toBe(
      'in progress',
    )
  })

  it('accepts == as an equality operator', () => {
    expect(parseQueryText('count(t where a == 1)').where[0]).toEqual({
      column: 'a',
      op: 'eq',
      value: 1,
    })
  })

  it('is case-insensitive for the count/where keywords', () => {
    expect(parseQueryText('COUNT(work_orders WHERE status = open)')).toEqual({
      table: 'work_orders',
      where: [{ column: 'status', op: 'eq', value: 'open' }],
      aggregate: 'count',
    })
  })

  it('throws on empty input', () => {
    expect(() => parseQueryText('   ')).toThrow(QueryParseError)
  })

  it('throws on an unsupported where clause (v1 = single equality)', () => {
    expect(() => parseQueryText('count(t where a > 1)')).toThrow(QueryParseError)
  })

  it('throws on an invalid table name', () => {
    expect(() => parseQueryText('count(123bad)')).toThrow(QueryParseError)
  })
})

describe('createQueryParser / structured form', () => {
  const parser = createQueryParser()

  it('normalizes the structured {table, columns, filter} binding', () => {
    expect(
      parser.parse({
        table: 'work_orders',
        columns: ['id', 'status'],
        filter: { status: 'open', priority: 'high' },
      }),
    ).toEqual({
      table: 'work_orders',
      columns: ['id', 'status'],
      where: [
        { column: 'status', op: 'eq', value: 'open' },
        { column: 'priority', op: 'eq', value: 'high' },
      ],
      aggregate: null,
    })
  })

  it('handles a structured table-only binding', () => {
    expect(parser.parse({ table: 'checklist_items' })).toEqual({
      table: 'checklist_items',
      columns: undefined,
      where: [],
      aggregate: null,
    })
  })

  it('routes strings through the text parser', () => {
    expect(parser.parse('count(work_orders)').aggregate).toBe('count')
  })

  it('exposes a shared default instance', () => {
    expect(defaultQueryParser.parse('work_orders').table).toBe('work_orders')
  })
})
