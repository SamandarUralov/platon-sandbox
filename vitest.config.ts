import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Dedicated vitest config: the data-layer tests are pure TS/node (no Vue SFC
// compilation), so we only need the `@` alias and a node environment. Kept
// separate from vite.config.ts to avoid pulling the Vue plugin into tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
