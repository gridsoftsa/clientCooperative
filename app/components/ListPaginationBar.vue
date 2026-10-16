<script setup lang="ts">
import { DEFAULT_LIST_PAGE_SIZE, LIST_PAGE_SIZE_OPTIONS } from '~/constants/list-pagination'

const props = withDefaults(defineProps<{
  page: number
  lastPage: number
  perPage: number
  total: number
  itemLabel?: string
  loading?: boolean
}>(), {
  itemLabel: 'registros',
  loading: false,
  perPage: DEFAULT_LIST_PAGE_SIZE,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [size: number]
}>()

const rangeLabel = computed(() => {
  if (props.total <= 0) {
    return `0 ${props.itemLabel}`
  }

  const from = ((props.page - 1) * props.perPage) + 1
  const to = Math.min(props.page * props.perPage, props.total)

  return `Mostrando ${from} a ${to} de ${props.total} ${props.itemLabel}`
})

const perPageModel = computed({
  get: () => String(props.perPage),
  set: (value: string | number | null) => {
    const next = Number(value)
    if (!Number.isFinite(next) || next === props.perPage) {
      return
    }
    emit('update:perPage', next)
  },
})

const pageSizeOptions = LIST_PAGE_SIZE_OPTIONS.map(size => ({
  value: String(size),
  label: String(size),
}))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <Label class="whitespace-nowrap text-xs text-muted-foreground">Mostrar</Label>
        <div class="w-24">
          <ArchivalSingleMultiselect
            v-model="perPageModel"
            :can-clear="false"
            :searchable="false"
            :disabled="loading"
            :options="pageSizeOptions"
            placeholder="10"
          />
        </div>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ rangeLabel }}
      </p>
    </div>
    <NumberedPagination
      :page="page"
      :last-page="Math.max(1, lastPage)"
      :disabled="loading"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>
