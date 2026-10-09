/**
 * `ctx` factory (SPEC §4). Builds the fixed `ctx` object injected into user code.
 *
 * The foundation wires a working `ctx` against the store + engine services so the
 * contract is real and testable today. The imperative *execution* that consumes
 * `ctx` (compiling/running user code) is the logic engine's job (later worker).
 */

import { type InjectionKey, inject } from 'vue'
import type { Ctx, CtxBlocks, CtxState, CtxUser } from '@/contracts'
import type { EngineContext } from './engine'
import { useSandboxStore } from '@/state'

export interface BuildCtxOptions {
  engine: EngineContext
  /** Page-local reactive scratch state. */
  pageState?: Record<string, unknown>
  navigate?: Ctx['navigate']
  emit?: Ctx['emit']
}

export function buildCtx(opts: BuildCtxOptions): Ctx {
  const store = useSandboxStore()
  const { engine } = opts

  const blocks: CtxBlocks = {
    get(blockId) {
      const meta = store.meta
      if (!meta) return undefined
      for (const page of meta.pages) {
        const found = findById(page.blocks, blockId)
        if (found) return found as unknown as Record<string, unknown>
      }
      return undefined
    },
    set(blockId, path, value) {
      store.applyPatch({ blockId, path, value })
    },
  }

  const state: CtxState = {
    page: opts.pageState ?? {},
    global: store.globalState,
  }

  const user: CtxUser = {
    get role() {
      return store.role
    },
    get roles() {
      return store.roles
    },
  }

  return {
    blocks,
    state,
    query: { run: (q) => engine.query.run(q).then((r) => r) },
    navigate:
      opts.navigate ??
      ((to) => {
        store.navigateTo(to)
      }),
    http: engine.http,
    user,
    emit:
      opts.emit ??
      (() => {
        /* no-op until the event bus lands (later worker) */
      }),
  }
}

/** Page-scoped `ctx`, provided by PageRenderer and consumed by BlockRenderer. */
export const CtxKey: InjectionKey<Ctx> = Symbol('platon.ctx')

/** Inject the current page `ctx`, or undefined outside a page scope. */
export function useCtx(): Ctx | undefined {
  return inject(CtxKey, undefined)
}

function findById(
  blocks: { id: string; children?: unknown[] }[],
  id: string,
): { id: string } | null {
  for (const b of blocks) {
    if (b.id === id) return b
    const kids = b.children as { id: string; children?: unknown[] }[] | undefined
    if (kids?.length) {
      const found = findById(kids, id)
      if (found) return found
    }
  }
  return null
}
