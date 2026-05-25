<script setup lang="ts">
import type { CatalogTreeSeries } from '~/types/archival-trd'

const props = defineProps<{
  orgUnitId: number | null
}>()

const docDocumentTypeId = defineModel<number | null>('docDocumentTypeId', { default: null })

const trdApi = useTrdApi()
const catalogTree = ref<CatalogTreeSeries[]>([])
const loading = ref(false)
const seriesId = ref<number | null>(null)
const subseriesId = ref<number | null>(null)

const seriesOptions = computed(() =>
  catalogTree.value.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` })),
)

const subseriesOptions = computed(() => {
  const series = catalogTree.value.find(s => s.id === seriesId.value)

  return (series?.subseries ?? []).map(sub => ({
    value: sub.id,
    label: `${sub.code} — ${sub.name}`,
  }))
})

const typeOptions = computed(() => {
  const series = catalogTree.value.find(s => s.id === seriesId.value)
  const sub = series?.subseries.find(ss => ss.id === subseriesId.value)

  return (sub?.document_types ?? []).map(t => ({
    value: t.id,
    label: `${t.code} — ${t.name}`,
  }))
})

watch(() => props.orgUnitId, async (id) => {
  seriesId.value = null
  subseriesId.value = null
  docDocumentTypeId.value = null
  catalogTree.value = []

  if (id == null || id < 1) {
    return
  }

  loading.value = true
  try {
    const res = await trdApi.fetchActiveVersion(id)
    catalogTree.value = res.data?.catalog_tree ?? []
  } catch {
    catalogTree.value = []
  } finally {
    loading.value = false
  }
}, { immediate: true })

watch(seriesId, () => {
  subseriesId.value = null
  docDocumentTypeId.value = null
})

watch(subseriesId, () => {
  docDocumentTypeId.value = null
})

watch(docDocumentTypeId, (id) => {
  if (id == null) {
    return
  }
  for (const series of catalogTree.value) {
    for (const sub of series.subseries) {
      const found = sub.document_types.find(t => t.id === id)
      if (found) {
        if (seriesId.value !== series.id) {
          seriesId.value = series.id
        }
        if (subseriesId.value !== sub.id) {
          subseriesId.value = sub.id
        }

        return
      }
    }
  }
})
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <div class="space-y-2">
      <Label>Serie</Label>
      <Select
        :model-value="seriesId != null ? String(seriesId) : undefined"
        :disabled="loading || !orgUnitId || seriesOptions.length === 0"
        @update:model-value="seriesId = $event ? Number($event) : null"
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccione serie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in seriesOptions"
            :key="opt.value"
            :value="String(opt.value)"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-2">
      <Label>Subserie</Label>
      <Select
        :model-value="subseriesId != null ? String(subseriesId) : undefined"
        :disabled="!seriesId || subseriesOptions.length === 0"
        @update:model-value="subseriesId = $event ? Number($event) : null"
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccione subserie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in subseriesOptions"
            :key="opt.value"
            :value="String(opt.value)"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-2">
      <Label>Tipo documental</Label>
      <Select
        :model-value="docDocumentTypeId != null ? String(docDocumentTypeId) : undefined"
        :disabled="!subseriesId || typeOptions.length === 0"
        @update:model-value="docDocumentTypeId = $event ? Number($event) : null"
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccione tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in typeOptions"
            :key="opt.value"
            :value="String(opt.value)"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <p v-if="loading" class="md:col-span-3 text-xs text-muted-foreground">
      Cargando TRD vigente…
    </p>
    <p v-else-if="orgUnitId && catalogTree.length === 0" class="md:col-span-3 text-xs text-destructive">
      No hay TRD vigente para el área seleccionada.
    </p>
  </div>
</template>
