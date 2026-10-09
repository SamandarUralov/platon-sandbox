/**
 * Theme tokens (SPEC §2) + the `@/theme` user-import surface (SPEC §4).
 *
 * `theme.tokens` is a flat map of CSS-variable name → value. `applyTheme`
 * projects them onto a root element as custom properties (`--name`). Tokens are
 * also readable by user code via `@/theme`.
 */

import { reactive } from 'vue'
import type { ThemeMeta } from '@/contracts'

/** Live, reactive token map (populated on meta load). */
export const tokens = reactive<Record<string, string>>({})

/** Normalize a token key to a CSS custom-property name (`--foo-bar`). */
function toCssVar(key: string): string {
  const name = key.startsWith('--') ? key.slice(2) : key
  return `--${name}`
}

/** Apply theme tokens as CSS variables on `root` (defaults to <html>). */
export function applyTheme(theme: ThemeMeta | undefined, root?: HTMLElement): void {
  const el = root ?? (typeof document !== 'undefined' ? document.documentElement : null)
  // Reset reactive mirror.
  for (const k of Object.keys(tokens)) delete tokens[k]
  if (!theme?.tokens) return
  for (const [key, value] of Object.entries(theme.tokens)) {
    tokens[key] = value
    el?.style.setProperty(toCssVar(key), value)
  }
}

/** Read a single token value. */
export function token(key: string): string | undefined {
  return tokens[key] ?? tokens[toCssVar(key)]
}
