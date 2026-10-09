import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Unified vitest config for all merged suites (data layer, execution engine,
// built-in block library, editing/protocol). The Vue plugin + runtime-compiler
// alias let suites that transitively import `.vue` files load; jsdom provides the
// browser surface the block/editing component tests need; the setup file
// polyfills APIs ui-kit atoms touch on mount. Pure-TS suites (data, hit-test,
// drop-target) run fine under the same environment.
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
    // jsdom so suites that transitively import `.vue` SFCs use Vue's client
    // (non-SSR) build; the logic/dispatcher/watchdog + data suites don't touch DOM.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/blocks/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
})
