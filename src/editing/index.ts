/**
 * Edit-overlay public surface (SPEC §5, Interface only).
 *
 * Hit-testing, drop-target resolution, and the drag-wiring composable. The
 * `block-hover` / `block-selected` emission lives on each block (BlockRenderer);
 * this module adds the geometric resolution the Studio relies on for drag/drop.
 */
export * from './geometry'
export * from './tree'
export * from './hitTest'
export * from './dropTarget'
export * from './overlay'
