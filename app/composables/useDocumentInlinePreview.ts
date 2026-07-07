import { resolveDocumentPreviewKind, type DocumentPreviewKind } from '~/utils/document-preview'
import { messageFromFetchError } from '~/utils/http-error-message'

export function useDocumentInlinePreview() {
  const { fetchApplicationDocument } = useDocumentDownload()

  const open = ref(false)
  const loading = ref(false)
  const title = ref('Vista previa')
  const previewUrl = ref<string | null>(null)
  const previewKind = ref<DocumentPreviewKind | null>(null)

  function revokePreviewUrl(): void {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }

  function resetPreview(): void {
    revokePreviewUrl()
    loading.value = false
    title.value = 'Vista previa'
    previewKind.value = null
  }

  function closePreview(): void {
    open.value = false
    resetPreview()
  }

  function previewLocalFile(file: File): void {
    resetPreview()
    open.value = true
    title.value = file.name
    previewKind.value = resolveDocumentPreviewKind(file.name, file.type)
    if (previewKind.value === 'pdf' || previewKind.value === 'image') {
      previewUrl.value = URL.createObjectURL(file)
    }
  }

  async function previewApplicationDocument(
    applicationId: number | string,
    documentId: number,
    preferredName?: string | null,
  ): Promise<void> {
    resetPreview()
    open.value = true
    loading.value = true
    try {
      const { blob, dispositionFilename } = await fetchApplicationDocument(applicationId, documentId)
      const fileName = preferredName?.trim() || dispositionFilename || 'documento'
      title.value = fileName
      previewKind.value = resolveDocumentPreviewKind(fileName, blob.type)
      if (previewKind.value === 'pdf' || previewKind.value === 'image') {
        previewUrl.value = URL.createObjectURL(blob)
      }
    } catch (e: unknown) {
      closePreview()
      const { toast } = await import('vue-sonner')
      toast.error(messageFromFetchError(e, 'No se pudo cargar la vista previa.'))
    } finally {
      loading.value = false
    }
  }

  watch(open, (isOpen) => {
    if (!isOpen) {
      resetPreview()
    }
  })

  onUnmounted(() => {
    revokePreviewUrl()
  })

  return {
    open,
    loading,
    title,
    previewUrl,
    previewKind,
    previewLocalFile,
    previewApplicationDocument,
    closePreview,
  }
}
