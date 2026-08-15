<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { DocSeriesRow, DocSubseriesRow, DocDocumentTypeRow } from '~/types/archival-catalog'
import type { TrdTableRow } from '~/types/archival-trd'

export interface ProducerAreaDraft {
  org_unit_id: number | null
  trd_table_id: number | null
  doc_series_id: number | null
  doc_subseries_id: number | null
  doc_document_type_id: number | null
  sort_order: number
  org_unit?: { id: number, name: string, code?: string } | null
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries?: { id: number, code: string, name: string, doc_series_id?: number } | null
  doc_document_type?: { id: number, code: string, name: string, doc_subseries_id?: number } | null
}

const props = defineProps<{
  orgUnits: OrgUnitRow[]
  trdTables: TrdTableRow[]
  disabled?: boolean
}>()

const model = defineModel<ProducerAreaDraft[]>({ required: true })

const catalogApi = useArchivalCatalogApi()

const seriesByRow = ref<Record<number, DocSeriesRow[]>>({})
const subseriesByRow = ref<Record<number, DocSubseriesRow[]>>({})
const docTypesByRow = ref<Record<number, DocDocumentTypeRow[]>>({})
const loadingSeriesRow = ref<number | null>(null)
const loadingSubseriesRow = ref<number | null>(null)
const loadingDocTypesRow = ref<number | null>(null)

function emptyRow(sortOrder: number): ProducerAreaDraft {
  return {
    org_unit_id: null,
    trd_table_id: null,
    doc_series_id: null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    sort_order: sortOrder,
  }
}

function addRow() {
  model.value = [...model.value, emptyRow(model.value.length)]
}

function removeRow(index: number) {
  model.value = model.value
    .filter((_, rowIndex) => rowIndex !== index)
    .map((row, rowIndex) => ({ ...row, sort_order: rowIndex }))
}

function orgUnitOptions(rowIndex: number) {
  const usedElsewhere = new Set(
    model.value
      .filter((_, index) => index !== rowIndex)
      .map(row => row.org_unit_id)
      .filter((id): id is number => id != null),
  )

  return props.orgUnits
    .filter(unit => !usedElsewhere.has(unit.id))
    .map(unit => ({
      value: String(unit.id),
      label: unit.name,
    }))
}

function trdTableOptions(orgUnitId: number | null) {
  if (!orgUnitId) {
    return []
  }

  return props.trdTables
    .filter(table => table.org_unit_id === orgUnitId)
    .map(table => ({
      value: String(table.id),
      label: table.org_unit?.name ?? `Tabla #${table.id}`,
    }))
}

function seriesOptions(rowIndex: number) {
  const row = model.value[rowIndex]
  const list = seriesByRow.value[rowIndex] ?? []

  if (
    row?.doc_series
    && row.doc_series_id === row.doc_series.id
    && !list.some(item => item.id === row.doc_series?.id)
  ) {
    return [
      ...list,
      {
        id: row.doc_series.id,
        org_unit_id: row.org_unit_id ?? 0,
        code: row.doc_series.code,
        name: row.doc_series.name,
        is_active: true,
      } as DocSeriesRow,
    ].map(series => ({
      value: String(series.id),
      label: `${series.code} — ${series.name}`,
    }))
  }

  return list.map(series => ({
    value: String(series.id),
    label: `${series.code} — ${series.name}`,
  }))
}

function subseriesOptions(rowIndex: number) {
  const row = model.value[rowIndex]
  const list = subseriesByRow.value[rowIndex] ?? []

  if (
    row?.doc_subseries
    && row.doc_subseries_id === row.doc_subseries.id
    && !list.some(item => item.id === row.doc_subseries?.id)
  ) {
    return [
      ...list,
      {
        id: row.doc_subseries.id,
        doc_series_id: row.doc_subseries.doc_series_id ?? row.doc_series_id ?? 0,
        code: row.doc_subseries.code,
        name: row.doc_subseries.name,
      } as DocSubseriesRow,
    ].map(sub => ({
      value: String(sub.id),
      label: `${sub.code} — ${sub.name}`,
    }))
  }

  return list.map(sub => ({
    value: String(sub.id),
    label: `${sub.code} — ${sub.name}`,
  }))
}

function docTypeOptions(rowIndex: number) {
  const row = model.value[rowIndex]
  const list = docTypesByRow.value[rowIndex] ?? []

  if (
    row?.doc_document_type
    && row.doc_document_type_id === row.doc_document_type.id
    && !list.some(item => item.id === row.doc_document_type?.id)
  ) {
    return [
      ...list,
      {
        id: row.doc_document_type.id,
        doc_subseries_id: row.doc_document_type.doc_subseries_id ?? row.doc_subseries_id ?? 0,
        code: row.doc_document_type.code,
        name: row.doc_document_type.name,
        is_active: true,
      } as DocDocumentTypeRow,
    ].map(type => ({
      value: String(type.id),
      label: `${type.code} — ${type.name}`,
    }))
  }

  return list.map(type => ({
    value: String(type.id),
    label: `${type.code} — ${type.name}`,
  }))
}

async function loadSeriesForRow(rowIndex: number, orgUnitId: number | null) {
  if (!orgUnitId) {
    seriesByRow.value = { ...seriesByRow.value, [rowIndex]: [] }
    return
  }

  loadingSeriesRow.value = rowIndex

  try {
    const series = await catalogApi.fetchSeries(300, orgUnitId)
    seriesByRow.value = { ...seriesByRow.value, [rowIndex]: series }
  }
  catch {
    seriesByRow.value = { ...seriesByRow.value, [rowIndex]: [] }
    toast.error('No se pudieron cargar las series del área.')
  }
  finally {
    loadingSeriesRow.value = null
  }
}

async function loadSubseriesForRow(rowIndex: number, seriesId: number | null) {
  if (!seriesId) {
    subseriesByRow.value = { ...subseriesByRow.value, [rowIndex]: [] }
    return
  }

  loadingSubseriesRow.value = rowIndex

  try {
    const subseries = await catalogApi.fetchSubseries(seriesId)
    subseriesByRow.value = { ...subseriesByRow.value, [rowIndex]: subseries }
  }
  catch {
    subseriesByRow.value = { ...subseriesByRow.value, [rowIndex]: [] }
    toast.error('No se pudieron cargar las subseries.')
  }
  finally {
    loadingSubseriesRow.value = null
  }
}

async function loadDocTypesForRow(rowIndex: number, subseriesId: number | null) {
  if (!subseriesId) {
    docTypesByRow.value = { ...docTypesByRow.value, [rowIndex]: [] }
    return
  }

  loadingDocTypesRow.value = rowIndex

  try {
    const types = await catalogApi.fetchDocumentTypes(subseriesId)
    docTypesByRow.value = { ...docTypesByRow.value, [rowIndex]: types }
  }
  catch {
    docTypesByRow.value = { ...docTypesByRow.value, [rowIndex]: [] }
    toast.error('No se pudieron cargar los tipos documentales.')
  }
  finally {
    loadingDocTypesRow.value = null
  }
}

async function onOrgUnitChange(rowIndex: number, value: string | null) {
  const row = model.value[rowIndex]
  if (!row) {
    return
  }

  row.org_unit_id = value ? Number(value) : null
  row.trd_table_id = null
  row.doc_series_id = null
  row.doc_subseries_id = null
  row.doc_document_type_id = null

  await loadSeriesForRow(rowIndex, row.org_unit_id)
  subseriesByRow.value = { ...subseriesByRow.value, [rowIndex]: [] }
  docTypesByRow.value = { ...docTypesByRow.value, [rowIndex]: [] }
}

async function onSeriesChange(rowIndex: number, value: string | null) {
  const row = model.value[rowIndex]
  if (!row) {
    return
  }

  row.doc_series_id = value ? Number(value) : null
  row.doc_subseries_id = null
  row.doc_document_type_id = null
  await loadSubseriesForRow(rowIndex, row.doc_series_id)
  docTypesByRow.value = { ...docTypesByRow.value, [rowIndex]: [] }
}

async function onSubseriesChange(rowIndex: number, value: string | null) {
  const row = model.value[rowIndex]
  if (!row) {
    return
  }

  row.doc_subseries_id = value ? Number(value) : null
  row.doc_document_type_id = null
  await loadDocTypesForRow(rowIndex, row.doc_subseries_id)
}

function onDocTypeChange(rowIndex: number, value: string | null) {
  const row = model.value[rowIndex]
  if (!row) {
    return
  }

  row.doc_document_type_id = value ? Number(value) : null
}

function onTrdTableChange(rowIndex: number, value: string | null) {
  const row = model.value[rowIndex]
  if (!row) {
    return
  }

  row.trd_table_id = value ? Number(value) : null
}

async function hydrateRow(rowIndex: number, row: ProducerAreaDraft) {
  await loadSeriesForRow(rowIndex, row.org_unit_id)
  await loadSubseriesForRow(rowIndex, row.doc_series_id)
  await loadDocTypesForRow(rowIndex, row.doc_subseries_id)
}

watch(
  () => model.value.length,
  async () => {
    for (const [index, row] of model.value.entries()) {
      if (row.org_unit_id && !(index in seriesByRow.value)) {
        await hydrateRow(index, row)
      }
    }
  },
  { immediate: true },
)

defineExpose({
  hydrateAllRows: async () => {
    for (const [index, row] of model.value.entries()) {
      await hydrateRow(index, row)
    }
  },
})
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium">
          Áreas productoras y TRD
          <Badge v-if="model.length > 0" variant="secondary" class="ml-2 align-middle">
            {{ model.length }}
          </Badge>
        </p>
        <p class="text-xs text-muted-foreground">
          Agregue una fila por cada área que use este tipo, con su serie, subserie y tipo documental en el catálogo.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" :disabled="disabled" @click="addRow">
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Agregar área
      </Button>
    </div>

    <div
      v-if="model.length === 0"
      class="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    >
      <p class="text-sm text-muted-foreground">
        Sin áreas productoras configuradas. El tipo podrá usarse en cualquier área al crear expedientes.
      </p>
      <Button type="button" variant="outline" size="sm" :disabled="disabled" @click="addRow">
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Agregar la primera
      </Button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(row, index) in model"
        :key="`producer-area-${index}-${row.org_unit_id ?? 'new'}`"
        class="rounded-lg border bg-muted/10 p-4"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="text-sm font-medium">
            Área {{ index + 1 }}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 shrink-0"
            :disabled="disabled"
            @click="removeRow(index)"
          >
            <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
          </Button>
        </div>

        <div class="grid min-w-0 gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label :for="`producer_area_unit_${index}`">Área productora *</Label>
            <ArchivalCatalogSearchSelect
              :id="`producer_area_unit_${index}`"
              :model-value="row.org_unit_id != null ? String(row.org_unit_id) : null"
              :options="orgUnitOptions(index)"
              placeholder="Buscar área…"
              no-options-text="Sin áreas disponibles"
              :disabled="disabled"
              @update:model-value="onOrgUnitChange(index, $event)"
            />
          </div>

          <div class="space-y-2">
            <Label :for="`producer_area_trd_${index}`">Tabla TRD</Label>
            <ArchivalCatalogSearchSelect
              :id="`producer_area_trd_${index}`"
              :model-value="row.trd_table_id != null ? String(row.trd_table_id) : null"
              :options="trdTableOptions(row.org_unit_id)"
              placeholder="Opcional"
              no-options-text="Sin tablas para el área"
              :disabled="disabled || !row.org_unit_id"
              @update:model-value="onTrdTableChange(index, $event)"
            />
          </div>

          <div class="space-y-2">
            <Label :for="`producer_area_series_${index}`">Serie *</Label>
            <ArchivalCatalogSearchSelect
              :id="`producer_area_series_${index}`"
              :model-value="row.doc_series_id != null ? String(row.doc_series_id) : null"
              :options="seriesOptions(index)"
              placeholder="Buscar serie…"
              no-options-text="Seleccione un área primero"
              :disabled="disabled || !row.org_unit_id || loadingSeriesRow === index"
              @update:model-value="onSeriesChange(index, $event)"
            />
          </div>

          <div class="space-y-2">
            <Label :for="`producer_area_subseries_${index}`">Subserie *</Label>
            <ArchivalCatalogSearchSelect
              :id="`producer_area_subseries_${index}`"
              :model-value="row.doc_subseries_id != null ? String(row.doc_subseries_id) : null"
              :options="subseriesOptions(index)"
              placeholder="Buscar subserie…"
              no-options-text="Seleccione una serie primero"
              :disabled="disabled || !row.doc_series_id || loadingSubseriesRow === index"
              @update:model-value="onSubseriesChange(index, $event)"
            />
          </div>

          <div class="space-y-2 md:col-span-2">
            <Label :for="`producer_area_doctype_${index}`">Tipo documental</Label>
            <ArchivalCatalogSearchSelect
              :id="`producer_area_doctype_${index}`"
              :model-value="row.doc_document_type_id != null ? String(row.doc_document_type_id) : null"
              :options="docTypeOptions(index)"
              placeholder="Buscar tipo documental…"
              no-options-text="Seleccione una subserie primero"
              :disabled="disabled || !row.doc_subseries_id || loadingDocTypesRow === index"
              @update:model-value="onDocTypeChange(index, $event)"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-center">
        <Button type="button" variant="outline" size="sm" :disabled="disabled" @click="addRow">
          <Icon name="i-lucide-plus" class="mr-1 size-4" />
          Agregar otra área
        </Button>
      </div>
    </div>
  </div>
</template>
