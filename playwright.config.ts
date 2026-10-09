/**
 * Playwright E2E config (owned by the test-harness worker).
 *
 * Boots the Vite dev server and drives the mock-studio Playground + embedded
 * sandbox in a real browser (SPEC §5, §7, §12). Kept separate from the unit-test
 * (vitest) config; `testDir` scopes Playwright to tests/e2e so vitest never
 * tries to run these and vice-versa.
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `${BASE_URL}/playground.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
