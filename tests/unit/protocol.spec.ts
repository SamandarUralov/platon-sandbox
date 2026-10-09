/**
 * postMessage protocol tests (SPEC §1).
 *
 * Covers the typed envelope, both transport bridges (Sandbox + mock-studio), and
 * the init/patch effect on the sandbox store — i.e. "Studio init/patch → state
 * update", end to end at the message layer.
 */
import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  PROTOCOL_CHANNEL,
  PROTOCOL_VERSION,
  SandboxBridge,
  type StudioToSandboxMessage,
  type SandboxToStudioMessage,
  unwrap,
  wrap,
} from '@/protocol'
import { StudioBridge } from '@/playground/studioBridge'
import { useSandboxStore } from '@/state'
import { fieldOpsMeta } from '@/demo/fieldops'

/* ------------------------------------------------------------------ *
 * Envelope
 * ------------------------------------------------------------------ */

describe('envelope wrap/unwrap', () => {
  it('stamps channel + version on wrap', () => {
    const env = wrap({ type: 'ready', protocolVersion: PROTOCOL_VERSION })
    expect(env.channel).toBe(PROTOCOL_CHANNEL)
    expect(env.version).toBe(PROTOCOL_VERSION)
  })

  it('round-trips a valid envelope', () => {
    const payload: SandboxToStudioMessage = { type: 'ready', protocolVersion: PROTOCOL_VERSION }
    expect(unwrap<SandboxToStudioMessage>(wrap(payload))).toEqual(payload)
  })

  it('rejects foreign / malformed envelopes', () => {
    expect(unwrap(null)).toBeNull()
    expect(unwrap({ foo: 'bar' })).toBeNull()
    expect(unwrap({ channel: 'other', version: 1, payload: {} })).toBeNull()
    expect(unwrap({ channel: PROTOCOL_CHANNEL, version: 999, payload: {} })).toBeNull()
    expect(unwrap({ channel: PROTOCOL_CHANNEL, version: PROTOCOL_VERSION })).toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * SandboxBridge (sandbox side)
 * ------------------------------------------------------------------ */

describe('SandboxBridge', () => {
  it('posts a wrapped envelope to the target window', () => {
    const postMessage = vi.fn()
    const target = { postMessage } as unknown as Window
    const bridge = new SandboxBridge({ target, targetOrigin: '*' })
    bridge.send({ type: 'ready', protocolVersion: PROTOCOL_VERSION })
    expect(postMessage).toHaveBeenCalledTimes(1)
    const [data, origin] = postMessage.mock.calls[0]
    expect(origin).toBe('*')
    expect(unwrap<SandboxToStudioMessage>(data)).toEqual({ type: 'ready', protocolVersion: PROTOCOL_VERSION })
  })

  it('delivers inbound Studio messages to handlers, ignoring foreign ones', () => {
    const bridge = new SandboxBridge({ targetOrigin: '*' })
    bridge.start()
    const handler = vi.fn()
    bridge.onStudioMessage(handler)

    const init: StudioToSandboxMessage = { type: 'set-mode', mode: 'preview' }
    window.dispatchEvent(new MessageEvent('message', { data: wrap(init) }))
    // Foreign message (wrong channel) must be ignored.
    window.dispatchEvent(new MessageEvent('message', { data: { channel: 'x', version: 1, payload: {} } }))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(init)
    bridge.stop()
  })
})

/* ------------------------------------------------------------------ *
 * StudioBridge (mock-studio / playground side)
 * ------------------------------------------------------------------ */

describe('StudioBridge', () => {
  it('posts to the attached sandbox frame', () => {
    const postMessage = vi.fn()
    const bridge = new StudioBridge({ targetOrigin: '*' })
    bridge.attach({ postMessage } as unknown as Window)
    const msg: StudioToSandboxMessage = { type: 'navigate', pageId: 'dashboard' }
    bridge.send(msg)
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(unwrap<StudioToSandboxMessage>(postMessage.mock.calls[0][0])).toEqual(msg)
  })

  it('is a no-op when not attached to a frame', () => {
    const bridge = new StudioBridge()
    expect(() => bridge.send({ type: 'set-role', role: 'admin' })).not.toThrow()
  })

  it('receives Sandbox → Studio messages', () => {
    const bridge = new StudioBridge({ targetOrigin: '*' })
    bridge.start()
    const handler = vi.fn()
    bridge.onSandboxMessage(handler)

    const ready: SandboxToStudioMessage = { type: 'ready', protocolVersion: PROTOCOL_VERSION }
    window.dispatchEvent(new MessageEvent('message', { data: wrap(ready) }))
    expect(handler).toHaveBeenCalledWith(ready)
    bridge.stop()
  })
})

/* ------------------------------------------------------------------ *
 * init / patch → store update
 * ------------------------------------------------------------------ */

describe('init / patch effects on the sandbox store', () => {
  it('init loads meta; patch mutates the targeted block', () => {
    setActivePinia(createPinia())
    const store = useSandboxStore()

    // init
    store.loadMeta(fieldOpsMeta, { mode: 'interface' })
    expect(store.meta?.id).toBe('fieldops')
    expect(store.currentPageId).toBe('dashboard')

    // patch an existing block
    const ok = store.applyPatch({ blockId: 'dash-header', path: 'props.title', value: 'Patched Dashboard' })
    expect(ok).toBe(true)
    const header = store.meta?.pages[0].blocks.find((b) => b.id === 'dash-header')
    expect((header?.props as Record<string, unknown>)?.title).toBe('Patched Dashboard')

    // patch an unknown block is reported as a miss
    expect(store.applyPatch({ blockId: 'does-not-exist', path: 'props.x', value: 1 })).toBe(false)
  })

  it('patch can set a nested path, creating intermediate objects', () => {
    setActivePinia(createPinia())
    const store = useSandboxStore()
    store.loadMeta(fieldOpsMeta, { mode: 'interface' })
    store.applyPatch({ blockId: 'dash-header', path: 'props.meta.nested.flag', value: true })
    const header = store.meta?.pages[0].blocks.find((b) => b.id === 'dash-header')
    const props = header?.props as Record<string, any>
    expect(props.meta.nested.flag).toBe(true)
  })
})
