import { describe, it, expect } from 'vitest'
import * as Vue from 'vue'
import { createImportMap, type ModuleNamespace } from '@/importmap'
import { createRegistry } from '../registry'
import { compileCustomComponent, registerCustomComponents } from '../customComponents'
import { CompileError } from '../instrument'

function importMapWithVue() {
  const map = createImportMap()
  map.register('vue', Vue as unknown as ModuleNamespace)
  return map
}

describe('compileCustomComponent (SPEC §3/§4)', () => {
  it('compiles a template-based vue component', () => {
    const comp = compileCustomComponent(
      { id: 'c1', name: 'Hello', kind: 'vue', code: 'export default { template: "<div>hi</div>" }' },
      { importMap: importMapWithVue() },
    )
    expect((comp as { template?: string }).template).toBe('<div>hi</div>')
    expect((comp as { name?: string }).name).toBe('Hello')
  })

  it('compiles a render-function component that imports from vue', () => {
    const comp = compileCustomComponent(
      {
        id: 'c2',
        name: 'Rendered',
        kind: 'js',
        code: `import { h } from 'vue'\nexport default { render() { return h('div', 'x') } }`,
      },
      { importMap: importMapWithVue() },
    )
    expect(typeof (comp as { render?: unknown }).render).toBe('function')
  })

  it('throws when the module does not export a component', () => {
    expect(() =>
      compileCustomComponent(
        { id: 'c3', name: 'Bad', kind: 'js', code: 'export default 123' },
        { importMap: importMapWithVue() },
      ),
    ).toThrow(CompileError)
  })
})

describe('registerCustomComponents', () => {
  it('registers compiled components under id and name, skipping failures', () => {
    const registry = createRegistry({ includeUiKit: false })
    const errors: unknown[] = []
    registerCustomComponents(
      [
        { id: 'ok', name: 'Widget', kind: 'vue', code: 'export default { template: "<span/>" }' },
        { id: 'broken', name: 'Broken', kind: 'js', code: 'export default (' },
      ],
      registry,
      { importMap: importMapWithVue(), onError: (e) => errors.push(e) },
    )
    expect(registry.has('ok')).toBe(true)
    expect(registry.has('Widget')).toBe(true)
    expect(registry.layerOf('ok')).toBe('custom')
    expect(registry.has('broken')).toBe(false)
    expect(errors).toHaveLength(1)
  })
})
