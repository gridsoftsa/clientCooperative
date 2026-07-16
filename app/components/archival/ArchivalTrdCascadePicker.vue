<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import type { CatalogTreeSeries } from '~/types/archival-trd'
import { ARCHIVAL_MULTISELECT_CLASSES, onArchivalMultiselectOpen } from '~/composables/useArchivalMultiselect'

const props = withDefaults(
  defineProps<{
    catalogTree: CatalogTreeSeries[]
    disabled?: boolean
    excludeIds?: number[]
    /** Sin etiquetas; los hijos participan en el grid del padre (`display: contents`). */
    inline?: boolean
  }>(),
  {
    disabled: false,
    excludeIds: () => [],
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

const seriesOptions = computed(() =>
  props.catalogTree.map(series => ({
    value: series.id,
    label: `${series.code} — ${series.name}`,
  })),
)

const subseriesOptions = computed(() => {
  const series = props.catalogTree.find(item => item.id === seriesId.value)

  return (series?.subseries ?? []).map(subseries => ({
    value: subseries.id,
    label: `${subseries.code} — ${subseries.name}`,
  }))
})

const typeOptions = computed(() => {
  const series = props.catalogTree.find(item => item.id === seriesId.value)
  const subseries = series?.subseries.find(item => item.id === subseriesId.value)
  const excluded = new Set(props.excludeIds)

  return (subseries?.document_types ?? [])
    .filter(type => type.id === docDocumentTypeId.value || !excluded.has(type.id))
    .map(type => ({
      value: type.id,
      label: `${type.code} — ${type.name}`,
    }))
})

function syncHierarchyFromDocType(id: number | null) {
  if (id == null) {
    return
  }

  for (const series of props.catalogTree) {
    for (const subseries of series.subseries ?? []) {
      const found = subseries.document_types?.find(type => type.id === id)
      if (found) {
        if (seriesId.value !== series.id) {
          seriesId.value = series.id
        }
        if (subseriesId.value !== subseries.id) {
          subseriesId.value = subseries.id
        }

        return
      }
    }
  }
}

watch(seriesId, () => {
  subseriesId.value = null
  docDocumentTypeId.value = null
})

watch(subseriesId, () => {
  docDocumentTypeId.value = null
})

watch(docDocumentTypeId, (id) => {
  syncHierarchyFromDocType(id)
})

watch(
  () => props.catalogTree,
  () => syncHierarchyFromDocType(docDocumentTypeId.value),
  { immediate: true },
)
</script>

<template>
  <div
    class="min-w-0"
    :class="inline ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 gap-3 lg:grid-cols-3'"
  >
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Serie</Label>
      <Multiselect
        :id="fieldIds.series"
        v-model="seriesId"
        mode="single"
        :object="false"
        :options="seriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="true"
        :append-to-body="true"
        :close-on-scroll="true"
        :disabled="disabled"
        :placeholder="placeholders.series"
        :classes="ARCHIVAL_MULTISELECT_CLASSES"
        no-options-text="Sin series"
        no-results-text="Sin coincidencias"
        class="archival-single-multiselect"
        @open="onArchivalMultiselectOpen"
      />
    </div>
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Subserie</Label>
      <Multiselect
        :id="fieldIds.subseries"
        v-model="subseriesId"
        mode="single"
        :object="false"
        :options="subseriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="true"
        :append-to-body="true"
        :close-on-scroll="true"
        :disabled="disabled || !seriesId"
        :placeholder="placeholders.subseries"
        :classes="ARCHIVAL_MULTISELECT_CLASSES"
        no-options-text="Sin subseries"
        no-results-text="Sin coincidencias"
        class="archival-single-multiselect"
        @open="onArchivalMultiselectOpen"
      />
    </div>
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Tipo documental</Label>
      <Multiselect
        :id="fieldIds.type"
        v-model="docDocumentTypeId"
        mode="single"
        :object="false"
        :options="typeOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="true"
        :append-to-body="true"
        :close-on-scroll="true"
        :disabled="disabled || !subseriesId"
        :placeholder="placeholders.type"
        :classes="ARCHIVAL_MULTISELECT_CLASSES"
        no-options-text="Sin tipos documentales"
        no-results-text="Sin coincidencias"
        class="archival-single-multiselect"
        @open="onArchivalMultiselectOpen"
      />
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped>
.archival-single-multiselect :deep(.multiselect-single-label-text) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
