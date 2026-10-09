import { describe, it, expect } from 'vitest'
import {
  CompileError,
  createRequire,
  createWatchdog,
  instrument,
  WatchdogError,
} from '../instrument'
import { createImportMap } from '@/importmap'

describe('instrument — loop watchdog injection', () => {
  it('injects a tick into a block-bodied for loop', () => {
    const { code } = instrument('for (let i = 0; i < 3; i++) { x++ }')
    expect(code).toContain('__pl_tick();')
    expect(code.indexOf('__pl_tick();')).toBeLessThan(code.indexOf('x++'))
  })

  it('injects a tick into every loop kind', () => {
    for (const src of [
      'while (true) { work() }',
      'do { work() } while (true)',
      'for (const x of xs) { work() }',
      'for (const k in obj) { work() }',
    ]) {
      expect(instrument(src).code).toContain('__pl_tick();')
    }
  })

  it('wraps a single-statement loop body in a block before injecting', () => {
    const { code } = instrument('while (go) step()')
    expect(code).toContain('{ __pl_tick();')
    expect(code).toContain('step()')
  })

  it('injects into nested loops independently', () => {
    const { code } = instrument('for(;;){ for(;;){ y() } }')
    expect(code.match(/__pl_tick\(\);/g)?.length).toBe(2)
  })
})

describe('instrument — import rewriting', () => {
  it('rewrites named + default + namespace imports and strips them', () => {
    const { code, imports } = instrument(
      `import def, { a, b as c } from 'pkg'\nimport * as ns from 'other'\ndef(a, c, ns)`,
    )
    expect(code).not.toContain('import ')
    expect(code).toContain(`const { default: def, a, b: c } = __pl_require("pkg");`)
    expect(code).toContain(`const ns = __pl_require("other");`)
    expect(imports).toEqual(['pkg', 'other'])
  })

  it('keeps a side-effect import as a bare resolve call', () => {
    const { code } = instrument(`import 'side-effect'`)
    expect(code).toContain(`__pl_require("side-effect");`)
  })
})

describe('instrument — export rewriting (opt-in)', () => {
  it('turns export default into a return', () => {
    const { code } = instrument('export default { template: "<div/>" }', { rewriteExports: true })
    expect(code).toContain('return (')
    expect(code).not.toContain('export default')
  })

  it('strips the keyword from a named export declaration', () => {
    const { code } = instrument('export const foo = 1', { rewriteExports: true })
    expect(code.trim()).toBe('const foo = 1')
  })
})

describe('instrument — parse failure', () => {
  it('throws a CompileError on invalid syntax', () => {
    expect(() => instrument('const = = =')).toThrow(CompileError)
  })
})

describe('createWatchdog', () => {
  it('does not throw within budget and throws past it', () => {
    let t = 0
    const tick = createWatchdog(100, () => t)
    t = 50
    expect(() => tick()).not.toThrow()
    t = 150
    expect(() => tick()).toThrow(WatchdogError)
  })

  it('reports the budget on the error', () => {
    let t = 0
    const tick = createWatchdog(40, () => t)
    t = 100
    try {
      tick()
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(WatchdogError)
      expect((err as WatchdogError).budgetMs).toBe(40)
    }
  })
})

describe('createRequire', () => {
  it('resolves a registered specifier and throws on an unknown one', () => {
    const map = createImportMap()
    map.register('vue', { ref: () => {} })
    const require = createRequire(map)
    expect(require('vue')).toHaveProperty('ref')
    expect(() => require('nope')).toThrow(CompileError)
  })
})
