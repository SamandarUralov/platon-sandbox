import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Vitest config for the editing/protocol tests. Mirrors vite.config.ts aliases
// (incl. the Vue runtime-compiler build, SPEC §4) and runs component tests in
// jsdom. Pure-logic tests (hit-test, drop-target) don't need the DOM but share
// the same environment for simplicity.
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
    include: ['src/**/*.{test,spec}.ts'],
    globals: true,
  },
})
