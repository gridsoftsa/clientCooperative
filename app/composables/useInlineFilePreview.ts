import { resolveDocumentPreviewKind, type DocumentPreviewKind } from '~/utils/document-preview'

function extensionOf(fileName: string): string {
  return fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
    : ''
}

function mimeForInlinePreview(fileName: string, kind: 'pdf' | 'image', mime: string, blobType: string): string {
  if (kind === 'pdf') {
    return 'application/pdf'
  }

  const normalized = (mime || blobType).toLowerCase()
  if (normalized.startsWith('image/')) {
    return normalized
  }

  const byExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }

  return byExtension[extensionOf(fileName)] ?? 'image/jpeg'
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (import.meta.server) {
    return
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename || 'documento'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}

/**
 * Muestra PDF e imágenes en un diálogo de la aplicación.
 * El resto de formatos se descarga en el equipo.
 */
export function useInlineFilePreview() {
  const open = ref(false)
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
    title.value = 'Vista previa'
    previewKind.value = null
  }

  function presentBlob(blob: Blob, fileName: string, mime?: string | null): 'preview' | 'download' {
    const safeName = fileName.trim() || 'documento'
    const kind = resolveDocumentPreviewKind(safeName, mime || blob.type || '')

    if (kind !== 'pdf' && kind !== 'image') {
      triggerBlobDownload(blob, safeName)

      return 'download'
    }

    revokePreviewUrl()
    const previewMime = mimeForInlinePreview(safeName, kind, mime ?? '', blob.type)
    const typedBlob = blob.type === previewMime ? blob : new Blob([blob], { type: previewMime })
    title.value = safeName
    previewKind.value = kind
    previewUrl.value = URL.createObjectURL(typedBlob)
    open.value = true

    return 'preview'
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
    title,
    previewUrl,
    previewKind,
    presentBlob,
  }
}
