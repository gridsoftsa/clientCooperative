export interface DocumentAttachmentRow {
  file: File | null
  title: string
  folioStart: string
  folioEnd: string
}

export function createDocumentAttachmentRow(title = ''): DocumentAttachmentRow {
  return {
    file: null,
    title,
    folioStart: '',
    folioEnd: '',
  }
}

export function validateDocumentAttachmentFolios(
  folioStart: string,
  folioEnd: string,
): string | null {
  const startText = folioStart.trim()
  const endText = folioEnd.trim()

  if (!startText || !endText) {
    return 'Indique el folio inicial y el folio final del documento.'
  }

  const start = Number(startText)
  const end = Number(endText)

  if (!Number.isInteger(start) || start < 1) {
    return 'El folio inicial debe ser un número entero mayor o igual a 1.'
  }

  if (!Number.isInteger(end) || end < 1) {
    return 'El folio final debe ser un número entero mayor o igual a 1.'
  }

  if (end < start) {
    return 'El folio final debe ser mayor o igual al folio inicial.'
  }

  return null
}

export function appendDocumentFoliosToFormData(
  formData: FormData,
  index: number,
  folioStart: string,
  folioEnd: string,
): void {
  formData.append(`files[${index}][folio_start]`, folioStart.trim())
  formData.append(`files[${index}][folio_end]`, folioEnd.trim())
}

export function appendSingleDocumentFoliosToFormData(
  formData: FormData,
  folioStart: string,
  folioEnd: string,
): void {
  formData.append('folio_start', folioStart.trim())
  formData.append('folio_end', folioEnd.trim())
}

export function formatFileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
