import { messageFromFetchError } from '~/utils/http-error-message'

export function formatUploadFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function describeUploadFile(file: File): string {
  const type = file.type?.trim() ? `, ${file.type}` : ''
  return `${file.name} (${formatUploadFileSize(file.size)}${type})`
}

export function messageFromDocumentUploadError(
  context: string,
  file: File | null,
  error: unknown,
): string {
  const filePart = file ? describeUploadFile(file) : 'archivo no identificado'
  return `«${context}» — ${filePart}. ${messageFromFetchError(error, 'Error al subir el archivo')}`
}

/** Ejecuta una subida y registra en consola cuál archivo falló. */
export async function runDocumentUpload<T>(
  context: string,
  file: File | null,
  action: () => Promise<T>,
): Promise<T> {
  console.info('[radicacion-upload] Iniciando:', context, file ? describeUploadFile(file) : '')
  try {
    const result = await action()
    console.info('[radicacion-upload] OK:', context)
    return result
  } catch (error) {
    console.error('[radicacion-upload] Falló:', context, file ? describeUploadFile(file) : '', error)
    throw new Error(messageFromDocumentUploadError(context, file, error))
  }
}
