<script setup lang="ts">
/**
 * Built-in block: `richtext` (Studio UI kit).
 * Formatted text editor via the ui-kit `RichTextEditor`: `title` (label), `mode` ("edit" |
 * "read"), `text` (starting text, plain), `minHeight` (px, default 140), `placeholder`,
 * `required` and `disabled`. Emits `change` and `update:modelValue` with the HTML.
 */
import { ref, watch } from 'vue'
import { RichTextEditor } from '@platon-rs/platon-ui-kit'
import { num, str } from './blockUtils'

const props = defineProps<{
  title?: string
  mode?: string
  text?: string
  minHeight?: number | string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'change', html: string): void
  (e: 'update:modelValue', html: string): void
}>()

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const initial = () => (str(props.text) ? `<p>${escapeHtml(str(props.text))}</p>` : '')
const html = ref(initial())
watch(
  () => props.text,
  () => (html.value = initial()),
)

function onInput(v: string) {
  html.value = v
  emit('update:modelValue', v)
  emit('change', v)
}
</script>

<template>
  <div class="pl-richtext">
    <div v-if="title" class="pl-richtext__label">
      {{ title }}<span v-if="required" class="pl-richtext__req"> *</span>
    </div>
    <RichTextEditor
      :model-value="html"
      :readonly="mode === 'read'"
      :disabled="disabled === true"
      :placeholder="str(placeholder)"
      :min-height="num(minHeight, 140)"
      :aria-label="title || 'Rich text'"
      :required="required === true"
      @update:model-value="onInput"
    />
  </div>
</template>

<style scoped>
.pl-richtext {
  min-width: 0;
}
.pl-richtext__label {
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pl-fg, #0f172a);
}
.pl-richtext__req {
  color: var(--pl-danger, #dc2626);
}
</style>
