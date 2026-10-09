<script setup lang="ts">
/**
 * Built-in block: `file_upload` (SPEC §3 palette).
 * Wrapper over the ui-kit `FileUpload` atom. `v-model` carries the selected
 * files; emits semantic `change` plus the atom's `error`/`upload-click`.
 */
import { FileUpload } from '@platon-rs/platon-ui-kit'

defineProps<{
  modelValue?: unknown[]
  accept?: string
  multiple?: boolean
  maxSize?: number
  disabled?: boolean
  label?: string
  placeholder?: string
  error?: boolean | string
  success?: boolean | string
  helperText?: string
  showFileCount?: boolean
  uploading?: boolean
  uploadProgress?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown[]): void
  (e: 'change', value: unknown[]): void
  (e: 'error', err: unknown): void
  (e: 'upload-click'): void
}>()

function onUpdate(value: unknown[]) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <FileUpload
    class="pl-file-upload"
    :model-value="modelValue"
    :accept="accept"
    :multiple="multiple"
    :max-size="maxSize"
    :disabled="disabled"
    :label="label"
    :placeholder="placeholder"
    :error="error"
    :success="success"
    :helper-text="helperText"
    :show-file-count="showFileCount"
    :uploading="uploading"
    :upload-progress="uploadProgress"
    @update:model-value="onUpdate"
    @error="emit('error', $event)"
    @upload-click="emit('upload-click')"
  />
</template>
