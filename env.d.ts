/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@platon-rs/platon-ui-kit/style.css'

// The published ui-kit ships an empty `.d.ts` (`export {}`), so its real runtime
// exports are untyped. Declare the atoms the foundation consumes as generic Vue
// components. (A later worker can replace this with upstream types if published.)
declare module '@platon-rs/platon-ui-kit' {
  import type { DefineComponent } from 'vue'
  type UiComponent = DefineComponent<Record<string, any>, Record<string, any>, any>
  export const Badge: UiComponent
  export const Button: UiComponent
  export const Input: UiComponent
  export const Select: UiComponent
  export const Switch: UiComponent
  export const Checkbox: UiComponent
  export const Textarea: UiComponent
  export const Table: UiComponent
  export const TableHeader: UiComponent
  export const TableBody: UiComponent
  export const TableFooter: UiComponent
  export const TableRow: UiComponent
  export const TableHead: UiComponent
  export const TableCell: UiComponent
  export const TableCaption: UiComponent
  export const TableEmpty: UiComponent
  export const TablePagination: UiComponent
  export const BaseTable: UiComponent
  // Select composite (trigger/value/content/item) used by the `select` block.
  export const SelectContent: UiComponent
  export const SelectItem: UiComponent
  export const SelectTrigger: UiComponent
  export const SelectValue: UiComponent
  export const SelectWrapper: UiComponent
  // Additional palette atoms.
  export const DatePicker: UiComponent
  export const DateRangePicker: UiComponent
  export const FileUpload: UiComponent
  export const InputFileUpload: UiComponent
  export const ImageUpload: UiComponent
  // Other PascalCase atoms exist at runtime and are auto-registered by the
  // registry via `import * as`; they simply aren't individually typed here.
}
