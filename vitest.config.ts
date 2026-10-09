import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Test runner config for the built-in block library. Mirrors the vite.config
// resolve aliases so specs import blocks/ui-kit exactly as the app does.
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
    setupFiles: ['./src/blocks/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
})
