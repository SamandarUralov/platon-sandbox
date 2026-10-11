<script setup lang="ts">
/**
 * Built-in block: `empty` (Studio UI kit).
 * "Nothing here yet" placeholder: `title`, `text`, `icon` (a Lucide name in Studio; the Sandbox
 * has no icon set, so a generic inbox glyph is drawn) and an optional `buttonLabel` whose ui-kit
 * button emits `buttonClick`.
 */
import { computed } from 'vue'
import { Button } from '@platon-rs/platon-ui-kit'
import { str } from './blockUtils'

const props = defineProps<{
  title?: string
  text?: string
  icon?: string
  buttonLabel?: string
}>()

const emit = defineEmits<{ (e: 'buttonClick', ev: MouseEvent): void }>()

const heading = computed(() => str(props.title) || 'Nothing here yet')
const body = computed(() => str(props.text, 'Create the first one to get started.'))
</script>

<template>
  <div class="pl-empty" :data-icon="icon || 'inbox'">
    <span class="pl-empty__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span class="pl-empty__title">{{ heading }}</span>
    <span v-if="body" class="pl-empty__text">{{ body }}</span>
    <div v-if="buttonLabel" class="pl-empty__action">
      <Button size="small" @click="emit('buttonClick', $event)">{{ buttonLabel }}</Button>
    </div>
  </div>
</template>

<style scoped>
.pl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 24px;
  border: 1.5px dashed var(--pl-border, #e5e7eb);
  border-radius: 12px;
  text-align: center;
}
.pl-empty__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: var(--pl-accent, #6366f1);
  background: color-mix(in srgb, var(--pl-accent, #6366f1) 12%, transparent);
}
.pl-empty__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--pl-fg, #0f172a);
}
.pl-empty__text {
  max-width: 24rem;
  font-size: 12.5px;
  color: var(--pl-fg-muted, #64748b);
}
.pl-empty__action {
  margin-top: 8px;
}
</style>
