/**
 * Runtime validation for the meta contract (SPEC §2, §9).
 *
 * zod mirrors of `./types.ts`. Used to:
 *  - validate incoming `init` meta from the Studio (hard fail → error to console);
 *  - validate individual blocks before render (soft fail → skip + warn, siblings
 *    keep rendering — SPEC §9).
 *
 * Keep these structurally aligned with `./types.ts`. Prefer `.passthrough()` on
 * open-ended records so Studio can add fields without breaking the Sandbox.
 */

import { z } from 'zod'

export const dataModelColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
})

export const dataModelSchema = z.object({
  table: z.string(),
  columns: z.array(dataModelColumnSchema),
  seed: z.array(z.record(z.unknown())).optional(),
})

export const customComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['vue', 'js']),
  code: z.string(),
})

export const globalHookSchema = z.object({
  name: z.string(),
  code: z.string(),
})

export const menuNodeSchema: z.ZodType<import('./types').MenuNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    page: z.string().optional(),
    icon: z.string().optional(),
    visible_to: z.array(z.string()).optional(),
    children: z.array(menuNodeSchema).optional(),
  }),
)

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), to: z.string(), params: z.record(z.unknown()).optional() }),
  z.object({ type: z.literal('open_modal'), modal: z.string(), props: z.record(z.unknown()).optional() }),
  z.object({ type: z.literal('open_form'), form: z.string(), props: z.record(z.unknown()).optional() }),
  z.object({ type: z.literal('refetch'), target: z.string().optional() }),
  z.object({
    type: z.literal('toast'),
    message: z.string(),
    level: z.enum(['info', 'success', 'warning', 'error']).optional(),
  }),
  z.object({ type: z.literal('emit'), event: z.string(), payload: z.unknown().optional() }),
  z.object({ type: z.literal('close'), target: z.string().optional() }),
  z.object({ type: z.literal('submit'), target: z.string().optional() }),
  z.object({ type: z.literal('run'), code: z.string() }),
])

export const structuredQuerySchema = z.object({
  table: z.string(),
  columns: z.array(z.string()).optional(),
  filter: z.record(z.unknown()).optional(),
})

export const blockQuerySchema = z.union([z.string(), structuredQuerySchema])

export const blockLayoutSchema = z
  .object({
    row: z.number().optional(),
    column: z.number().optional(),
    colSpan: z.number().optional(),
    rowSpan: z.number().optional(),
  })
  .passthrough()

export const blockPermissionsSchema = z.object({
  create: z.array(z.string()).optional(),
  read: z.array(z.string()).optional(),
  update: z.array(z.string()).optional(),
  delete: z.array(z.string()).optional(),
})

export const blockSchema: z.ZodType<import('./types').Block> = z.lazy(() =>
  z.object({
    id: z.string(),
    component: z.string(),
    props: z.record(z.unknown()).optional(),
    items: z.array(z.unknown()).optional(),
    query: blockQuerySchema.optional(),
    events: z.record(z.array(actionSchema)).optional(),
    visible_to: z.array(z.string()).optional(),
    permissions: blockPermissionsSchema.optional(),
    layout: blockLayoutSchema.optional(),
    children: z.array(blockSchema).optional(),
  }),
)

export const pageLifecycleSchema = z
  .object({
    onPageInit: z.string().optional(),
    onBeforeRender: z.string().optional(),
    onPageReady: z.string().optional(),
    onBeforeRefresh: z.string().optional(),
    onAfterRefresh: z.string().optional(),
    onPageResume: z.string().optional(),
    onPagePause: z.string().optional(),
    onBeforeLeave: z.string().optional(),
    onPageLeave: z.string().optional(),
    onPageError: z.string().optional(),
  })
  .passthrough()

export const pageMetaSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  parent: z.string().nullable().optional(),
  in_menu: z.boolean().optional(),
  visible_to: z.array(z.string()).optional(),
  lifecycle: pageLifecycleSchema.optional(),
  blocks: z.array(blockSchema),
})

export const themeMetaSchema = z.object({
  tokens: z.record(z.string()),
})

export const projectMetaSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  name: z.string(),
  theme: themeMetaSchema,
  roles: z.array(z.string()),
  data_models: z.array(dataModelSchema),
  custom_components: z.array(customComponentSchema),
  global_state: z.record(z.unknown()),
  global_hooks: z.array(globalHookSchema),
  menu: z.array(menuNodeSchema),
  pages: z.array(pageMetaSchema),
})

export const blockPatchSchema = z.object({
  blockId: z.string(),
  path: z.string(),
  value: z.unknown(),
})

/** Validate a full project meta. Throws on failure (caller surfaces as error). */
export function parseProjectMeta(input: unknown): import('./types').ProjectMeta {
  return projectMetaSchema.parse(input) as import('./types').ProjectMeta
}

/** Safe-parse a single block; returns null (and the caller warns) on failure. */
export function safeParseBlock(input: unknown) {
  return blockSchema.safeParse(input)
}
