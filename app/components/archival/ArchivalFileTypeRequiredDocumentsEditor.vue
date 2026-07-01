<script setup lang="ts">
import { toast } from 'vue-sonner'
import { flattenCatalogDocumentTypes } from '~/utils/archival-file-upload'

export interface WorkflowStageOption {
  value: string
  label: string
}

export interface RequiredDocumentDraft {
  doc_document_type_id: number | null
  label: string
  workflow_stage_key: string
  is_required: boolean
  sort_order: number
}

const props = defineProps<{
  orgUnitId?: number | null
  workflowStageOptions: WorkflowStageOption[]
}>()

const model = defineModel<RequiredDocumentDraft[]>({ required: true })

const trdApi = useTrdApi()
const loadingDocTypes = ref(false)
const docTypeOptions = ref<Array<{ id: number, label: string }>>([])

const WORKFLOW_STAGE_ANY = '__any__'

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

async function loadDocTypes() {
  if (!props.orgUnitId) {
    docTypeOptions.value = []
    return
  }

  loadingDocTypes.value = true

  try {
    const tree = await trdApi.fetchCatalogTree(props.orgUnitId)
    docTypeOptions.value = flattenCatalogDocumentTypes(tree).map(option => ({
      id: option.id,
      label: option.label,
    }))
  }
  catch {
    docTypeOptions.value = []
    toast.error('No se pudo cargar el catálogo documental del área.')
  }
  finally {
    loadingDocTypes.value = false
  }
}

function stageSelectValue(row: RequiredDocumentDraft): string {
  return row.workflow_stage_key || WORKFLOW_STAGE_ANY
}

function updateStageValue(row: RequiredDocumentDraft, value: string) {
  row.workflow_stage_key = value === WORKFLOW_STAGE_ANY ? '' : value
}

function docTypeLabel(docTypeId: number | null): string {
  if (!docTypeId) {
    return 'Seleccione tipo'
  }

  return docTypeOptions.value.find(option => option.id === docTypeId)?.label ?? `Tipo #${docTypeId}`
}

watch(() => props.orgUnitId, () => loadDocTypes(), { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium">
          Documentos obligatorios
        </p>
        <p class="text-xs text-muted-foreground">
          Defina tipos documentales requeridos para cerrar el expediente o para una etapa del workflow.
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

    <div v-else-if="loadingDocTypes" class="text-sm text-muted-foreground">
      Cargando tipos documentales…
    </div>

    <div v-else-if="model.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      Sin documentos obligatorios configurados.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(row, index) in model"
        :key="index"
        class="grid gap-3 rounded-lg border bg-muted/10 p-4 md:grid-cols-12"
      >
        <div class="space-y-2 md:col-span-5">
          <Label>Tipo documental</Label>
          <Select
            :model-value="row.doc_document_type_id != null ? String(row.doc_document_type_id) : undefined"
            @update:model-value="row.doc_document_type_id = $event ? Number($event) : null"
          >
            <SelectTrigger>
              <SelectValue :placeholder="docTypeLabel(row.doc_document_type_id)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in docTypeOptions"
                :key="option.id"
                :value="String(option.id)"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2 md:col-span-3">
          <Label>Etapa workflow</Label>
          <Select
            :model-value="stageSelectValue(row)"
            @update:model-value="updateStageValue(row, String($event))"
          >
            <SelectTrigger>
              <SelectValue placeholder="Cierre / general" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="WORKFLOW_STAGE_ANY">
                Cierre / general
              </SelectItem>
              <SelectItem
                v-for="stage in workflowStageOptions"
                :key="stage.value"
                :value="stage.value"
              >
                {{ stage.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2 md:col-span-3">
          <Label>Etiqueta</Label>
          <Input v-model="row.label" placeholder="Opcional" />
        </div>

        <div class="flex items-end justify-between gap-2 md:col-span-1">
          <div class="flex items-center gap-2 pb-2">
            <Checkbox :id="`req_${index}`" v-model="row.is_required" />
            <Label :for="`req_${index}`" class="text-xs font-normal">Obligatorio</Label>
          </div>
          <Button type="button" variant="ghost" size="icon" @click="removeRow(index)">
            <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
