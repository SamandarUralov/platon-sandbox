<script setup lang="ts">
/**
 * Built-in block: `divider` (Studio UI kit).
 * A thin horizontal rule separating sections. Studio sends no props beyond `title`, which is
 * accepted (and ignored) so it does not leak onto the element as a tooltip.
 */
defineProps<{ title?: string }>()
</script>

<template>
  <hr class="pl-divider" />
</template>

<style scoped>
.pl-divider {
  margin: 4px 0;
  border: 0;
  border-top: 1px solid var(--pl-border, #e5e7eb);
}
</style>
