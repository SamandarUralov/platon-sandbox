/**
 * Vitest global setup for the harness.
 *
 * jsdom lacks a couple of APIs the ui-kit / engine may touch; stub the harmless
 * ones so component mounts don't explode in the test environment.
 */
import { afterEach, beforeAll } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

// Unmount every wrapper after each test. EngineProvider's theme watchEffect
// touches a module-level reactive token map, so leaving multiple providers
// mounted across tests makes their effects retrigger each other. Auto-unmount
// keeps each test to a single live provider (matching production).
enableAutoUnmount(afterEach)

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    // Some ui-kit atoms probe matchMedia; return a stable, inert result.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})
