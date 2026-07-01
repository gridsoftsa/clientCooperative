<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type {
  ArchivalFile,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
} from '~/types/archival-file'
import {
  flattenCatalogDocumentTypes,
  flattenFileFolderNodes,
  isOcrSupportedUploadFile,
  validateArchivalMetadataFields,
  type ArchivalFileDocTypeOption,
} from '~/utils/archival-file-upload'

const props = defineProps<{
  file: ArchivalFile
  tree: ArchivalFileTreeNode | null
  required?: ArchivalFileRequiredDocumentsEvaluation | null
  workflowTaskId?: number | null
  presetNodeId?: number | null
  presetDocTypeId?: number | null
  lockFolder?: boolean
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const archivalApi = useArchivalFileApi()
const trdApi = useTrdApi()

const uploading = ref(false)
const loadingCatalog = ref(false)
const loadingSuggestions = ref(false)
const loadingOcr = ref(false)

const selectedFile = ref<File | null>(null)
const title = ref('')
const docDocumentTypeId = ref<number | null>(null)
const archivalFileNodeId = ref<number | null>(null)
const isMasterDocument = ref(false)

const metadataValues = ref<Record<string, unknown>>({})
const metadataFieldSources = ref<Record<string, string>>({})
const metadataConfidence = ref<Record<string, number>>({})
const metadataFields = ref<ArchivalMetadataFieldRow[]>([])
const metadataOcrPayload = ref<Record<string, unknown> | null>(null)
const ocrText = ref<string | null>(null)
const ocrEngine = ref<string | null>(null)

const docTypeOptions = ref<ArchivalFileDocTypeOption[]>([])
const folderOptions = computed(() => flattenFileFolderNodes(props.tree))

const allowsMasterDocuments = computed(() => props.file.file_type?.allows_master_documents ?? false)

const selectedDocTypeLabel = computed(() =>
  docTypeOptions.value.find((o: ArchivalFileDocTypeOption) => o.id === docDocumentTypeId.value)?.label ?? '',
)

function parseSchemaFields(schema: Record<string, unknown> | null): ArchivalMetadataFieldRow[] {
  if (!schema || !Array.isArray(schema.fields)) {
    return []
  }

  return (schema.fields as Array<Record<string, unknown>>).map((field, index) => ({
    code: String(field.code ?? ''),
    name: String(field.name ?? field.code ?? ''),
    data_type: String(field.data_type ?? 'text'),
    is_required: Boolean(field.is_required),
    sort_order: Number(field.sort_order ?? index),
    is_active: field.is_active !== false,
    is_reusable: Boolean(field.is_reusable),
    is_variable: Boolean(field.is_variable),
    is_ocr_extractable: Boolean(field.is_ocr_extractable),
    is_autocompletable: Boolean(field.is_autocompletable),
    is_searchable: Boolean(field.is_searchable),
    is_reportable: Boolean(field.is_reportable),
    options: (field.options as ArchivalMetadataFieldRow['options']) ?? null,
  }))
}

async function loadCatalog() {
  if (!props.file.org_unit_id) {
    return
  }

  loadingCatalog.value = true
  try {
    const tree = await trdApi.fetchCatalogTree(props.file.org_unit_id, true)
    docTypeOptions.value = flattenCatalogDocumentTypes(tree)
    preselectMissingDocType()
  }
  catch {
    toast.error('No se pudo cargar el catálogo documental.')
  }
  finally {
    loadingCatalog.value = false
  }
}

function preselectMissingDocType() {
  const firstMissing = props.required?.missing?.[0]?.doc_document_type_id
  if (firstMissing && !docDocumentTypeId.value) {
    docDocumentTypeId.value = firstMissing
  }
}

async function loadMetadataSuggestions() {
  metadataValues.value = {}
  metadataFieldSources.value = {}
  metadataConfidence.value = {}
  metadataOcrPayload.value = null
  ocrText.value = null
  ocrEngine.value = null
  metadataFields.value = []

  if (!docDocumentTypeId.value) {
    return
  }

  loadingSuggestions.value = true
  try {
    const query: Record<string, string | number> = {
      doc_document_type_id: docDocumentTypeId.value,
    }

    if (props.file.entity_key) {
      query.entity_key = props.file.entity_key
    }

    const nit = props.file.metadata_values?.nit
      ?? props.file.metadata_values?.third_party_nit
      ?? props.file.metadata_values?.document_number

    if (nit != null && nit !== '') {
      query.nit = String(nit)
    }

    const suggestion = await archivalApi.suggestMetadata(query)
    metadataFields.value = parseSchemaFields(suggestion.schema)
    metadataValues.value = { ...(suggestion.suggestions ?? {}) }
    metadataFieldSources.value = { ...(suggestion.field_sources ?? {}) }

    if (selectedFile.value) {
      await runOcrExtraction()
    }
  }
  catch {
    toast.error('No se pudieron cargar los metadatos sugeridos.')
  }
  finally {
    loadingSuggestions.value = false
  }
}

async function runOcrExtraction() {
  if (!selectedFile.value || !docDocumentTypeId.value || !isOcrSupportedUploadFile(selectedFile.value)) {
    return
  }

  loadingOcr.value = true
  try {
    const fd = new FormData()
    fd.append('file', selectedFile.value)
    fd.append('doc_document_type_id', String(docDocumentTypeId.value))

    const ocr = await archivalApi.extractMetadataOcr(fd)

    if (metadataFields.value.length === 0 && ocr.schema) {
      metadataFields.value = parseSchemaFields(ocr.schema)
    }

    ocrText.value = ocr.ocr_text
    ocrEngine.value = ocr.engine
    metadataOcrPayload.value = {
      suggestions: ocr.suggestions,
      confidence: ocr.confidence,
      engine: ocr.engine,
      processed: ocr.processed,
    }

    const nextValues = { ...metadataValues.value }
    const nextSources = { ...metadataFieldSources.value }
    const nextConfidence = { ...metadataConfidence.value }

    for (const [code, value] of Object.entries(ocr.suggestions ?? {})) {
      if (nextSources[code] === 'reused') {
        continue
      }

      nextValues[code] = value
      nextSources[code] = 'ocr'
      if (ocr.confidence?.[code] != null) {
        nextConfidence[code] = ocr.confidence[code]
      }
    }

    metadataValues.value = nextValues
    metadataFieldSources.value = nextSources
    metadataConfidence.value = nextConfidence

    if (ocr.processed) {
      toast.message('Metadatos sugeridos por OCR. Valide o rechace antes de guardar.')
    }
  }
  catch {
    toast.error('No se pudo procesar OCR del documento.')
  }
  finally {
    loadingOcr.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file

  if (file && !title.value.trim()) {
    title.value = file.name.replace(/\.[^.]+$/, '')
  }

  if (file && docDocumentTypeId.value) {
    void runOcrExtraction()
  }
}

function resetForm() {
  selectedFile.value = null
  title.value = ''
  archivalFileNodeId.value = null
  isMasterDocument.value = false
  metadataValues.value = {}
  metadataFieldSources.value = {}
  metadataConfidence.value = {}
  metadataOcrPayload.value = null
  ocrText.value = null
  ocrEngine.value = null
  metadataFields.value = []
  docDocumentTypeId.value = null
  preselectMissingDocType()
}

async function handleSubmit() {
  if (!selectedFile.value) {
    toast.error('Seleccione un archivo.')
    return
  }

  if (!docDocumentTypeId.value) {
    toast.error('Seleccione el tipo documental.')
    return
  }

  const metadataError = validateArchivalMetadataFields(metadataFields.value, metadataValues.value)
  if (metadataError) {
    toast.error(metadataError)
    return
  }

  const fd = new FormData()
  fd.append('file', selectedFile.value)
  fd.append('doc_document_type_id', String(docDocumentTypeId.value))

  if (title.value.trim()) {
    fd.append('title', title.value.trim())
  }

  if (archivalFileNodeId.value) {
    fd.append('archival_file_node_id', String(archivalFileNodeId.value))
  }

  if (allowsMasterDocuments.value && isMasterDocument.value) {
    fd.append('is_master_document', '1')
  }

  if (Object.keys(metadataValues.value).length > 0) {
    fd.append('metadata_values', JSON.stringify(metadataValues.value))
  }

  if (Object.keys(metadataFieldSources.value).length > 0) {
    fd.append('metadata_field_sources', JSON.stringify(metadataFieldSources.value))
  }

  if (metadataOcrPayload.value) {
    fd.append('metadata_ocr_suggestions', JSON.stringify(metadataOcrPayload.value))
  }

  if (ocrText.value) {
    fd.append('ocr_text', ocrText.value)
  }

  if (props.workflowTaskId) {
    fd.append('workflow_task_id', String(props.workflowTaskId))
  }

  uploading.value = true
  try {
    const res = await archivalApi.uploadDocument(props.file.id, fd)
    toast.success(res.message ?? 'Documento adjuntado.')
    resetForm()
    emit('uploaded')
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo adjuntar el documento.')
  }
  finally {
    uploading.value = false
  }
}

watch(
  () => docDocumentTypeId.value,
  () => loadMetadataSuggestions(),
)

watch(
  () => props.required?.missing,
  () => preselectMissingDocType(),
)

onMounted(() => {
  if (props.presetNodeId) {
    archivalFileNodeId.value = props.presetNodeId
  }

  if (props.presetDocTypeId) {
    docDocumentTypeId.value = props.presetDocTypeId
  }

  loadCatalog()
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-2">
      <Label for="archival_upload_doc_type">Tipo documental</Label>
      <Select
        :model-value="docDocumentTypeId != null ? String(docDocumentTypeId) : undefined"
        :disabled="uploading || loadingCatalog"
        @update:model-value="docDocumentTypeId = $event ? Number($event) : null"
      >
        <SelectTrigger id="archival_upload_doc_type">
          <SelectValue :placeholder="loadingCatalog ? 'Cargando catálogo…' : 'Seleccione tipo documental'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in docTypeOptions"
            :key="opt.id"
            :value="String(opt.id)"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="selectedDocTypeLabel" class="text-xs text-muted-foreground">
        {{ selectedDocTypeLabel }}
      </p>
    </div>

    <div v-if="folderOptions.length" class="space-y-2">
      <Label for="archival_upload_folder">Carpeta (opcional)</Label>
      <Select
        :model-value="archivalFileNodeId != null ? String(archivalFileNodeId) : undefined"
        :disabled="uploading || lockFolder"
        @update:model-value="archivalFileNodeId = $event ? Number($event) : null"
      >
        <SelectTrigger id="archival_upload_folder">
          <SelectValue placeholder="Raíz del expediente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="folder in folderOptions"
            :key="folder.id"
            :value="String(folder.id)"
          >
            {{ folder.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="archival_upload_file">Archivo</Label>
      <Input
        id="archival_upload_file"
        type="file"
        :disabled="uploading"
        @change="onFileChange"
      />
      <p v-if="selectedFile" class="text-xs text-muted-foreground">
        {{ selectedFile.name }} ({{ Math.round(selectedFile.size / 1024) }} KB)
      </p>
    </div>

    <div class="space-y-2">
      <Label for="archival_upload_title">Título</Label>
      <Input
        id="archival_upload_title"
        v-model="title"
        :disabled="uploading"
        placeholder="Nombre descriptivo del documento"
      />
    </div>

    <div v-if="allowsMasterDocuments" class="flex items-center gap-2">
      <Checkbox
        id="archival_upload_master"
        v-model="isMasterDocument"
        :disabled="uploading"
      />
      <Label for="archival_upload_master" class="text-sm font-normal">
        Documento maestro del expediente
      </Label>
    </div>

    <div v-if="loadingSuggestions || loadingOcr" class="text-sm text-muted-foreground">
      {{ loadingOcr ? 'Extrayendo metadatos por OCR…' : 'Cargando metadatos sugeridos…' }}
    </div>

    <p
      v-else-if="ocrEngine && ocrEngine !== 'disabled' && ocrEngine !== 'unsupported'"
      class="text-xs text-muted-foreground"
    >
      Motor OCR: {{ ocrEngine }}.
      <span v-if="metadataOcrPayload?.processed">Revise los campos marcados como «Sugerido OCR».</span>
      <span v-else>Sin coincidencias automáticas; complete los metadatos manualmente.</span>
    </p>

    <ArchivalFileDocumentMetadataFields
      v-if="metadataFields.length && !loadingSuggestions && !loadingOcr"
      v-model="metadataValues"
      v-model:field-sources="metadataFieldSources"
      :field-confidence="metadataConfidence"
      :fields="metadataFields"
      :disabled="uploading"
    />

    <Button type="submit" class="w-full" :disabled="uploading || loadingCatalog">
      {{ uploading ? 'Adjuntando…' : 'Adjuntar documento' }}
    </Button>
  </form>
</template>
