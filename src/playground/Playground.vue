<script setup lang="ts">
/**
 * Mock-studio PLAYGROUND (test harness).
 *
 * Simulates the Studio so the Sandbox runtime can be exercised end-to-end
 * WITHOUT the real Studio. It embeds the Sandbox as an <iframe> and drives it
 * over the foundation postMessage protocol (SPEC §1):
 *
 *   - a meta-JSON editor  → `init` (full re-seed, validated locally first)
 *   - Interface / Preview → `set-mode`
 *   - "Preview as <role>" → `set-role`
 *   - page buttons        → `navigate`
 *   - a patch row         → `patch` (demonstrates `{blockId,path,value}` edits)
 *
 * Inbound `ready` / `console` / `error` / `block-selected` messages are streamed
 * into the bottom Console panel (SPEC §9). On boot it seeds the canonical
 * FieldOps demo (SPEC §12) so the harness is useful immediately.
 *
 * Owned by the test-harness worker; it only consumes foundation modules.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Mode, ProjectMeta } from '@/contracts'
import { parseProjectMeta } from '@/contracts'
import { fieldOpsMeta } from '@/demo/fieldops'
import { StudioBridge } from './studioBridge'
import ConsolePanel, { type LogEntry } from './ConsolePanel.vue'

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const metaText = ref(JSON.stringify(fieldOpsMeta, null, 2))
const mode = ref<Mode>('interface')
const role = ref<string | null>(null)
const currentPageId = ref<string | null>(null)
const metaError = ref<string | null>(null)

/** Last successfully-parsed meta (drives role/page pickers). */
const meta = shallowRef<ProjectMeta>(fieldOpsMeta)

const roles = computed<string[]>(() => meta.value.roles ?? [])
const pages = computed(() => meta.value.pages ?? [])

const iframe = ref<HTMLIFrameElement | null>(null)
const bridge = new StudioBridge()
const sandboxReady = ref(false)

const log = ref<LogEntry[]>([])
let logSeq = 0

function pushLog(entry: Omit<LogEntry, 'id'>) {
  log.value = [...log.value.slice(-299), { id: logSeq++, ...entry }]
}

/* ------------------------------------------------------------------ *
 * Protocol: Sandbox → Studio
 * ------------------------------------------------------------------ */

function handleSandboxMessage(msg: Parameters<Parameters<StudioBridge['onSandboxMessage']>[0]>[0]) {
  switch (msg.type) {
    case 'ready':
      sandboxReady.value = true
      pushLog({ level: 'event', text: `sandbox ready (protocol v${msg.protocolVersion})` })
      sendInit()
      break
    case 'console':
      pushLog({ level: msg.level, text: msg.args.map(fmt).join(' ') })
      break
    case 'error':
      pushLog({
        level: 'error',
        text: msg.message,
        source: msg.source?.blockId ?? msg.source?.pageId,
      })
      break
    case 'block-selected':
      pushLog({ level: 'event', text: `block-selected: ${msg.blockId ?? '(none)'}` })
      break
    case 'block-hover':
      // Hover is high-frequency; keep it out of the log to stay readable.
      break
    case 'drop-target':
      pushLog({ level: 'event', text: `drop-target: parent=${msg.parentId ?? 'root'} index=${msg.index}` })
      break
  }
}

function fmt(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/* ------------------------------------------------------------------ *
 * Protocol: Studio → Sandbox
 * ------------------------------------------------------------------ */

function sendInit() {
  bridge.send({
    type: 'init',
    meta: meta.value,
    mode: mode.value,
    pageId: currentPageId.value ?? undefined,
    role: role.value,
  })
  pushLog({ level: 'event', text: `→ init (${meta.value.id}, ${mode.value})` })
}

/** Validate the editor JSON and, if valid, re-seed the sandbox. */
function applyMeta() {
  let raw: unknown
  try {
    raw = JSON.parse(metaText.value)
  } catch (err) {
    metaError.value = `JSON parse error: ${String(err)}`
    pushLog({ level: 'error', text: metaError.value })
    return
  }
  try {
    const parsed = parseProjectMeta(raw)
    meta.value = parsed
    metaError.value = null
    // Keep current page if it still exists, else default to first.
    if (!parsed.pages.some((p) => p.id === currentPageId.value)) {
      currentPageId.value = parsed.pages[0]?.id ?? null
    }
    // Reset role if it's no longer a defined role.
    if (role.value && !parsed.roles.includes(role.value)) role.value = null
    sendInit()
  } catch (err) {
    metaError.value = `meta validation failed: ${String(err)}`
    pushLog({ level: 'error', text: metaError.value })
  }
}

function setMode(next: Mode) {
  mode.value = next
  bridge.send({ type: 'set-mode', mode: next })
  pushLog({ level: 'event', text: `→ set-mode ${next}` })
}

function setRole(next: string | null) {
  role.value = next
  bridge.send({ type: 'set-role', role: next })
  pushLog({ level: 'event', text: `→ set-role ${next ?? '(all)'}` })
}

function navigate(pageId: string) {
  currentPageId.value = pageId
  bridge.send({ type: 'navigate', pageId })
  pushLog({ level: 'event', text: `→ navigate ${pageId}` })
}

/* --- quick patch demo --------------------------------------------- */
const patchBlockId = ref('dash-header')
const patchPath = ref('props.title')
const patchValue = ref('"Patched title"')

function sendPatch() {
  let value: unknown = patchValue.value
  try {
    value = JSON.parse(patchValue.value)
  } catch {
    /* fall back to raw string */
  }
  bridge.send({ type: 'patch', patch: { blockId: patchBlockId.value, path: patchPath.value, value } })
  pushLog({ level: 'event', text: `→ patch ${patchBlockId.value}.${patchPath.value}` })
}

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

let unsubscribe: (() => void) | null = null

function onFrameLoad() {
  bridge.attach(iframe.value?.contentWindow ?? null)
  // If the sandbox already announced readiness before we attached, (re)seed.
  if (sandboxReady.value) sendInit()
}

onMounted(() => {
  currentPageId.value = meta.value.pages[0]?.id ?? null
  bridge.start()
  unsubscribe = bridge.onSandboxMessage(handleSandboxMessage)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  bridge.stop()
})
</script>

<template>
  <div class="pg" data-testid="playground">
    <header class="pg__topbar">
      <div class="pg__brand">
        <span class="pg__logo">▦</span>
        <div>
          <strong>Sandbox Playground</strong>
          <small>mock studio · drives the sandbox over postMessage</small>
        </div>
      </div>
      <div class="pg__status" :class="{ 'pg__status--on': sandboxReady }" data-testid="sandbox-status">
        {{ sandboxReady ? 'sandbox connected' : 'waiting for sandbox…' }}
      </div>
    </header>

    <div class="pg__body">
      <!-- Controls -->
      <aside class="pg__panel">
        <section class="pg__group">
          <label class="pg__label">Mode</label>
          <div class="pg__seg" role="group" aria-label="mode">
            <button
              type="button"
              class="pg__seg-btn"
              :class="{ 'pg__seg-btn--active': mode === 'interface' }"
              data-testid="mode-interface"
              @click="setMode('interface')"
            >
              Interface
            </button>
            <button
              type="button"
              class="pg__seg-btn"
              :class="{ 'pg__seg-btn--active': mode === 'preview' }"
              data-testid="mode-preview"
              @click="setMode('preview')"
            >
              Preview
            </button>
          </div>
        </section>

        <section class="pg__group">
          <label class="pg__label" for="role-select">Preview as role</label>
          <select
            id="role-select"
            class="pg__select"
            data-testid="role-select"
            :value="role ?? ''"
            :disabled="mode !== 'preview'"
            @change="setRole(($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">— all roles —</option>
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
          <small v-if="mode !== 'preview'" class="pg__hint">Role switching is active in Preview.</small>
        </section>

        <section class="pg__group">
          <label class="pg__label">Pages</label>
          <div class="pg__pages">
            <button
              v-for="p in pages"
              :key="p.id"
              type="button"
              class="pg__page-btn"
              :class="{ 'pg__page-btn--active': p.id === currentPageId }"
              :data-testid="`page-${p.id}`"
              @click="navigate(p.id)"
            >
              {{ p.label }}
            </button>
          </div>
        </section>

        <section class="pg__group">
          <label class="pg__label">Quick patch</label>
          <input v-model="patchBlockId" class="pg__input" placeholder="blockId" data-testid="patch-block" />
          <input v-model="patchPath" class="pg__input" placeholder="path (props.title)" data-testid="patch-path" />
          <input v-model="patchValue" class="pg__input" placeholder='value (JSON)' data-testid="patch-value" />
          <button type="button" class="pg__btn" data-testid="patch-send" @click="sendPatch">Send patch</button>
        </section>

        <section class="pg__group pg__group--grow">
          <label class="pg__label" for="meta-editor">Project meta (JSON)</label>
          <textarea
            id="meta-editor"
            v-model="metaText"
            class="pg__editor"
            spellcheck="false"
            data-testid="meta-editor"
          />
          <p v-if="metaError" class="pg__meta-error" data-testid="meta-error">{{ metaError }}</p>
          <button type="button" class="pg__btn pg__btn--primary" data-testid="apply-meta" @click="applyMeta">
            Apply meta (re-init)
          </button>
        </section>
      </aside>

      <!-- Sandbox iframe + console -->
      <main class="pg__stage">
        <div class="pg__frame-wrap">
          <iframe
            ref="iframe"
            class="pg__frame"
            data-testid="sandbox-frame"
            src="/index.html"
            title="Platon Sandbox"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            @load="onFrameLoad"
          />
        </div>
        <ConsolePanel :entries="log" @clear="log = []" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f1f5f9;
  color: #0f172a;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.pg__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: #0f172a;
  color: #e2e8f0;
  flex-shrink: 0;
}
.pg__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pg__logo {
  font-size: 22px;
  color: #818cf8;
}
.pg__brand small {
  display: block;
  color: #94a3b8;
  font-size: 12px;
}
.pg__status {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  background: #334155;
  color: #cbd5e1;
}
.pg__status--on {
  background: #14532d;
  color: #86efac;
}
.pg__body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.pg__panel {
  width: 320px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
}
.pg__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pg__group--grow {
  flex: 1;
  min-height: 220px;
}
.pg__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
.pg__seg {
  display: flex;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
}
.pg__seg-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  color: #475569;
}
.pg__seg-btn--active {
  background: #6366f1;
  color: #ffffff;
  font-weight: 600;
}
.pg__select,
.pg__input {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  background: #ffffff;
}
.pg__select:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}
.pg__hint {
  color: #94a3b8;
  font-size: 11px;
}
.pg__pages {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pg__page-btn {
  text-align: left;
  padding: 7px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  color: #334155;
}
.pg__page-btn--active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 600;
}
.pg__btn {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  color: #334155;
}
.pg__btn--primary {
  background: #6366f1;
  border-color: #6366f1;
  color: #ffffff;
  font-weight: 600;
  margin-top: 6px;
}
.pg__editor {
  flex: 1;
  min-height: 160px;
  resize: vertical;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.45;
  tab-size: 2;
}
.pg__meta-error {
  margin: 0;
  color: #dc2626;
  font-size: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 10px;
}
.pg__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pg__frame-wrap {
  flex: 1;
  min-height: 0;
  padding: 16px;
  background: #f1f5f9;
}
.pg__frame {
  width: 100%;
  height: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.pg__stage :deep(.pg-console) {
  height: 220px;
}
</style>
