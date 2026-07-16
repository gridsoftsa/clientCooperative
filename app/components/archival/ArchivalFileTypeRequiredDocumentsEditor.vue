<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalWorkflowDefinitionOption } from '~/components/archival/ArchivalWorkflowStageCascadePicker.vue'
import type { CatalogTreeSeries } from '~/types/archival-trd'

export interface RequiredDocumentDraft {
  doc_document_type_id: number | null
  label: string
  workflow_stage_key: string
  is_required: boolean
  sort_order: number
}

const props = defineProps<{
  orgUnitId?: number | null
}>()

const model = defineModel<RequiredDocumentDraft[]>({ required: true })

const archivalApi = useArchivalFileApi()
const trdApi = useTrdApi()

const loadingCatalog = ref(false)
const loadingWorkflows = ref(false)
const catalogTree = ref<CatalogTreeSeries[]>([])
const workflowDefinitions = ref<ArchivalWorkflowDefinitionOption[]>([])

function emptyRow(sortOrder: number): RequiredDocumentDraft {
  return {
    doc_document_type_id: null,
    label: '',
    workflow_stage_key: '',
    is_required: true,
    sort_order: sortOrder,
  }
}

function addRow() {
  model.value = [...model.value, emptyRow(model.value.length)]
}

function removeRow(index: number) {
  model.value = model.value.filter((_, rowIndex) => rowIndex !== index)
    .map((row, rowIndex) => ({ ...row, sort_order: rowIndex }))
}

async function loadCatalogTree() {
  if (!props.orgUnitId) {
    catalogTree.value = []

    return
  }

  loadingCatalog.value = true

  try {
    catalogTree.value = await trdApi.fetchCatalogTree(props.orgUnitId)
  }
  catch {
    catalogTree.value = []
    toast.error('No se pudo cargar el catálogo documental del área.')
  }
  finally {
    loadingCatalog.value = false
  }
}

async function loadWorkflowDefinitions() {
  loadingWorkflows.value = true

  try {
    workflowDefinitions.value = await archivalApi.fetchWorkflowStageOptions()
  }
  catch {
    workflowDefinitions.value = []
    toast.error('No se pudieron cargar los workflows.')
  }
  finally {
    loadingWorkflows.value = false
  }
}

function excludedDocTypeIds(rowIndex: number): number[] {
  return model.value
    .filter((_, index) => index !== rowIndex)
    .map(row => row.doc_document_type_id)
    .filter((id): id is number => id != null)
}

watch(() => props.orgUnitId, () => loadCatalogTree(), { immediate: true })

onMounted(() => loadWorkflowDefinitions())
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium">
          Documentos obligatorios
          <Badge v-if="model.length > 0" variant="secondary" class="ml-2 align-middle">
            {{ model.length }}
          </Badge>
        </p>
        <p class="text-xs text-muted-foreground">
          Cada fila es un documento obligatorio distinto. Elija serie → subserie → tipo y, si aplica, workflow → etapa.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" :disabled="!orgUnitId" @click="addRow">
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Agregar
      </Button>
    </div>

    <Alert v-if="!orgUnitId" variant="secondary">
      <Icon name="i-lucide-info" class="size-4" />
      <AlertTitle>Área productora requerida</AlertTitle>
      <AlertDescription>
        Configure el área productora en la pestaña General para listar tipos documentales del catálogo.
      </AlertDescription>
    </Alert>

    <div v-else-if="loadingCatalog || loadingWorkflows" class="text-sm text-muted-foreground">
      Cargando catálogos…
    </div>

    <div
      v-else-if="model.length === 0"
      class="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    >
      <p class="text-sm text-muted-foreground">
        Sin documentos obligatorios configurados.
      </p>
      <Button type="button" variant="outline" size="sm" @click="addRow">
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Agregar el primero
      </Button>
    </div>

    <div v-else class="rounded-lg border bg-card">
      <div class="overflow-x-auto">
        <div class="required-doc-table min-w-[58rem]">
          <div
            class="required-doc-header-grid hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground xl:grid"
          >
            <span>#</span>
            <div class="grid min-w-0 grid-cols-3 gap-2">
              <span>Serie</span>
              <span>Subserie</span>
              <span>Tipo documental</span>
            </div>
            <div class="grid min-w-0 grid-cols-2 gap-2">
              <span>Workflow</span>
              <span>Etapa</span>
            </div>
            <span>Etiqueta</span>
            <span class="text-center">Acciones</span>
          </div>

          <div class="divide-y">
            <div
              v-for="(row, index) in model"
              :key="index"
              class="min-w-0 px-3 py-3"
            >
              <!-- Escritorio: una fila por documento -->
              <div class="required-doc-row-grid hidden items-center xl:grid">
                <span
                  class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  :title="`Documento obligatorio ${index + 1}`"
                >
                  {{ index + 1 }}
                </span>

                <ArchivalTrdCascadePicker
                  v-model="row.doc_document_type_id"
                  inline
                  :catalog-tree="catalogTree"
                  :exclude-ids="excludedDocTypeIds(index)"
                  :disabled="loadingCatalog"
                />

                <ArchivalWorkflowStageCascadePicker
                  v-model="row.workflow_stage_key"
                  inline
                  :workflow-definitions="workflowDefinitions"
                  :disabled="loadingWorkflows"
                />

                <Input
                  :model-value="row.label ?? ''"
                  placeholder="Opcional"
                  class="h-11 min-w-0"
                  @update:model-value="row.label = String($event ?? '')"
                />

                <div class="flex items-center justify-center gap-1">
                  <Checkbox :id="`req_${index}`" v-model="row.is_required" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-9 shrink-0"
                    :title="`Eliminar documento ${index + 1}`"
                    @click="removeRow(index)"
                  >
                    <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <!-- Móvil / tablet: tarjeta compacta por documento -->
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
                    @click="removeRow(index)"
                  >
                    <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
                  </Button>
                </div>

                <div class="space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">
                    Catálogo TRD
                  </p>
                  <ArchivalTrdCascadePicker
                    v-model="row.doc_document_type_id"
                    :catalog-tree="catalogTree"
                    :exclude-ids="excludedDocTypeIds(index)"
                    :disabled="loadingCatalog"
                  />
                </div>

                <div class="space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">
                    Etapa workflow
                  </p>
                  <ArchivalWorkflowStageCascadePicker
                    v-model="row.workflow_stage_key"
                    :workflow-definitions="workflowDefinitions"
                    :disabled="loadingWorkflows"
                  />
                </div>

                <div class="flex flex-wrap items-end gap-3">
                  <div class="min-w-0 flex-1 space-y-2">
                    <Label :for="`req_label_${index}`">Etiqueta</Label>
                    <Input
                      :id="`req_label_${index}`"
                      :model-value="row.label ?? ''"
                      placeholder="Opcional"
                      @update:model-value="row.label = String($event ?? '')"
                    />
                  </div>
                  <div class="flex items-center gap-2 pb-2">
                    <Checkbox :id="`req_mobile_${index}`" v-model="row.is_required" />
                    <Label :for="`req_mobile_${index}`" class="text-xs font-normal">Obligatorio</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-center border-t bg-muted/20 px-3 py-3">
        <Button type="button" variant="outline" size="sm" @click="addRow">
          <Icon name="i-lucide-plus" class="mr-1 size-4" />
          Agregar otro documento
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.required-doc-header-grid,
.required-doc-row-grid {
  grid-template-columns:
    2.25rem
    minmax(0, 3.4fr)
    minmax(0, 2fr)
    minmax(8rem, 9.5rem)
    4.75rem;
  column-gap: 0.625rem;
  align-items: center;
}
</style>
