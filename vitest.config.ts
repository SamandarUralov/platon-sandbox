import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Unified vitest config for the merged suites (data layer + execution engine).
// Vue reactivity + the runtime compiler work in Node, so no DOM is needed for the
// logic/dispatcher/watchdog or data-layer suites; jsdom is available for any
// future component-mount tests. The Vue plugin lets suites that transitively
// import `.vue` files (e.g. the registry) load, and the data-layer's pure-TS
// suites run fine under the same environment.
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
    include: ['src/**/*.{test,spec}.ts'],
  },
})
