export interface DocumentUploadConstraints {
  accept: string
  extensions: string[]
  maxSizeBytes: number
  typesLabel: string
  maxSizeLabel: string
  pickerHint: string
}

/** Radicación interna (ventanilla/nueva, gestión). */
export const VENTANILLA_FILING_UPLOAD_CONSTRAINTS: DocumentUploadConstraints = {
  accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
  maxSizeBytes: 10 * 1024 * 1024,
  typesLabel: 'PDF, JPG, JPEG, PNG, Word (DOC o DOCX)',
  maxSizeLabel: '10 MB',
  pickerHint: 'Formatos permitidos: PDF, JPG, JPEG, PNG, Word (DOC/DOCX). Máximo 10 MB por archivo.',
}

/** Formulario público de radicación (admite TXT adicional). */
export const VENTANILLA_PUBLIC_INTAKE_UPLOAD_CONSTRAINTS: DocumentUploadConstraints = {
  accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.txt',
  extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'],
  maxSizeBytes: 10 * 1024 * 1024,
  typesLabel: 'PDF, JPG, JPEG, PNG, Word (DOC/DOCX) o TXT',
  maxSizeLabel: '10 MB',
  pickerHint: 'Formatos permitidos: PDF, JPG, JPEG, PNG, Word (DOC/DOCX) o TXT. Máximo 10 MB por archivo.',
}

/** Expedientes / workflow (sin restricción de extensión en API). */
export const ARCHIVAL_DOCUMENT_UPLOAD_CONSTRAINTS: DocumentUploadConstraints = {
  accept: '',
  extensions: [],
  maxSizeBytes: 20 * 1024 * 1024,
  typesLabel: 'Cualquier formato',
  maxSizeLabel: '20 MB',
  pickerHint: 'Cualquier tipo de archivo. Máximo 20 MB por archivo.',
}

export function fileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex < 0) {
    return ''
  }

  return filename.slice(dotIndex + 1).toLowerCase()
}

export function validateDocumentUploadFile(
  file: File,
  constraints: DocumentUploadConstraints,
): string | null {
  if (file.size > constraints.maxSizeBytes) {
    return `El archivo supera el tamaño máximo permitido (${constraints.maxSizeLabel}).`
  }

  if (constraints.extensions.length === 0) {
    return null
  }

  const extension = fileExtension(file.name)
  if (!extension || !constraints.extensions.includes(extension)) {
    return `Formato no permitido. Use: ${constraints.typesLabel}.`
  }

  return null
}
