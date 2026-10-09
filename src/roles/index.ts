/**
 * Roles & permissions public surface (SPEC §7).
 *
 * Visibility (`visible_to`) filtering for pages/blocks/menu, plus the CRUD
 * permission matrix helpers. Pure logic only — the Vue preview shell lives in
 * `@/preview`. Import from here, not deep paths.
 */
export * from './visibility'
export * from './permissions'
