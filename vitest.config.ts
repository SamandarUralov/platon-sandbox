/**
 * Vitest config for the test harness (owned by the test-harness worker).
 *
 * Mirrors the foundation `vite.config.ts` resolve/define settings — the `@`
 * alias and, crucially, the Vue RUNTIME-COMPILER build (SPEC §4) — so unit tests
 * render engine components exactly as the app does. Kept separate from
 * `vite.config.ts` so foundation files stay untouched.
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
    include: ['tests/unit/**/*.spec.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    // Snapshots live next to the specs under tests/unit/__snapshots__.
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\/([^/]+)$/, '/__snapshots__/$1') + snapExtension,
  },
})
