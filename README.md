# Platon Sandbox Runtime — Foundation

A pre-built Vue 3 app that **interprets** a Studio **meta JSON** into a live app
at runtime (no per-edit build). This repo is the FOUNDATION skeleton; later
workers build the logic engine, query DSL, role switcher, and watchdog on top of
the stable contracts defined here. See the spec for the full picture.

## Run

```bash
npm install
npm run dev        # standalone: boots the FieldOps demo in Interface mode
npm run build      # vue-tsc typecheck + vite build
npm run typecheck
```

Standalone (no Studio parent) the app seeds the **FieldOps "Work orders"** demo
(`src/demo/fieldops.ts`) in Interface mode (SPEC §12).

## Architecture → SPEC map

| Area | SPEC | Module |
|------|------|--------|
| Meta contract (TS types) | §2 | `src/contracts/types.ts` |
| Meta contract (zod validation) | §2, §9 | `src/contracts/schemas.ts` |
| `ctx` execution contract | §4 | `src/contracts/ctx.ts` |
| postMessage protocol (typed, 2-way) | §1 | `src/protocol/` (`messages.ts`, `bridge.ts`) |
| Import map + esm.sh stub | §4 | `src/importmap/` |
| Mode flag (`interface`/`preview`) | §5 | `src/engine/mode.ts` |
| Component registry (3 layers) | §3 | `src/engine/registry.ts` |
| Built-in blocks | §3 | `src/blocks/` (`PageHeader`, `StatGroup`, `DataTable`, `FallbackUnknown`) |
| Recursive renderer + per-block error boundary | §8, §9 | `src/engine/BlockRenderer.vue`, `BlockErrorBoundary.vue` |
| Engine container (swappable services) | §1 | `src/engine/engine.ts` |
| Mock data store (faker) | §6 | `src/data/mockStore.ts` |
| Theme tokens → CSS vars | §2 | `src/theme/` |
| Global state (pinia) | §2, §4 | `src/state/` |

## Vue runtime compiler

`vite.config.ts` aliases `vue` → `vue/dist/vue.esm-bundler.js` so custom
components and user templates can be compiled from strings at runtime (SPEC §4).

## Extension points for later workers (clean stubs left in place)

- **Logic / action engine + watchdog** (SPEC §4) — `src/engine/logic.ts`.
  `LogicEngine.compile`/`runActions` are no-ops today. Wire acorn + magic-string
  loop instrumentation and `AsyncFunction` compilation with `ctx` injected.
- **Query DSL** (SPEC §6) — `src/engine/query.ts`. A minimal Interface-mode
  resolver exists (`{table,columns,filter}`, bare table, `count(... where ...)`);
  the full DSL (joins/group-by) and the Preview/axios source are later.
- **Roles / Preview-as switcher** (SPEC §7) — `src/engine/roles.ts` has the
  pure `visible_to` filter; the switcher UI + CRUD matrix are later.
- **esm.sh dynamic packages** (SPEC §4) — `src/importmap/index.ts` `addPackage()`
  builds the pinned URL but does not fetch/register yet.
- **Custom components / global hooks** (SPEC §3/§4) — `src/components/` and
  `src/hooks/` are registries; runtime compilation of meta `code` strings is
  later. Register via `registry.registerCustom(...)`.

## postMessage protocol (both sides agree on this)

- **Studio → Sandbox:** `init(meta, mode, pageId?, role?, data?, fit?)`,
  `patch({blockId,path,value})`, `set-mode`, `set-role`, `navigate`,
  `select-block`, `drag-over`, `drag-end`. `data: 'mock'` makes Preview read the
  seeded mock store instead of the backend; `fit` sizes the document to its
  content and turns on `content-size` reports.
- **Sandbox → Studio:** `ready`, `block-selected`, `block-hover`, `drop-target`,
  `drop-clear`, `drop` (a drag released over the canvas; `source.blockId` when a
  block was dragged inside the Sandbox), `content-size`, `page-changed`,
  `role-changed`, `error`, `console`.

The Studio re-sends `init` on every edit; the engine is rebuilt only when custom
components, global hooks or data models change.

### Origins

The embedding Studio passes `?studioOrigin=<origin>`. It is honoured only when it
is listed in `VITE_STUDIO_ORIGINS` (see `.env.example`); the bridge then posts to
exactly that origin and drops messages from any other. Without the param the
Sandbox's own origin is used (the playground). The dev server listens on port
5175 and sends `Content-Security-Policy: frame-ancestors` for the same list.

Messages are wrapped in a versioned, channel-tagged envelope (`src/protocol/messages.ts`).
