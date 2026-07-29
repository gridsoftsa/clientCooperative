<script setup lang="ts">
import type { CatalogTreeSeries } from '~/types/archival-trd'

const props = withDefaults(
  defineProps<{
    catalogTree: CatalogTreeSeries[]
    disabled?: boolean
    excludeIds?: number[]
    /** Serie/subserie guardadas (cuando el tipo no aparece aún en el árbol cargado). */
    catalogHierarchyHint?: {
      doc_series_id: number
      doc_subseries_id: number
      doc_type?: { id: number, code: string, name: string }
    } | null
    /** Sin etiquetas; los hijos participan en el grid del padre (`display: contents`). */
    inline?: boolean
  }>(),
  {
    disabled: false,
    excludeIds: () => [],
    catalogHierarchyHint: null,
    inline: false,
  },
)

const docDocumentTypeId = defineModel<number | null>({ default: null })

const pickerId = useId()
const fieldIds = {
  series: `archival-trd-series-${pickerId}`,
  subseries: `archival-trd-subseries-${pickerId}`,
  type: `archival-trd-type-${pickerId}`,
}

const seriesId = ref<number | null>(null)
const subseriesId = ref<number | null>(null)
const syncingHierarchy = ref(false)

function normalizeCatalogId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : null
}

function findDocTypePath(docTypeId: number | null) {
  if (docTypeId == null || !props.catalogTree.length) {
    return null
  }

  for (const series of props.catalogTree) {
    for (const subseries of series.subseries ?? []) {
      const found = subseries.document_types?.find(
        type => Number(type.id) === Number(docTypeId),
      )
      if (found) {
        return { series, subseries, type: found }
      }
    }
  }

  return null
}

const placeholders = computed(() => {
  if (props.inline) {
    return {
      series: 'Serie',
      subseries: 'Subserie',
      type: 'Tipo',
    }
  }

  return {
    series: 'Seleccione serie',
    subseries: 'Seleccione subserie',
    type: 'Seleccione tipo',
  }
})

const resolvedPath = computed(() => findDocTypePath(normalizeCatalogId(docDocumentTypeId.value)))

const seriesOptions = computed(() =>
  props.catalogTree.map(series => ({
    value: series.id,
    label: `${series.code} — ${series.name}`,
  })),
)

const subseriesOptions = computed(() => {
  const series =
    props.catalogTree.find(item => item.id === seriesId.value)
    ?? resolvedPath.value?.series

  const options = (series?.subseries ?? []).map(subseries => ({
    value: subseries.id,
    label: `${subseries.code} — ${subseries.name}`,
  }))

  const currentId = subseriesId.value ?? resolvedPath.value?.subseries.id
  if (currentId != null && !options.some(option => Number(option.value) === Number(currentId))) {
    const sub = resolvedPath.value?.subseries
    if (sub && Number(sub.id) === Number(currentId)) {
      options.unshift({
        value: sub.id,
        label: `${sub.code} — ${sub.name}`,
      })
    }
  }

  return options
})

const typeOptions = computed(() => {
  const series =
    props.catalogTree.find(item => item.id === seriesId.value)
    ?? resolvedPath.value?.series
  const subseries =
    series?.subseries.find(item => item.id === subseriesId.value)
    ?? resolvedPath.value?.subseries
  const excluded = new Set(props.excludeIds)
  const selectedId = normalizeCatalogId(docDocumentTypeId.value)

  const options = (subseries?.document_types ?? [])
    .filter(type => Number(type.id) === selectedId || !excluded.has(Number(type.id)))
    .map(type => ({
      value: type.id,
      label: `${type.code} — ${type.name}`,
    }))

  if (
    selectedId != null
    && !options.some(option => Number(option.value) === Number(selectedId))
  ) {
    const fromPath = resolvedPath.value?.type
    if (fromPath && Number(fromPath.id) === selectedId) {
      options.unshift({
        value: fromPath.id,
        label: `${fromPath.code} — ${fromPath.name}`,
      })
    }
    else if (props.catalogHierarchyHint?.doc_type) {
      const fromHint = props.catalogHierarchyHint.doc_type
      if (Number(fromHint.id) === selectedId) {
        options.unshift({
          value: fromHint.id,
          label: `${fromHint.code} — ${fromHint.name}`,
        })
      }
    }
  }

  return options
})

const canPickSubseries = computed(() => seriesId.value != null || resolvedPath.value != null)
const canPickDocType = computed(() => subseriesId.value != null || resolvedPath.value != null)

const multiselectHydrationKey = computed(() => {
  const docId = normalizeCatalogId(docDocumentTypeId.value)

  return `${props.catalogTree.length}-${docId ?? 'none'}-${seriesId.value ?? 's'}-${subseriesId.value ?? 'u'}`
})

async function setHierarchy(series: number, subseries: number): Promise<void> {
  syncingHierarchy.value = true

  try {
    seriesId.value = series
    subseriesId.value = subseries
    await nextTick()
    await nextTick()
  }
  finally {
    syncingHierarchy.value = false
  }
}

function applyHierarchyFromHints(docId: number): boolean {
  const hint = props.catalogHierarchyHint
  if (!hint?.doc_series_id || !hint?.doc_subseries_id) {
    return false
  }

  void setHierarchy(hint.doc_series_id, hint.doc_subseries_id)

  return true
}

function applyHierarchyFromDocType(): void {
  const docId = normalizeCatalogId(docDocumentTypeId.value)
  if (docId != null && docDocumentTypeId.value !== docId) {
    docDocumentTypeId.value = docId
  }

  if (docId == null) {
    return
  }

  const path = findDocTypePath(docId)
  if (path) {
    void setHierarchy(path.series.id, path.subseries.id)

    return
  }

  applyHierarchyFromHints(docId)
}

watch(seriesId, (next, prev) => {
  if (syncingHierarchy.value || next === prev) {
    return
  }

  const docId = normalizeCatalogId(docDocumentTypeId.value)
  if (docId != null && next != null) {
    const path = findDocTypePath(docId)
    if (path && Number(path.series.id) === Number(next)) {
      if (subseriesId.value !== path.subseries.id) {
        void setHierarchy(path.series.id, path.subseries.id)
      }

      return
    }
  }

  subseriesId.value = null
  docDocumentTypeId.value = null
})

watch(subseriesId, (next, prev) => {
  if (syncingHierarchy.value || next === prev) {
    return
  }

  const docId = normalizeCatalogId(docDocumentTypeId.value)
  if (docId != null && next != null) {
    const path = findDocTypePath(docId)
    if (path && Number(path.subseries.id) === Number(next)) {
      return
    }
  }

  docDocumentTypeId.value = null
})

watch(
  [() => props.catalogTree, () => docDocumentTypeId.value],
  () => {
    applyHierarchyFromDocType()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div
    class="min-w-0"
    :class="inline ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 gap-3 lg:grid-cols-3'"
  >
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Serie</Label>
      <ArchivalSingleMultiselect
        :id="fieldIds.series"
        :key="`series-${multiselectHydrationKey}`"
        v-model="seriesId"
        coerce-number
        :options="seriesOptions"
        :disabled="disabled"
        :placeholder="placeholders.series"
        no-options-text="Sin series"
        no-results-text="Sin coincidencias"
      />
    </div>
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Subserie</Label>
      <ArchivalSingleMultiselect
        :id="fieldIds.subseries"
        :key="`subseries-${multiselectHydrationKey}`"
        v-model="subseriesId"
        coerce-number
        :options="subseriesOptions"
        :disabled="disabled || !canPickSubseries"
        :placeholder="placeholders.subseries"
        no-options-text="Sin subseries"
        no-results-text="Sin coincidencias"
      />
    </div>
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Tipo documental</Label>
      <ArchivalSingleMultiselect
        :id="fieldIds.type"
        :key="`type-${multiselectHydrationKey}`"
        v-model="docDocumentTypeId"
        coerce-number
        :options="typeOptions"
        :disabled="disabled || !canPickDocType"
        :placeholder="placeholders.type"
        no-options-text="Sin tipos documentales"
        no-results-text="Sin coincidencias"
      />
    </div>
  </div>
</template>

<style scoped>
.archival-single-multiselect :deep(.multiselect-single-label-text) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
