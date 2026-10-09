/**
 * CRUD permission matrix tests (SPEC §7). Gating is visual-only; these verify
 * the role × operation verdicts the Preview shell renders.
 */
import { describe, expect, it } from 'vitest'
import { fieldOpsMeta } from '@/demo/fieldops'
import type { Block, BlockPermissions } from '@/contracts'
import { CRUD_MATRIX_OPS, can, capabilitiesFor, hasPermissions, permissionMatrix } from './permissions'

const ROLES = fieldOpsMeta.roles // ['admin','dispatcher','technician','customer']

function block(pageId: string, blockId: string): Block {
  const page = fieldOpsMeta.pages.find((p) => p.id === pageId)!
  const b = page.blocks.find((x) => x.id === blockId)
  if (!b) throw new Error(`missing block ${blockId}`)
  return b
}

const woTable = () => block('work_orders', 'wo-table').permissions as BlockPermissions
const clTable = () => block('job_checklist', 'cl-table').permissions as BlockPermissions

describe('can', () => {
  it('restricts create/edit to the listed roles', () => {
    expect(can(woTable(), 'create', 'admin')).toBe(true)
    expect(can(woTable(), 'create', 'dispatcher')).toBe(true)
    expect(can(woTable(), 'create', 'technician')).toBe(false)
    expect(can(woTable(), 'create', 'customer')).toBe(false)
  })

  it('treats "edit" as an alias of "update"', () => {
    expect(can(woTable(), 'edit', 'dispatcher')).toBe(can(woTable(), 'update', 'dispatcher'))
    expect(can(woTable(), 'edit', 'dispatcher')).toBe(true)
    expect(can(woTable(), 'edit', 'technician')).toBe(false)
  })

  it('narrows delete to admins only', () => {
    expect(can(woTable(), 'delete', 'admin')).toBe(true)
    expect(can(woTable(), 'delete', 'dispatcher')).toBe(false)
    expect(can(clTable(), 'delete', 'technician')).toBe(false)
  })

  it('allows everything when no matrix / no list for the op', () => {
    const header = block('work_orders', 'wo-header')
    expect(can(header.permissions, 'create', 'customer')).toBe(true)
    expect(can({ create: ['admin'] }, 'delete', 'customer')).toBe(true) // delete unlisted
  })

  it('never restricts a null active role', () => {
    expect(can(woTable(), 'delete', null)).toBe(true)
    expect(can(woTable(), 'create', null)).toBe(true)
  })
})

describe('capabilitiesFor', () => {
  it('summarises a role in one object', () => {
    expect(capabilitiesFor(woTable(), 'dispatcher')).toEqual({
      create: true,
      read: true,
      update: true,
      delete: false,
    })
    expect(capabilitiesFor(woTable(), 'technician')).toEqual({
      create: false,
      read: true,
      update: false,
      delete: false,
    })
  })
})

describe('permissionMatrix', () => {
  it('produces a cell for every role × write-op', () => {
    const cells = permissionMatrix(woTable(), ROLES)
    expect(cells).toHaveLength(ROLES.length * CRUD_MATRIX_OPS.length)
  })

  it('marks restricted ops and the right verdicts', () => {
    const cells = permissionMatrix(woTable(), ROLES)
    const find = (role: string, op: string) => cells.find((c) => c.role === role && c.op === op)!
    expect(find('dispatcher', 'create').allowed).toBe(true)
    expect(find('dispatcher', 'create').restricted).toBe(true)
    expect(find('technician', 'create').allowed).toBe(false)
    expect(find('dispatcher', 'delete').allowed).toBe(false)
    expect(find('admin', 'delete').allowed).toBe(true)
  })

  it('exposes the Edit label for the update op', () => {
    expect(CRUD_MATRIX_OPS.map((o) => o.label)).toEqual(['Create', 'Edit', 'Delete'])
  })
})

describe('hasPermissions', () => {
  it('is true only when a block declares a CRUD restriction', () => {
    expect(hasPermissions(woTable())).toBe(true)
    expect(hasPermissions(block('work_orders', 'wo-header').permissions)).toBe(false)
    expect(hasPermissions(undefined)).toBe(false)
    expect(hasPermissions({ create: [] })).toBe(false)
  })
})
