<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useMediaQuery } from '@vueuse/core'
import type { ArchivalFileTypeProducerArea } from '~/types/archival-file'
import type { CatalogTreeSeries } from '~/types/archival-trd'

export interface RequiredDocumentDraft {
  org_unit_id: number
  doc_document_type_id: number | null
  label: string
  is_required: boolean
  sort_order: number
  catalogHierarchyHint?: {
    doc_series_id: number
    doc_subseries_id: number
    doc_type?: { id: number, code: string, name: string }
  } | null
}

const props = defineProps<{
  producerAreas?: ArchivalFileTypeProducerArea[]
}>()

const model = defineModel<RequiredDocumentDraft[]>({ required: true })

const trdApi = useTrdApi()

const loadingCatalog = ref(false)
const catalogTreesByArea = ref<Record<number, CatalogTreeSeries[]>>({})
const isWideRequiredRow = useMediaQuery('(min-width: 1280px)')

const configuredAreas = computed(() =>
  (props.producerAreas ?? []).filter(
    area => area.org_unit_id && area.doc_series_id && area.doc_subseries_id,
  ),
)

function areaLabel(area: ArchivalFileTypeProducerArea): string {
  const name = area.org_unit?.name ?? `Área #${area.org_unit_id}`
  const series = area.doc_series?.code
  const subseries = area.doc_subseries?.code

  if (series && subseries) {
    return `${name} — ${series} / ${subseries}`
  }

  return name
}

function rowsForArea(orgUnitId: number): RequiredDocumentDraft[] {
  return model.value.filter(row => row.org_unit_id === orgUnitId)
}

function emptyRow(orgUnitId: number, sortOrder: number): RequiredDocumentDraft {
  return {
    org_unit_id: orgUnitId,
    doc_document_type_id: null,
    label: '',
    is_required: true,
    sort_order: sortOrder,
  }
}

function addRow(orgUnitId: number) {
  const areaRows = rowsForArea(orgUnitId)
  model.value = [...model.value, emptyRow(orgUnitId, areaRows.length)]
}

function removeRow(orgUnitId: number, rowIndexInArea: number) {
  const areaRows = rowsForArea(orgUnitId)
  const target = areaRows[rowIndexInArea]
  if (!target) {
    return
  }

  model.value = model.value
    .filter(row => row !== target)
    .map((row, index) => ({ ...row, sort_order: index }))
}

function scopedCatalogTreeForArea(area: ArchivalFileTypeProducerArea): CatalogTreeSeries[] {
  const tree = catalogTreesByArea.value[area.org_unit_id] ?? []
  const seriesId = area.doc_series_id
  const subseriesId = area.doc_subseries_id

  if (!seriesId || !subseriesId) {
    return []
  }

  return tree
    .filter(series => series.id === seriesId)
    .map(series => ({
      ...series,
      subseries: (series.subseries ?? []).filter(sub => sub.id === subseriesId),
    }))
    .filter(series => (series.subseries?.length ?? 0) > 0)
}

function excludedDocTypeIds(orgUnitId: number, row: RequiredDocumentDraft): number[] {
  return model.value
    .filter(item => item.org_unit_id === orgUnitId && item !== row)
    .map(item => item.doc_document_type_id)
    .filter((id): id is number => id != null)
}

async function loadCatalogTrees() {
  const areas = configuredAreas.value

  if (areas.length === 0) {
    catalogTreesByArea.value = {}
    return
  }

  loadingCatalog.value = true

  try {
    const entries = await Promise.all(
      areas.map(async (area) => {
        const tree = await trdApi.fetchCatalogTree(area.org_unit_id, false)
        return [area.org_unit_id, tree] as const
      }),
    )

    catalogTreesByArea.value = Object.fromEntries(entries)
  }
  catch {
    catalogTreesByArea.value = {}
    toast.error('No se pudo cargar el catálogo documental de las áreas.')
  }
  finally {
    loadingCatalog.value = false
  }
}

const canConfigureRequired = computed(() => configuredAreas.value.length > 0)

watch(() => props.producerAreas, () => {
  const allowedOrgUnitIds = new Set(configuredAreas.value.map(area => area.org_unit_id))
  model.value = model.value.filter(row => allowedOrgUnitIds.has(row.org_unit_id))
  loadCatalogTrees()
}, { immediate: true, deep: true })
</script>

<template>
  <div class="min-w-0 space-y-6">
    <div>
      <p class="text-sm font-medium">
        Documentos obligatorios del expediente
        <Badge v-if="model.length > 0" variant="secondary" class="ml-2 align-middle">
          {{ model.length }}
        </Badge>
      </p>
      <p class="text-xs text-muted-foreground">
        Checklist para cerrar el expediente y alertas de documentación faltante. Si el tipo usa workflow,
        los requisitos por etapa se configuran en el flujo de trabajo, no aquí.
      </p>
    </div>

    <Alert v-if="!canConfigureRequired" variant="secondary">
      <Icon name="i-lucide-info" class="size-4" />
      <AlertTitle>Áreas productoras requeridas</AlertTitle>
      <AlertDescription>
        Configure al menos un área productora con serie y subserie en la pestaña <strong>General y TRD</strong>
        antes de definir documentos obligatorios.
      </AlertDescription>
    </Alert>

    <div v-else-if="loadingCatalog" class="text-sm text-muted-foreground">
      Cargando catálogos…
    </div>

    <div v-else class="space-y-6">
      <section
        v-for="area in configuredAreas"
        :key="`required-area-${area.org_unit_id}`"
        class="space-y-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium">
              {{ areaLabel(area) }}
            </p>
            <p class="text-xs text-muted-foreground">
              Aplica a expedientes con área productora
              <span class="font-medium text-foreground">{{ area.org_unit?.name ?? area.org_unit_id }}</span>.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" @click="addRow(area.org_unit_id)">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Agregar
          </Button>
        </div>

        <div
          v-if="rowsForArea(area.org_unit_id).length === 0"
          class="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center"
        >
          <p class="text-sm text-muted-foreground">
            Sin documentos obligatorios para esta área.
          </p>
          <Button type="button" variant="outline" size="sm" @click="addRow(area.org_unit_id)">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Agregar el primero
          </Button>
        </div>

        <div v-else class="rounded-lg border bg-card">
          <div class="overflow-x-auto">
            <div class="required-doc-table min-w-[42rem]">
              <div
                class="required-doc-header-grid hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground xl:grid"
              >
                <span>#</span>
                <span>Tipo documental</span>
                <span>Etiqueta</span>
                <span class="text-center">Acciones</span>
              </div>

              <div class="divide-y">
                <div
                  v-for="(row, index) in rowsForArea(area.org_unit_id)"
                  :key="`required-doc-${area.org_unit_id}-${index}-${row.doc_document_type_id ?? 'new'}`"
                  class="min-w-0 px-3 py-3"
                >
                  <div class="required-doc-row-grid hidden items-center xl:grid">
                    <span
                      class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                      :title="`Documento obligatorio ${index + 1}`"
                    >
                      {{ index + 1 }}
                    </span>

                    <ArchivalTrdCascadePicker
                      v-if="isWideRequiredRow"
                      v-model="row.doc_document_type_id"
                      inline
                      :catalog-tree="scopedCatalogTreeForArea(area)"
                      :catalog-hierarchy-hint="row.catalogHierarchyHint"
                      :exclude-ids="excludedDocTypeIds(area.org_unit_id, row)"
                      :disabled="loadingCatalog"
                    />

                    <Input
                      :model-value="row.label ?? ''"
                      placeholder="Opcional"
                      class="h-11 min-w-0"
                      @update:model-value="row.label = String($event ?? '')"
                    />

                    <div class="flex items-center justify-center gap-1">
                      <Checkbox :id="`req_${area.org_unit_id}_${index}`" v-model="row.is_required" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-9 shrink-0"
                        :title="`Eliminar documento ${index + 1}`"
                        @click="removeRow(area.org_unit_id, index)"
                      >
                        <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div class="space-y-3 xl:hidden">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span
                          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                        >
                          {{ index + 1 }}
                        </span>
                        <span class="text-sm font-medium">Documento obligatorio</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-9 shrink-0"
                        @click="removeRow(area.org_unit_id, index)"
                      >
                        <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
                      </Button>
                    </div>

                    <div class="space-y-2">
                      <p class="text-xs font-medium text-muted-foreground">
                        Catálogo TRD
                      </p>
                      <ArchivalTrdCascadePicker
                        v-if="!isWideRequiredRow"
                        v-model="row.doc_document_type_id"
                        :catalog-tree="scopedCatalogTreeForArea(area)"
                        :catalog-hierarchy-hint="row.catalogHierarchyHint"
                        :exclude-ids="excludedDocTypeIds(area.org_unit_id, row)"
                        :disabled="loadingCatalog"
                      />
                    </div>

                    <div class="flex flex-wrap items-end gap-3">
                      <div class="min-w-0 flex-1 space-y-2">
                        <Label :for="`req_label_${area.org_unit_id}_${index}`">Etiqueta</Label>
                        <Input
                          :id="`req_label_${area.org_unit_id}_${index}`"
                          :model-value="row.label ?? ''"
                          placeholder="Opcional"
                          @update:model-value="row.label = String($event ?? '')"
                        />
                      </div>
                      <div class="flex items-center gap-2 pb-2">
                        <Checkbox :id="`req_mobile_${area.org_unit_id}_${index}`" v-model="row.is_required" />
                        <Label :for="`req_mobile_${area.org_unit_id}_${index}`" class="text-xs font-normal">Obligatorio</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-center border-t bg-muted/20 px-3 py-3">
            <Button type="button" variant="outline" size="sm" @click="addRow(area.org_unit_id)">
              <Icon name="i-lucide-plus" class="mr-1 size-4" />
              Agregar otro documento
            </Button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.required-doc-header-grid,
.required-doc-row-grid {
  grid-template-columns:
    2.25rem
    minmax(0, 2fr)
    minmax(8rem, 12rem)
    4.75rem;
  column-gap: 0.625rem;
  align-items: center;
}
</style>
