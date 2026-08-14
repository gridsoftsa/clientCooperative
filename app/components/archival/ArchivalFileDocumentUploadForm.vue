<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type {
  ArchivalFile,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
} from '~/types/archival-file'
import type { CatalogTreeSeries } from '~/types/archival-trd'
import {
  flattenCatalogDocumentTypes,
  flattenFileFolderNodes,
  hasPendingOcrValidation,
  isOcrSupportedUploadFile,
  ocrEngineDisplayLabel,
  ocrEngineIsUnavailable,
  pendingOcrValidationCount,
  stripOcrSuggestions,
  type ArchivalFileDocTypeOption,
} from '~/utils/archival-file-upload'
import {
  ARCHIVAL_MANUAL_UPLOAD_SOURCES,
  type ArchivalManualUploadSource,
} from '~/constants/archival-document-sources'
import {
  appendSingleDocumentFoliosToFormData,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'
import { ARCHIVAL_DOCUMENT_UPLOAD_CONSTRAINTS } from '~/utils/document-upload-constraints'
import {
  archivalMetadataFieldDomId,
  archivalMultiselectWarningClass,
  findFirstMissingRequiredMetadataField,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'

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
const submitAttempted = ref(false)
const highlightedMetadataFieldCode = ref<string | null>(null)

const selectedFile = ref<File | null>(null)
const title = ref('')
const folioStart = ref('')
const folioEnd = ref('')
const docDocumentTypeId = ref<number | null>(null)
const archivalFileNodeId = ref<number | null>(null)
const isMasterDocument = ref(false)
const uploadSource = ref<ArchivalManualUploadSource>('manual')

const metadataValues = ref<Record<string, unknown>>({})
const metadataFieldSources = ref<Record<string, string>>({})
const metadataConfidence = ref<Record<string, number>>({})
const metadataFields = ref<ArchivalMetadataFieldRow[]>([])
const metadataOcrPayload = ref<Record<string, unknown> | null>(null)
const metadataAutocompleteSnapshot = ref<Record<string, unknown>>({})
const metadataFieldSourcesSnapshot = ref<Record<string, string>>({})
const ocrText = ref<string | null>(null)
const ocrEngine = ref<string | null>(null)
const ocrNeedsReprocess = ref(false)

const docTypeOptions = ref<ArchivalFileDocTypeOption[]>([])
const catalogTree = ref<CatalogTreeSeries[]>([])
const folderOptions = computed(() => flattenFileFolderNodes(props.tree))

const lockedDocSeriesId = computed(() => {
  if (props.file.org_unit_id !== props.file.file_type?.org_unit_id) {
    return null
  }

  return props.file.file_type?.doc_series_id ?? null
})
const lockedDocSubseriesId = computed(() => {
  if (props.file.org_unit_id !== props.file.file_type?.org_unit_id) {
    return null
  }

  return props.file.file_type?.doc_subseries_id ?? null
})
const hasLockedTrdBranch = computed(() =>
  lockedDocSeriesId.value != null && lockedDocSubseriesId.value != null,
)

const attachNonRequired = ref(false)

type MissingRequiredUploadChoice = {
  docDocumentTypeId: number
  requiredLabel: string
  catalogLabel: string
  workflowStageKey?: string | null
}

function catalogLabelForDocType(
  docTypeId: number,
  code?: string | null,
  name?: string | null,
): string {
  const fromCatalog = docTypeOptions.value.find(option => option.id === docTypeId)
  if (fromCatalog) {
    return fromCatalog.label
  }

  if (code && name) {
    return `${code} — ${name}`
  }

  if (name) {
    return name
  }

  return 'Tipo documental del catálogo'
}

const missingRequiredChoices = computed((): MissingRequiredUploadChoice[] => {
  const missing = props.required?.missing ?? []
  if (missing.length === 0) {
    return []
  }

  const grouped = new Map<number, { labels: string[], code?: string | null, name?: string | null, stage?: string | null }>()

  for (const item of missing) {
    const entry = grouped.get(item.doc_document_type_id) ?? {
      labels: [],
      code: item.document_type_code,
      name: item.document_type_name,
      stage: item.workflow_stage_key,
    }
    entry.labels.push(item.label)
    grouped.set(item.doc_document_type_id, entry)
  }

  return Array.from(grouped.entries()).map(([docDocumentTypeId, entry]) => ({
    docDocumentTypeId,
    requiredLabel: entry.labels.join(' · '),
    catalogLabel: catalogLabelForDocType(docDocumentTypeId, entry.code, entry.name),
    workflowStageKey: entry.stage,
  }))
})

const showRequiredDocumentPicker = computed(() => missingRequiredChoices.value.length > 0 && !attachNonRequired.value)

const selectedRequiredChoice = computed(() =>
  missingRequiredChoices.value.find(choice => choice.docDocumentTypeId === docDocumentTypeId.value) ?? null,
)

const allowsMasterDocuments = computed(() => props.file.file_type?.allows_master_documents ?? false)

const canRunOcr = computed(() =>
  Boolean(selectedFile.value && docDocumentTypeId.value && isOcrSupportedUploadFile(selectedFile.value)),
)

const pendingOcrCount = computed(() => pendingOcrValidationCount(metadataFieldSources.value))

const ocrEngineLabel = computed(() => ocrEngineDisplayLabel(ocrEngine.value))

const selectedDocTypeLabel = computed(() =>
  docTypeOptions.value.find((o: ArchivalFileDocTypeOption) => o.id === docDocumentTypeId.value)?.label ?? '',
)

const docTypeMultiselectOptions = computed(() =>
  docTypeOptions.value.map(option => ({
    value: option.id,
    label: option.label,
  })),
)

const requiredDocMultiselectOptions = computed(() =>
  missingRequiredChoices.value.map(choice => ({
    value: choice.docDocumentTypeId,
    label: choice.requiredLabel,
  })),
)

function setUploadSource(value: unknown) {
  const next = String(value ?? 'manual')
  uploadSource.value = ARCHIVAL_MANUAL_UPLOAD_SOURCES.some(option => option.value === next)
    ? next as ArchivalManualUploadSource
    : 'manual'
}

function clearOcrSuggestions() {
  const stripped = stripOcrSuggestions(
    metadataValues.value,
    metadataFieldSources.value,
    metadataConfidence.value,
  )

  metadataValues.value = stripped.values
  metadataFieldSources.value = stripped.fieldSources
  metadataConfidence.value = stripped.fieldConfidence
  metadataOcrPayload.value = null
  ocrText.value = null
  ocrEngine.value = null
}

function markOcrReprocessNeeded() {
  ocrNeedsReprocess.value = canRunOcr.value
}

function captureAutocompleteSnapshot() {
  metadataAutocompleteSnapshot.value = { ...metadataValues.value }
  metadataFieldSourcesSnapshot.value = { ...metadataFieldSources.value }
}

function metadataSuggestionQuery(): Record<string, string | number> {
  const query: Record<string, string | number> = {}

  if (props.file.entity_key) {
    query.entity_key = props.file.entity_key
  }

  const nit = props.file.metadata_values?.nit
    ?? props.file.metadata_values?.third_party_nit
    ?? props.file.metadata_values?.document_number

  if (nit != null && nit !== '') {
    query.nit = String(nit)
  }

  return query
}

function appendMetadataSuggestionContext(fd: FormData) {
  const context = metadataSuggestionQuery()
  for (const [key, value] of Object.entries(context)) {
    fd.append(key, String(value))
  }
}

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
    catalogTree.value = tree
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
  if (attachNonRequired.value) {
    return
  }

  const first = missingRequiredChoices.value[0]
  if (first && !docDocumentTypeId.value) {
    docDocumentTypeId.value = first.docDocumentTypeId
  }
}

async function loadMetadataSuggestions() {
  metadataValues.value = {}
  metadataFieldSources.value = {}
  metadataConfidence.value = {}
  metadataOcrPayload.value = null
  metadataAutocompleteSnapshot.value = {}
  metadataFieldSourcesSnapshot.value = {}
  ocrText.value = null
  ocrEngine.value = null
  ocrNeedsReprocess.value = false
  metadataFields.value = []

  if (!docDocumentTypeId.value) {
    return
  }

  loadingSuggestions.value = true
  try {
    const query: Record<string, string | number> = {
      doc_document_type_id: docDocumentTypeId.value,
      ...metadataSuggestionQuery(),
    }

    const suggestion = await archivalApi.suggestMetadata(query)
    metadataFields.value = parseSchemaFields(suggestion.schema)
    metadataValues.value = { ...(suggestion.suggestions ?? {}) }
    metadataFieldSources.value = { ...(suggestion.field_sources ?? {}) }

    captureAutocompleteSnapshot()
    markOcrReprocessNeeded()
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
    clearOcrSuggestions()

    const fd = new FormData()
    fd.append('file', selectedFile.value)
    fd.append('doc_document_type_id', String(docDocumentTypeId.value))
    appendMetadataSuggestionContext(fd)

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
    else if (ocrEngineIsUnavailable(ocr.engine)) {
      toast.message(ocrEngineDisplayLabel(ocr.engine) ?? 'OCR no disponible.')
    }

    ocrNeedsReprocess.value = false
    captureAutocompleteSnapshot()
  }
  catch {
    toast.error('No se pudo procesar OCR del documento.')
  }
  finally {
    loadingOcr.value = false
  }
}

function onFileChange(file: File | null) {
  selectedFile.value = file

  if (file && !title.value.trim()) {
    title.value = file.name.replace(/\.[^.]+$/, '')
  }

  clearOcrSuggestions()
  markOcrReprocessNeeded()
}

function resetForm() {
  selectedFile.value = null
  title.value = ''
  folioStart.value = ''
  folioEnd.value = ''
  archivalFileNodeId.value = null
  isMasterDocument.value = false
  metadataValues.value = {}
  metadataFieldSources.value = {}
  metadataConfidence.value = {}
  metadataOcrPayload.value = null
  metadataAutocompleteSnapshot.value = {}
  metadataFieldSourcesSnapshot.value = {}
  ocrText.value = null
  ocrEngine.value = null
  ocrNeedsReprocess.value = false
  metadataFields.value = []
  docDocumentTypeId.value = null
  uploadSource.value = 'manual'
  attachNonRequired.value = false
  preselectMissingDocType()
}

async function handleSubmit() {
  submitAttempted.value = true
  highlightedMetadataFieldCode.value = null

  if (!selectedFile.value) {
    toast.error('Seleccione un archivo.')
    await nextTick()
    focusArchivalFieldById('archival_upload_file')
    return
  }

  if (!docDocumentTypeId.value) {
    toast.error('Seleccione el tipo documental.')
    await nextTick()
    focusArchivalFieldById(
      showRequiredDocumentPicker.value ? 'archival_upload_required_doc' : 'archival_upload_doc_type',
    )
    return
  }

  const folioError = validateDocumentAttachmentFolios(folioStart.value, folioEnd.value)
  if (folioError) {
    toast.error(folioError)
    return
  }

  const missingMetadata = findFirstMissingRequiredMetadataField(metadataFields.value, metadataValues.value)
  if (missingMetadata) {
    highlightedMetadataFieldCode.value = missingMetadata.code
    toast.error(`Complete el metadato obligatorio: ${missingMetadata.name}`)
    await nextTick()
    const idx = metadataFields.value.findIndex(f => f.code === missingMetadata.code)
    focusArchivalFieldById(archivalMetadataFieldDomId(missingMetadata, idx >= 0 ? idx : 0))
    return
  }

  if (hasPendingOcrValidation(metadataFieldSources.value)) {
    toast.error('Valide o rechace las sugerencias OCR antes de adjuntar el documento.')
    return
  }

  const fd = new FormData()
  fd.append('file', selectedFile.value)
  fd.append('doc_document_type_id', String(docDocumentTypeId.value))
  fd.append('source', uploadSource.value)

  if (title.value.trim()) {
    fd.append('title', title.value.trim())
  }

  appendSingleDocumentFoliosToFormData(fd, folioStart.value, folioEnd.value)

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

  if (Object.keys(metadataAutocompleteSnapshot.value).length > 0) {
    fd.append('metadata_autocomplete_snapshot', JSON.stringify(metadataAutocompleteSnapshot.value))
  }

  if (Object.keys(metadataFieldSourcesSnapshot.value).length > 0) {
    fd.append('metadata_field_sources_snapshot', JSON.stringify(metadataFieldSourcesSnapshot.value))
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

watch(attachNonRequired, (isOther) => {
  if (isOther) {
    docDocumentTypeId.value = null
  }
  else {
    preselectMissingDocType()
  }
})

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
      <Label for="archival_upload_source">Origen del documento</Label>
      <Select
        :model-value="uploadSource"
        :disabled="uploading || !!workflowTaskId"
        @update:model-value="setUploadSource"
      >
        <SelectTrigger id="archival_upload_source">
          <SelectValue placeholder="Seleccione origen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in ARCHIVAL_MANUAL_UPLOAD_SOURCES"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p class="text-xs text-muted-foreground">
        {{
          ARCHIVAL_MANUAL_UPLOAD_SOURCES.find(option => option.value === uploadSource)?.description
        }}
      </p>
    </div>

    <div
      v-if="missingRequiredChoices.length"
      class="space-y-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3"
    >
      <p class="text-sm font-medium text-amber-950 dark:text-amber-50">
        Documentos obligatorios pendientes
      </p>
      <ul class="space-y-1.5 text-sm">
        <li
          v-for="choice in missingRequiredChoices"
          :key="`pending-${choice.docDocumentTypeId}`"
          class="text-amber-950/90 dark:text-amber-50/90"
        >
          <span class="font-medium">{{ choice.requiredLabel }}</span>
          <span class="text-xs text-muted-foreground"> — {{ choice.catalogLabel }}</span>
        </li>
      </ul>
    </div>

    <div v-if="showRequiredDocumentPicker" class="space-y-2">
      <Label for="archival_upload_required_doc">Documento obligatorio a adjuntar</Label>
      <ArchivalSingleMultiselect
        id="archival_upload_required_doc"
        v-model="docDocumentTypeId"
        :options="requiredDocMultiselectOptions"
        :disabled="uploading || loadingCatalog"
        :placeholder="loadingCatalog ? 'Cargando…' : 'Busque o seleccione el documento pendiente'"
        no-options-text="Sin documentos obligatorios pendientes"
        no-results-text="Sin coincidencias"
        coerce-number
        :class="archivalMultiselectWarningClass(submitAttempted && !docDocumentTypeId)"
      />
      <p v-if="selectedRequiredChoice" class="text-xs text-muted-foreground">
        Tipo documental en catálogo (TRD):
        <span class="text-foreground">{{ selectedRequiredChoice.catalogLabel }}</span>
      </p>
      <p
        v-if="selectedRequiredChoice?.workflowStageKey"
        class="text-xs text-muted-foreground"
      >
        Etapa de workflow asociada:
        <span class="font-mono text-foreground">{{ selectedRequiredChoice.workflowStageKey }}</span>
      </p>
      <Button
        type="button"
        variant="link"
        class="h-auto px-0 text-xs"
        :disabled="uploading"
        @click="attachNonRequired = true"
      >
        Adjuntar otro documento (no obligatorio pendiente)
      </Button>
    </div>

    <div v-else class="space-y-2">
      <div v-if="missingRequiredChoices.length" class="flex flex-wrap items-center justify-between gap-2">
        <Label for="archival_upload_doc_type">Tipo documental</Label>
        <Button
          type="button"
          variant="link"
          class="h-auto px-0 text-xs"
          :disabled="uploading"
          @click="attachNonRequired = false"
        >
          Volver a obligatorios pendientes
        </Button>
      </div>
      <Label v-else for="archival_upload_doc_type">Tipo documental</Label>
      <div
        id="archival_upload_doc_type"
        class="space-y-2"
        :class="archivalMultiselectWarningClass(submitAttempted && !docDocumentTypeId, 'rounded-md')"
      >
        <ArchivalTrdCascadePicker
          v-if="catalogTree.length > 0"
          v-model="docDocumentTypeId"
          :catalog-tree="catalogTree"
          :disabled="uploading || loadingCatalog"
          :locked-series-id="lockedDocSeriesId"
          :locked-subseries-id="lockedDocSubseriesId"
        />
        <ArchivalSingleMultiselect
          v-else
          v-model="docDocumentTypeId"
          :options="docTypeMultiselectOptions"
          :disabled="uploading || loadingCatalog"
          :placeholder="loadingCatalog ? 'Cargando catálogo…' : 'Busque o seleccione tipo documental'"
          no-options-text="Sin tipos documentales en el catálogo"
          no-results-text="Sin coincidencias"
          coerce-number
        />
        <p v-if="hasLockedTrdBranch" class="text-xs text-muted-foreground">
          Serie y subserie del tipo de expediente para
          <span class="font-medium text-foreground">{{ props.file.org_unit?.name ?? 'esta área' }}</span>
          ({{ props.file.file_type?.doc_series?.code }} / {{ props.file.file_type?.doc_subseries?.code }}).
          Solo elija el tipo documental (políticas, formatos, procedimientos, etc.).
        </p>
        <p
          v-else-if="props.file.file_type?.org_unit_id && props.file.org_unit_id !== props.file.file_type.org_unit_id"
          class="text-xs text-muted-foreground"
        >
          Este expediente es de
          <span class="font-medium text-foreground">{{ props.file.org_unit?.name }}</span>,
          distinta al área configurada en el tipo ({{ props.file.file_type.org_unit?.name }}).
          Use serie, subserie y tipo de la TRD de esta área.
        </p>
        <p v-else-if="selectedDocTypeLabel" class="text-xs text-muted-foreground">
          {{ selectedDocTypeLabel }}
        </p>
      </div>
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

    <DocumentsDocumentAttachmentUploadCard
      label="Documento a adjuntar"
      :title="title"
      :folio-start="folioStart"
      :folio-end="folioEnd"
      :file="selectedFile"
      :submit-attempted="submitAttempted"
      :disabled="uploading"
      :upload-constraints="ARCHIVAL_DOCUMENT_UPLOAD_CONSTRAINTS"
      file-input-id="archival_upload_file"
      @update:title="title = $event"
      @update:folio-start="folioStart = $event"
      @update:folio-end="folioEnd = $event"
      @update:file="onFileChange"
    />

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

    <div
      v-else-if="canRunOcr"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-muted/15 p-3"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="uploading || loadingOcr"
        @click="runOcrExtraction"
      >
        {{ ocrNeedsReprocess || !ocrEngine ? 'Ejecutar OCR' : 'Reprocesar OCR' }}
      </Button>
      <p class="text-xs text-muted-foreground">
        <template v-if="ocrNeedsReprocess">
          {{
            selectedFile
              ? 'Cambió el archivo o el tipo documental. Ejecute OCR para sugerir metadatos.'
              : 'Seleccione un archivo compatible (PDF o imagen) y ejecute OCR.'
          }}
        </template>
        <template v-else-if="ocrEngineLabel">
          Motor OCR: {{ ocrEngineLabel }}.
          <span v-if="metadataOcrPayload?.processed">Revise los campos marcados como «Sugerido OCR».</span>
          <span v-else-if="ocrEngineIsUnavailable(ocrEngine)">
            No se extrajo texto; complete los metadatos manualmente.
          </span>
          <span v-else>Sin coincidencias automáticas; complete los metadatos manualmente.</span>
        </template>
      </p>
    </div>

    <p
      v-else-if="selectedFile && !isOcrSupportedUploadFile(selectedFile)"
      class="text-xs text-muted-foreground"
    >
      El formato del archivo no admite OCR. Complete los metadatos manualmente.
    </p>

    <div
      v-if="pendingOcrCount > 0 && !loadingSuggestions && !loadingOcr"
      class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
    >
      {{ pendingOcrCount }} campo(s) con sugerencia OCR pendiente de validación.
      Acepte, edite o rechace cada sugerencia antes de adjuntar.
    </div>

    <ArchivalFileDocumentMetadataFields
      v-if="metadataFields.length && !loadingSuggestions && !loadingOcr"
      v-model="metadataValues"
      v-model:field-sources="metadataFieldSources"
      :field-confidence="metadataConfidence"
      :fields="metadataFields"
      :disabled="uploading"
      :highlighted-field-code="highlightedMetadataFieldCode"
    />

    <Button type="submit" class="w-full" :disabled="uploading || loadingCatalog || loadingOcr || pendingOcrCount > 0">
      {{ uploading ? 'Adjuntando…' : 'Adjuntar documento' }}
    </Button>
  </form>
</template>
