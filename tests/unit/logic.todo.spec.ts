/**
 * Logic / action engine + lifecycle + watchdog tests (SPEC §4).
 *
 * The logic engine ships as a STUB in the foundation (see src/engine/logic.ts);
 * the real implementation — AsyncFunction compilation, the acorn+magic-string
 * loop watchdog, the action pipeline, and lifecycle-hook execution — lands in a
 * SEPARATE worker. The cases below that assert real behavior are therefore
 * `it.todo` and MUST be fleshed out + enabled once that worker integrates.
 *
 * What IS assertable today: the stub's inert contract in Interface mode.
 */
import { describe, expect, it } from 'vitest'
import { createLogicEngine } from '@/engine/logic'
import type { Ctx } from '@/contracts'

const fakeCtx = {} as Ctx

describe('logic engine — current stub contract (foundation)', () => {
  it('compile() returns an inert async callable', async () => {
    const engine = createLogicEngine({ mode: 'interface' })
    const fn = engine.compile('return 1 + 1')
    await expect(fn(fakeCtx)).resolves.toBeUndefined()
  })

  it('runActions() is a no-op in Interface mode (actions OFF — SPEC §5)', async () => {
    const engine = createLogicEngine({ mode: 'interface' })
    await expect(engine.runActions([{ type: 'toast', message: 'hi' }], fakeCtx)).resolves.toBeUndefined()
  })
})

describe('logic engine — real behavior (enable after the logic worker integrates)', () => {
  // SPEC §4: user JS compiled + invoked via AsyncFunction with ctx injected.
  it.todo('compiles a {type:"run"} action and runs it with ctx in Preview')
  it.todo('executes an ordered multi-action pipeline sequentially (SPEC §2)')

  // SPEC §4 watchdog: loop budget injected via acorn + magic-string (~100ms).
  it.todo('throws a budget error on a synchronous infinite loop (watchdog)')
  it.todo('surfaces the watchdog error to onPageError + inline error card')

  // SPEC §5: lifecycle hooks run in Preview, off in Interface.
  it.todo('runs page lifecycle hooks in order in Preview mode')
  it.todo('does NOT run lifecycle hooks in Interface mode')

  // SPEC §4: runtime-compiled custom Vue components registered dynamically.
  it.todo('compiles a custom Vue component from meta and renders it')
})

describe('preview live data (enable after the Preview data worker integrates)', () => {
  // SPEC §6: Preview resolves data via real axios + tanstack-query.
  it.todo('resolves a query-bound table from the backend in Preview mode')
  it.todo('shows real loading / error states from tanstack-query')
})
