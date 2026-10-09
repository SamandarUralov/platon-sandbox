/**
 * E2E smoke test (SPEC §5, §7, §12).
 *
 * Drives the mock-studio Playground in a real browser: it boots the embedded
 * sandbox with the FieldOps demo, verifies the data_table renders rows in
 * Interface mode, flips to Preview, switches the "Preview as <role>" selector,
 * navigates pages, and confirms the postMessage protocol round-trips (events
 * land in the Console panel).
 */
import { test, expect, type FrameLocator, type Page } from '@playwright/test'

const sandbox = (page: Page): FrameLocator => page.frameLocator('[data-testid="sandbox-frame"]')

test.beforeEach(async ({ page }) => {
  await page.goto('/playground.html')
  // The playground mounts, then the sandbox iframe boots and sends `ready`, to
  // which the playground answers `init`. On a cold Vite dev server the first
  // compile of the sandbox app can take a while, so allow a generous window.
  await expect(page.getByTestId('sandbox-status')).toContainText('connected', { timeout: 45_000 })
})

test('boots the FieldOps demo and renders data_table rows in Interface mode', async ({ page }) => {
  const frame = sandbox(page)
  // Default mode is Interface — mock data is seeded, so the table has rows.
  await expect(frame.locator('[data-component="data_table"]').first()).toBeVisible()
  const rows = frame.locator('[data-component="data_table"] tbody tr')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeGreaterThan(0)

  // The dashboard's built-in blocks are all present.
  await expect(frame.locator('[data-component="page_header"]')).toBeVisible()
  await expect(frame.locator('[data-component="stat_group"]')).toBeVisible()
})

test('switches to Preview mode and flips the "Preview as role" selector', async ({ page }) => {
  const frame = sandbox(page)

  await page.getByTestId('mode-preview').click()
  // The sandbox topbar reflects the live mode switch (set-mode protocol message).
  await expect(frame.locator('.pl-shell__mode--preview')).toBeVisible()

  // Role switcher is enabled in Preview; pick a role and confirm it sticks.
  const roleSelect = page.getByTestId('role-select')
  await expect(roleSelect).toBeEnabled()
  await roleSelect.selectOption('technician')
  await expect(roleSelect).toHaveValue('technician')

  // The sandbox keeps rendering the page after the role change.
  await expect(frame.locator('[data-component="page_header"]')).toBeVisible()
})

test('navigates between pages via the playground', async ({ page }) => {
  const frame = sandbox(page)

  await page.getByTestId('page-work_orders').click()
  await expect(frame.locator('[data-component="page_header"]')).toContainText('Work orders')

  await page.getByTestId('page-job_checklist').click()
  await expect(frame.locator('[data-component="page_header"]')).toContainText('Job checklist')
  await expect(frame.locator('[data-component="data_table"] tbody tr').first()).toBeVisible()
})

test('streams protocol events into the Console panel', async ({ page }) => {
  // Boot already produced `ready` + `init`; a mode switch adds a set-mode event.
  await page.getByTestId('mode-preview').click()
  await page.getByTestId('console-filter-event').click()

  const consolePanel = page.getByTestId('console-panel')
  await expect(consolePanel).toContainText('sandbox ready')
  await expect(consolePanel).toContainText('init')
  await expect(consolePanel).toContainText('set-mode preview')
})

test('rejects invalid meta JSON with a visible error', async ({ page }) => {
  await page.getByTestId('meta-editor').fill('{ not valid json')
  await page.getByTestId('apply-meta').click()
  await expect(page.getByTestId('meta-error')).toBeVisible()
  await expect(page.getByTestId('meta-error')).toContainText('JSON parse error')
})
