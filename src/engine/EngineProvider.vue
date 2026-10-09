<script setup lang="ts">
/**
 * Provides the engine + mode + capabilities to a subtree (SPEC §1/§5).
 *
 * Mount this keyed on `${meta.id}:${mode}` so a mode switch or project swap
 * rebuilds the engine (fresh data source, registry) while page navigation and
 * edit patches (same meta id) keep it stable.
 */
import { computed, provide, toRef, watchEffect } from 'vue'
import type { Mode, ProjectMeta } from '@/contracts'
import { createEngine, EngineKey } from './engine'
import { CapabilitiesKey, capabilitiesFor, ModeKey } from './mode'
import { useHost } from './host'
import { applyTheme } from '@/theme'

const props = defineProps<{ meta: ProjectMeta; mode: Mode }>()
const host = useHost()

const engine = createEngine({
  meta: props.meta,
  mode: props.mode,
  onError: (error, source) =>
    host.reportError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(source ? { blockId: source } : {}),
    }),
})

provide(EngineKey, engine)
provide(ModeKey, toRef(props, 'mode'))
provide(
  CapabilitiesKey,
  computed(() => capabilitiesFor(props.mode)),
)

// Project theme tokens → CSS variables (SPEC §2).
watchEffect(() => applyTheme(props.meta.theme))
</script>

<template>
  <slot />
</template>
