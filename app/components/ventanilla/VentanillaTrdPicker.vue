<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type { CatalogTreeSeries } from '~/types/archival-trd'

const props = defineProps<{
  orgUnitId: number | null
  orgUnitRoleLabel?: string
}>()

const docDocumentTypeId = defineModel<number | null>('docDocumentTypeId', { default: null })

const trdApi = useTrdApi()
const catalogTree = ref<CatalogTreeSeries[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
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
  loadError.value = null

  if (id == null || id < 1) {
    return
  }

  loading.value = true
  try {
    const res = await trdApi.fetchActiveVersion(id)
    if (res.data == null) {
      catalogTree.value = []
      loadError.value = res.message ?? 'No hay TRD vigente para el área seleccionada.'
      return
    }

    catalogTree.value = res.data.catalog_tree ?? []
    if (catalogTree.value.length === 0) {
      loadError.value = 'La TRD vigente no tiene tipos documentales asociados. Revise la configuración en Archivo → TRD.'
    }
  } catch {
    catalogTree.value = []
    loadError.value = 'No se pudo cargar la TRD vigente.'
    toast.error('No se pudo cargar la clasificación archivística (TRD)')
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
  <div class="grid min-w-0 gap-4 md:grid-cols-3">
    <div class="min-w-0 space-y-2">
      <Label>Serie</Label>
      <Multiselect
        v-model="seriesId"
        mode="single"
        :object="false"
        :options="seriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="loading || !orgUnitId || seriesOptions.length === 0"
        placeholder="Seleccione serie"
        no-options-text="Sin series en la TRD"
        no-results-text="Sin coincidencias"
        class="ventanilla-single-multiselect"
      />
    </div>
    <div class="min-w-0 space-y-2">
      <Label>Subserie</Label>
      <Multiselect
        v-model="subseriesId"
        mode="single"
        :object="false"
        :options="subseriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="!seriesId || subseriesOptions.length === 0"
        placeholder="Seleccione subserie"
        no-options-text="Sin subseries"
        no-results-text="Sin coincidencias"
        class="ventanilla-single-multiselect"
      />
    </div>
    <div class="min-w-0 space-y-2">
      <Label>Tipo documental</Label>
      <Multiselect
        v-model="docDocumentTypeId"
        mode="single"
        :object="false"
        :options="typeOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="!subseriesId || typeOptions.length === 0"
        placeholder="Seleccione tipo"
        no-options-text="Sin tipos documentales"
        no-results-text="Sin coincidencias"
        class="ventanilla-single-multiselect"
      />
    </div>
    <p v-if="loading" class="md:col-span-3 text-xs text-muted-foreground">
      Cargando TRD vigente…
    </p>
    <p v-else-if="!orgUnitId" class="md:col-span-3 text-xs text-muted-foreground">
      Seleccione primero {{ orgUnitRoleLabel ?? 'el área' }} para cargar la TRD.
    </p>
    <p v-else-if="loadError" class="md:col-span-3 text-xs text-destructive">
      {{ loadError }}
    </p>
  </div>
</template>

<style scoped>
.ventanilla-single-multiselect {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.ventanilla-single-multiselect :deep(.multiselect-single-label),
.ventanilla-single-multiselect :deep(.multiselect-placeholder) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
