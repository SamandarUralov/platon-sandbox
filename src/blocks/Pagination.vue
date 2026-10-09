<script setup lang="ts">
/**
 * Built-in block: `pagination` (SPEC §3 palette).
 * Wrapper over the ui-kit `TablePagination` atom. Re-emits the atom's
 * `page-change` as the semantic `change` event (page number) for action wiring.
 */
import { TablePagination } from '@platon-rs/platon-ui-kit'

defineProps<{
  page?: number
  pageSize?: number
  total?: number
  summary?: boolean | string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'change', page: number): void
  (e: 'page-change', page: number): void
}>()

function onPageChange(page: number) {
  emit('page-change', page)
  emit('change', page)
}
</script>

<template>
  <TablePagination
    class="pl-pagination"
    :page="page ?? 1"
    :page-size="pageSize ?? 10"
    :total="total ?? 0"
    :summary="summary"
    :loading="loading"
    @page-change="onPageChange"
  />
</template>
