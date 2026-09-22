<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTypeProducerAreaDraft } from '~/types/archival-file'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { CatalogTreeSeries, TrdTableRow } from '~/types/archival-trd'

const props = defineProps<{
  orgUnits: OrgUnitRow[]
  trdTables: TrdTableRow[]
  disabled?: boolean
  excludeOrgUnitIds?: number[]
}>()

const model = defineModel<ArchivalFileTypeProducerAreaDraft>({ required: true })

const trdApi = useTrdApi()

const catalogTree = ref<CatalogTreeSeries[]>([])
const loadingTree = ref(false)

const orgUnitOptions = computed(() => {
  const excluded = new Set(props.excludeOrgUnitIds ?? [])

  return props.orgUnits
    .filter(unit => !excluded.has(unit.id) || unit.id === model.value.org_unit_id)
    .map(unit => ({
      value: String(unit.id),
      label: unit.name,
    }))
})

const trdTableOptions = computed(() => {
  if (!model.value.org_unit_id) {
    return []
  }

  return props.trdTables
    .filter(table => table.org_unit_id === model.value.org_unit_id)
    .map(table => ({
      value: String(table.id),
      label: table.org_unit?.name ?? `Tabla #${table.id}`,
    }))
})

const selectedSeries = computed(() =>
  catalogTree.value.find(series => series.id === model.value.doc_series_id) ?? null,
)

const selectedSubseries = computed(() =>
  selectedSeries.value?.subseries.find(sub => sub.id === model.value.doc_subseries_id) ?? null,
)

const seriesOptions = computed(() =>
  catalogTree.value.map(series => ({
    value: String(series.id),
    label: `${series.code} — ${series.name}`,
  })),
)

const subseriesOptions = computed(() =>
  (selectedSeries.value?.subseries ?? []).map(sub => ({
    value: String(sub.id),
    label: `${sub.code} — ${sub.name}`,
  })),
)

const docTypeOptions = computed(() =>
  (selectedSubseries.value?.document_types ?? []).map(type => ({
    value: String(type.id),
    label: `${type.code} — ${type.name}`,
  })),
)

async function loadTree(orgUnitId: number | null) {
  if (!orgUnitId) {
    catalogTree.value = []
    return
  }

  loadingTree.value = true

  try {
    catalogTree.value = await trdApi.fetchCatalogTree(orgUnitId, false)
  }
  catch {
    catalogTree.value = []
    toast.error('No se pudo cargar el catálogo TRD del área.')
  }
  finally {
    loadingTree.value = false
  }
}

async function onOrgUnitChange(value: string | null) {
  model.value = {
    ...model.value,
    org_unit_id: value ? Number(value) : null,
    trd_table_id: null,
    doc_series_id: null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    org_unit: null,
    doc_series: null,
    doc_subseries: null,
    doc_document_type: null,
  }
  await loadTree(model.value.org_unit_id)
}

function onSeriesChange(value: string | null) {
  model.value = {
    ...model.value,
    doc_series_id: value ? Number(value) : null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    doc_series: null,
    doc_subseries: null,
    doc_document_type: null,
  }
}

function onSubseriesChange(value: string | null) {
  model.value = {
    ...model.value,
    doc_subseries_id: value ? Number(value) : null,
    doc_document_type_id: null,
    doc_subseries: null,
    doc_document_type: null,
  }
}

function onDocTypeChange(value: string | null) {
  model.value = {
    ...model.value,
    doc_document_type_id: value ? Number(value) : null,
    doc_document_type: null,
  }
}

function onTrdTableChange(value: string | null) {
  model.value = {
    ...model.value,
    trd_table_id: value ? Number(value) : null,
  }
}

async function hydrate() {
  await loadTree(model.value.org_unit_id)
}

onMounted(() => {
  void hydrate()
})

watch(
  () => model.value.org_unit_id,
  async (orgUnitId, previousOrgUnitId) => {
    if (orgUnitId === previousOrgUnitId) {
      return
    }

    if (orgUnitId && catalogTree.value.length === 0) {
      await loadTree(orgUnitId)
    }
  },
)

defineExpose({ hydrate })
</script>

<template>
  <div class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <div class="space-y-2">
      <Label for="producer_area_unit">Área productora *</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_unit"
        :model-value="model.org_unit_id != null ? String(model.org_unit_id) : null"
        :options="orgUnitOptions"
        placeholder="Buscar área…"
        no-options-text="Sin áreas disponibles"
        :disabled="disabled"
        @update:model-value="onOrgUnitChange($event)"
      />
    </div>

    <div class="space-y-2">
      <Label for="producer_area_trd">Tabla TRD</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_trd"
        :model-value="model.trd_table_id != null ? String(model.trd_table_id) : null"
        :options="trdTableOptions"
        placeholder="Opcional"
        no-options-text="Sin tablas para el área"
        :disabled="disabled || !model.org_unit_id"
        @update:model-value="onTrdTableChange($event)"
      />
    </div>

    <div class="space-y-2">
      <Label for="producer_area_series">Serie *</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_series"
        :model-value="model.doc_series_id != null ? String(model.doc_series_id) : null"
        :options="seriesOptions"
        placeholder="Buscar serie…"
        no-options-text="Seleccione un área primero"
        :disabled="disabled || !model.org_unit_id || loadingTree"
        @update:model-value="onSeriesChange($event)"
      />
    </div>

    <div class="space-y-2">
      <Label for="producer_area_subseries">Subserie *</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_subseries"
        :key="`producer-subseries-${model.doc_series_id ?? 'none'}`"
        :model-value="model.doc_subseries_id != null ? String(model.doc_subseries_id) : null"
        :options="subseriesOptions"
        placeholder="Buscar subserie…"
        no-options-text="No hay subseries en esta serie"
        :disabled="disabled || !model.doc_series_id || loadingTree"
        @update:model-value="onSubseriesChange($event)"
      />
    </div>

    <div class="space-y-2 sm:col-span-2 xl:col-span-1">
      <Label for="producer_area_doctype">Tipo documental</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_doctype"
        :key="`producer-doctype-${model.doc_subseries_id ?? 'none'}`"
        :model-value="model.doc_document_type_id != null ? String(model.doc_document_type_id) : null"
        :options="docTypeOptions"
        placeholder="Buscar tipo documental…"
        no-options-text="No hay tipos documentales en esta subserie"
        :disabled="disabled || !model.doc_subseries_id || loadingTree"
        @update:model-value="onDocTypeChange($event)"
      />
    </div>
  </div>
</template>
