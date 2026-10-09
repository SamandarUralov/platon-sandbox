/**
 * Preview shell public surface (SPEC §5 Preview, §7).
 *
 * The full application chrome used in Preview mode: role-filtered navigation,
 * the "Preview as <role>" switcher, and the visual CRUD permission matrix.
 */
export { default as PreviewShell } from './PreviewShell.vue'
export { default as RoleSwitcher } from './RoleSwitcher.vue'
export { default as PreviewMenu } from './PreviewMenu.vue'
export { default as PermissionsMatrix } from './PermissionsMatrix.vue'
export * from './usePreviewRole'
