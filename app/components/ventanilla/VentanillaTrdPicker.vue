<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type { CatalogTreeSeries } from '~/types/archival-trd'
import { ventanillaMultiselectErrorClass } from '~/utils/ventanilla-form-field-focus'

const props = defineProps<{
  orgUnitId: number | null
  functionalTypeKey?: string | null
  orgUnitRoleLabel?: string
  submitAttempted?: boolean
  readonly?: boolean
}>()

const docDocumentTypeId = defineModel<number | null>('docDocumentTypeId', { default: null })

const ventanillaApi = useVentanillaApi()
const catalogTree = ref<CatalogTreeSeries[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const trdSource = ref<'functional_type_area' | 'org_unit' | null>(null)
const seriesId = ref<number | null>(null)
const subseriesId = ref<number | null>(null)
const applyingDefaults = ref(false)

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

const trdContextHint = computed(() => {
  if (trdSource.value === 'functional_type_area') {
    return 'TRD del tipo de expediente vinculado al tipo funcional para el área seleccionada.'
  }

  return null
})

function resetTrdSelection(): void {
  seriesId.value = null
  subseriesId.value = null
  docDocumentTypeId.value = null
}

function applyTrdDefaults(defaults: {
  doc_series_id: number | null
  doc_subseries_id: number | null
  doc_document_type_id: number | null
}): void {
  applyingDefaults.value = true
  seriesId.value = defaults.doc_series_id
  subseriesId.value = defaults.doc_subseries_id
  docDocumentTypeId.value = defaults.doc_document_type_id

  nextTick(() => {
    if (docDocumentTypeId.value == null && typeOptions.value.length === 1) {
      docDocumentTypeId.value = typeOptions.value[0]?.value ?? null
    }

    applyingDefaults.value = false
  })
}

async function loadTrdContext(): Promise<void> {
  resetTrdSelection()
  catalogTree.value = []
  loadError.value = null
  trdSource.value = null

  const orgUnitId = props.orgUnitId
  if (orgUnitId == null || orgUnitId < 1 || !props.functionalTypeKey) {
    return
  }

  loading.value = true

  try {
    const context = await ventanillaApi.fetchFunctionalTypeTrdContext(props.functionalTypeKey, orgUnitId)
    trdSource.value = context.source

    if (context.message && context.catalog_tree.length === 0) {
      loadError.value = context.message
      return
    }

    catalogTree.value = context.catalog_tree ?? []
    if (catalogTree.value.length === 0) {
      loadError.value = context.message ?? 'La TRD vigente no tiene tipos documentales asociados. Revise la configuración en Archivo → TRD.'
      return
    }

    applyTrdDefaults(context.defaults)
  }
  catch {
    catalogTree.value = []
    loadError.value = 'No se pudo cargar la TRD vigente.'
    toast.error('No se pudo cargar la clasificación archivística (TRD)')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => [props.orgUnitId, props.functionalTypeKey] as const,
  () => {
    void loadTrdContext()
  },
  { immediate: true },
)

watch(seriesId, (next, previous) => {
  if (applyingDefaults.value || next === previous) {
    return
  }

  subseriesId.value = null
  docDocumentTypeId.value = null
})

watch(subseriesId, (next, previous) => {
  if (applyingDefaults.value || next === previous) {
    return
  }

  docDocumentTypeId.value = null
})

watch(typeOptions, (options) => {
  if (applyingDefaults.value || props.readonly || !subseriesId.value || docDocumentTypeId.value != null) {
    return
  }

  if (options.length === 1) {
    docDocumentTypeId.value = options[0]?.value ?? null
  }
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

const showTrdValidation = computed(() => Boolean(!props.readonly && props.submitAttempted && props.orgUnitId))

const seriesMissing = computed(() => showTrdValidation.value && !seriesId.value)
const subseriesMissing = computed(() => showTrdValidation.value && Boolean(seriesId.value) && !subseriesId.value)
const documentTypeMissing = computed(() => showTrdValidation.value && Boolean(subseriesId.value) && !docDocumentTypeId.value)

function seriesErrorClass(): string {
  return ventanillaMultiselectErrorClass(seriesMissing.value)
}

function subseriesErrorClass(): string {
  return ventanillaMultiselectErrorClass(subseriesMissing.value)
}

function documentTypeErrorClass(): string {
  return ventanillaMultiselectErrorClass(documentTypeMissing.value)
}

function focusFirstMissingTrdField(): void {
  const rootId = seriesMissing.value
    ? 'ventanilla_trd_series'
    : subseriesMissing.value
      ? 'ventanilla_trd_subseries'
      : documentTypeMissing.value
        ? 'ventanilla_trd_document_type'
        : null

  if (!rootId) {
    return
  }

  const root = document.getElementById(rootId)
  if (!root) {
    return
  }

  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({
  focusFirstMissingTrdField,
})
</script>

<template>
  <div class="grid min-w-0 gap-4 md:grid-cols-3">
    <div class="min-w-0 space-y-2">
      <Label>Serie</Label>
      <Multiselect
        id="ventanilla_trd_series"
        v-model="seriesId"
        mode="single"
        :object="false"
        :options="seriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="readonly || loading || !orgUnitId || seriesOptions.length === 0"
        placeholder="Seleccione serie"
        no-options-text="Sin series en la TRD"
        no-results-text="Sin coincidencias"
        :class="seriesErrorClass()"
      />
    </div>
    <div class="min-w-0 space-y-2">
      <Label>Subserie</Label>
      <Multiselect
        id="ventanilla_trd_subseries"
        v-model="subseriesId"
        mode="single"
        :object="false"
        :options="subseriesOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="readonly || !seriesId || subseriesOptions.length === 0"
        placeholder="Seleccione subserie"
        no-options-text="Sin subseries"
        no-results-text="Sin coincidencias"
        :class="subseriesErrorClass()"
      />
    </div>
    <div class="min-w-0 space-y-2">
      <Label>Tipo documental</Label>
      <Multiselect
        id="ventanilla_trd_document_type"
        v-model="docDocumentTypeId"
        mode="single"
        :object="false"
        :options="typeOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="false"
        :disabled="readonly || !subseriesId || typeOptions.length === 0"
        placeholder="Seleccione tipo"
        no-options-text="Sin tipos documentales"
        no-results-text="Sin coincidencias"
        :class="documentTypeErrorClass()"
      />
    </div>
    <p v-if="loading" class="md:col-span-3 text-xs text-muted-foreground">
      Cargando TRD vigente…
    </p>
    <p v-else-if="!orgUnitId" class="md:col-span-3 text-xs text-muted-foreground">
      Seleccione primero {{ orgUnitRoleLabel ?? 'el área' }} para cargar la TRD.
    </p>
    <p v-else-if="!functionalTypeKey" class="md:col-span-3 text-xs text-muted-foreground">
      Seleccione el tipo funcional para aplicar la TRD del tipo de expediente vinculado.
    </p>
    <p v-else-if="loadError" class="md:col-span-3 text-xs text-destructive">
      {{ loadError }}
    </p>
    <p v-else-if="trdContextHint" class="md:col-span-3 text-xs text-muted-foreground">
      {{ trdContextHint }}
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

.ventanilla-single-multiselect.multiselect-danger :deep(.multiselect-wrapper) {
  border-color: hsl(var(--destructive));
}

.ventanilla-single-multiselect.multiselect-danger :deep(.multiselect-wrapper:focus-within) {
  border-color: hsl(var(--destructive));
  box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.4);
}
</style>
