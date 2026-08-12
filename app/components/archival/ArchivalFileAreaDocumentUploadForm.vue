<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  appendSingleDocumentFoliosToFormData,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'

const props = defineProps<{
  orgUnitId: number
  archivalFileId: number
  defaultDocTypeId?: number
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const uploading = ref(false)
const submitAttempted = ref(false)
const fileInput = ref<File | null>(null)
const docTypeId = ref('')
const title = ref('')
const folioStart = ref('')
const folioEnd = ref('')

watch(
  () => props.defaultDocTypeId,
  (value) => {
    if (value) {
      docTypeId.value = String(value)
    }
  },
  { immediate: true },
)

const canUpload = computed(() =>
  hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'),
)

async function handleUpload() {
  submitAttempted.value = true

  if (!fileInput.value || !docTypeId.value) {
    toast.error('Seleccione archivo y tipo documental.')
    return
  }

  const folioError = validateDocumentAttachmentFolios(folioStart.value, folioEnd.value)
  if (folioError) {
    toast.error(folioError)
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('archival_file_id', String(props.archivalFileId))
    formData.append('org_unit_id', String(props.orgUnitId))
    formData.append('doc_document_type_id', docTypeId.value)
    formData.append('file', fileInput.value)
    if (title.value.trim()) {
      formData.append('title', title.value.trim())
    }
    appendSingleDocumentFoliosToFormData(formData, folioStart.value, folioEnd.value)

    const res = await archivalApi.uploadAreaDocument(formData)
    toast.success(res.message)
    fileInput.value = null
    title.value = ''
    folioStart.value = ''
    folioEnd.value = ''
    submitAttempted.value = false
    emit('uploaded')
  }
  catch {
    toast.error('No se pudo cargar el documento en el área.')
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <div v-if="canUpload" class="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
    <div>
      <p class="text-sm font-medium">
        Cargar documento al expediente #{{ archivalFileId }}
      </p>
      <p class="text-xs text-muted-foreground">
        Repositorio por área productora.
      </p>
    </div>

    <div class="space-y-2">
      <Label for="area-doc-type">Tipo documental (ID) *</Label>
      <Input
        id="area-doc-type"
        v-model="docTypeId"
        type="number"
        min="1"
        placeholder="ID del tipo documental TRD"
      />
    </div>

    <DocumentsDocumentAttachmentUploadCard
      label="Documento del área"
      :title="title"
      :folio-start="folioStart"
      :folio-end="folioEnd"
      :file="fileInput"
      :submit-attempted="submitAttempted"
      :disabled="uploading"
      file-input-id="area-doc-file"
      @update:title="title = $event"
      @update:folio-start="folioStart = $event"
      @update:folio-end="folioEnd = $event"
      @update:file="fileInput = $event"
    />

    <Button :disabled="uploading" @click="handleUpload">
      {{ uploading ? 'Cargando…' : 'Cargar en área' }}
    </Button>
  </div>
</template>
