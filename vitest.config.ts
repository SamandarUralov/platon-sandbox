/**
 * Unified vitest config for ALL merged suites (data layer, execution engine,
 * built-in blocks, editing/protocol, and the test-harness tests/unit/* suites).
 *
 * Mirrors the foundation `vite.config.ts` resolve/define — the `@` alias and the
 * Vue RUNTIME-COMPILER build (SPEC §4) — so unit tests render engine components
 * exactly as the app does. Both setup files run (block ui-kit jsdom polyfills +
 * the harness setup); snapshots resolve next to their specs under __snapshots__.
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Runtime-compiler build so custom-component templates compile in tests too.
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Co-located suites under src/ plus the harness suites under tests/unit/.
    include: ['src/**/*.{test,spec}.ts', 'tests/unit/**/*.spec.ts'],
    setupFiles: ['./src/blocks/__tests__/setup.ts', './tests/unit/setup.ts'],
    // Snapshots live next to the specs under __snapshots__ (harness convention).
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\/([^/]+)$/, '/__snapshots__/$1') + snapExtension,
  },
})
