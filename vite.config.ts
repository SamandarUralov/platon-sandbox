/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// SPEC §4: Vue must load with the RUNTIME COMPILER so custom components and
// user templates can be compiled from strings at runtime (not just build time).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const studioOrigins = (env.VITE_STUDIO_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return {
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
    // 5173/5174 are the Studio and the Constructor.
    port: 5175,
    strictPort: true,
    // Embedded as an <iframe> by the Studio: allow framing only by listed origins.
    headers: {
      'Content-Security-Policy': `frame-ancestors 'self' ${studioOrigins.join(' ')}`.trim(),
    },
  },
  // Vitest (SPEC §11): component + unit tests run in jsdom so Vue renders.
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
}
})
