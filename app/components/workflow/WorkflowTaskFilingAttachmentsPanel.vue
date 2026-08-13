<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  appendDocumentFoliosToFormData,
  createDocumentAttachmentRow,
  type DocumentAttachmentRow,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'
import { VENTANILLA_FILING_UPLOAD_CONSTRAINTS } from '~/utils/document-upload-constraints'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

const props = defineProps<{
  filingId: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  attached: []
}>()

const ventanillaApi = useVentanillaApi()

const fileRows = ref<DocumentAttachmentRow[]>([createDocumentAttachmentRow()])
const submitAttempted = ref(false)
const uploading = ref(false)

function addFileRow() {
  fileRows.value.push(createDocumentAttachmentRow())
}

function removeFileRow(index: number) {
  if (fileRows.value.length <= 1) {
    return
  }

  fileRows.value.splice(index, 1)
}

function resetRows() {
  fileRows.value = [createDocumentAttachmentRow()]
  submitAttempted.value = false
}

function validatePendingRows(): string | null {
  const rowsWithFiles = fileRows.value.filter(row => row.file)

  for (const [index, row] of rowsWithFiles.entries()) {
    if (!row.title.trim()) {
      return `Indique el título del documento ${index + 1}.`
    }

    const folioError = validateDocumentAttachmentFolios(row.folioStart, row.folioEnd)

    if (folioError) {
      return `${folioError} (documento ${index + 1})`
    }
  }

  return null
}

function buildFormData(): FormData | null {
  const rowsWithFiles = fileRows.value.filter(row => row.file)

  if (rowsWithFiles.length === 0) {
    return null
  }

  const fd = new FormData()

  rowsWithFiles.forEach((row, index) => {
    if (!row.file) {
      return
    }

    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
    appendDocumentFoliosToFormData(fd, index, row.folioStart, row.folioEnd)
  })

  return fd
}

/**
 * Adjunta los documentos pendientes. Retorna true si no hay nada que subir o si la subida fue exitosa.
 */
async function attachPendingFiles(): Promise<boolean> {
  submitAttempted.value = true

  const validationError = validatePendingRows()

  if (validationError) {
    toast.error(validationError)

    return false
  }

  const fd = buildFormData()

  if (!fd) {
    return true
  }

  uploading.value = true

  try {
    await ventanillaApi.attachFilingFiles(props.filingId, fd)
    resetRows()
    emit('attached')

    return true
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))

    return false
  }
  finally {
    uploading.value = false
  }
}

defineExpose({
  attachPendingFiles,
  hasPendingFilesToAttach: () => fileRows.value.some(row => row.file),
})

watch(() => props.filingId, () => {
  resetRows()
})
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-muted/20 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium">
          Documentos del radicado (opcional)
        </p>
        <p class="text-muted-foreground text-xs">
          Agregue uno o varios archivos; se adjuntarán al radicado al avanzar la etapa.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="disabled || uploading"
        @click="addFileRow"
      >
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Agregar documento
      </Button>
    </div>

    <div class="space-y-4">
      <DocumentsDocumentAttachmentUploadCard
        v-for="(row, index) in fileRows"
        :key="index"
        :label="fileRows.length === 1 ? 'Documento' : `Documento ${index + 1}`"
        :removable="fileRows.length > 1"
        :submit-attempted="submitAttempted"
        :disabled="disabled || uploading"
        :upload-constraints="VENTANILLA_FILING_UPLOAD_CONSTRAINTS"
        :title="row.title"
        :folio-start="row.folioStart"
        :folio-end="row.folioEnd"
        :file="row.file"
        @update:title="row.title = $event"
        @update:folio-start="row.folioStart = $event"
        @update:folio-end="row.folioEnd = $event"
        @update:file="row.file = $event"
        @remove="removeFileRow(index)"
      />
    </div>
  </div>
</template>
