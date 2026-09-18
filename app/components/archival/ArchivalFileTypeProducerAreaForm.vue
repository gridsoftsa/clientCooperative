<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTypeProducerAreaDraft } from '~/types/archival-file'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { DocSeriesRow, DocSubseriesRow, DocDocumentTypeRow } from '~/types/archival-catalog'
import type { TrdTableRow } from '~/types/archival-trd'

const props = defineProps<{
  orgUnits: OrgUnitRow[]
  trdTables: TrdTableRow[]
  disabled?: boolean
  excludeOrgUnitIds?: number[]
}>()

const model = defineModel<ArchivalFileTypeProducerAreaDraft>({ required: true })

const catalogApi = useArchivalCatalogApi()

const series = ref<DocSeriesRow[]>([])
const subseries = ref<DocSubseriesRow[]>([])
const docTypes = ref<DocDocumentTypeRow[]>([])
const loadingSeries = ref(false)
const loadingSubseries = ref(false)
const loadingDocTypes = ref(false)

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

function withCurrentOption<T extends { id: number, code: string, name: string }>(
  list: T[],
  current: { id: number, code: string, name: string } | null | undefined,
  currentId: number | null,
): Array<{ value: string, label: string }> {
  const items = [...list]

  if (current && currentId === current.id && !items.some(item => item.id === current.id)) {
    items.push(current as T)
  }

  return items.map(item => ({
    value: String(item.id),
    label: `${item.code} — ${item.name}`,
  }))
}

const seriesOptions = computed(() =>
  withCurrentOption(series.value, model.value.doc_series, model.value.doc_series_id),
)

const subseriesOptions = computed(() =>
  withCurrentOption(subseries.value, model.value.doc_subseries, model.value.doc_subseries_id),
)

const docTypeOptions = computed(() =>
  withCurrentOption(docTypes.value, model.value.doc_document_type, model.value.doc_document_type_id),
)

async function loadSeries(orgUnitId: number | null) {
  if (!orgUnitId) {
    series.value = []
    return
  }

  loadingSeries.value = true

  try {
    series.value = await catalogApi.fetchSeries(300, orgUnitId)
  }
  catch {
    series.value = []
    toast.error('No se pudieron cargar las series del área.')
  }
  finally {
    loadingSeries.value = false
  }
}

async function loadSubseries(seriesId: number | null) {
  if (!seriesId) {
    subseries.value = []
    return
  }

  loadingSubseries.value = true

  try {
    subseries.value = await catalogApi.fetchSubseries(seriesId)
  }
  catch {
    subseries.value = []
    toast.error('No se pudieron cargar las subseries.')
  }
  finally {
    loadingSubseries.value = false
  }
}

async function loadDocTypes(subseriesId: number | null) {
  if (!subseriesId) {
    docTypes.value = []
    return
  }

  loadingDocTypes.value = true

  try {
    docTypes.value = await catalogApi.fetchDocumentTypes(subseriesId)
  }
  catch {
    docTypes.value = []
    toast.error('No se pudieron cargar los tipos documentales.')
  }
  finally {
    loadingDocTypes.value = false
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
  subseries.value = []
  docTypes.value = []
  await loadSeries(model.value.org_unit_id)
}

async function onSeriesChange(value: string | null) {
  model.value = {
    ...model.value,
    doc_series_id: value ? Number(value) : null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    doc_series: null,
    doc_subseries: null,
    doc_document_type: null,
  }
  docTypes.value = []
  await loadSubseries(model.value.doc_series_id)
}

async function onSubseriesChange(value: string | null) {
  model.value = {
    ...model.value,
    doc_subseries_id: value ? Number(value) : null,
    doc_document_type_id: null,
    doc_subseries: null,
    doc_document_type: null,
  }
  await loadDocTypes(model.value.doc_subseries_id)
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
  await loadSeries(model.value.org_unit_id)
  await loadSubseries(model.value.doc_series_id)
  await loadDocTypes(model.value.doc_subseries_id)
}

onMounted(() => {
  void hydrate()
})

watch(
  () => [model.value.org_unit_id, model.value.doc_series_id, model.value.doc_subseries_id],
  async ([orgUnitId], [prevOrgUnitId]) => {
    if (orgUnitId !== prevOrgUnitId && orgUnitId && series.value.length === 0) {
      await hydrate()
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
        :disabled="disabled || !model.org_unit_id || loadingSeries"
        @update:model-value="onSeriesChange($event)"
      />
    </div>

    <div class="space-y-2">
      <Label for="producer_area_subseries">Subserie *</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_subseries"
        :model-value="model.doc_subseries_id != null ? String(model.doc_subseries_id) : null"
        :options="subseriesOptions"
        placeholder="Buscar subserie…"
        no-options-text="Seleccione una serie primero"
        :disabled="disabled || !model.doc_series_id || loadingSubseries"
        @update:model-value="onSubseriesChange($event)"
      />
    </div>

    <div class="space-y-2 sm:col-span-2 xl:col-span-1">
      <Label for="producer_area_doctype">Tipo documental</Label>
      <ArchivalCatalogSearchSelect
        id="producer_area_doctype"
        :model-value="model.doc_document_type_id != null ? String(model.doc_document_type_id) : null"
        :options="docTypeOptions"
        placeholder="Buscar tipo documental…"
        no-options-text="Seleccione una subserie primero"
        :disabled="disabled || !model.doc_subseries_id || loadingDocTypes"
        @update:model-value="onDocTypeChange($event)"
      />
    </div>
  </div>
</template>
