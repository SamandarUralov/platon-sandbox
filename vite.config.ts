import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// SPEC §4: Vue must load with the RUNTIME COMPILER so custom components and
// user templates can be compiled from strings at runtime (not just build time).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Runtime compiler build of Vue (template compilation available in-browser).
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  define: {
    // Enable the runtime template compiler explicitly.
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    // Foundation bundles Vue runtime-compiler + ui-kit together; raise the
    // advisory limit so the build stays quiet for downstream workers.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    // Sandbox is embedded as an <iframe> by the Studio — do not block framing.
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
  },
})
