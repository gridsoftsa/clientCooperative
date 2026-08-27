/**
 * Mensaje legible desde errores de `$fetch` / Laravel (419 CSRF, 401, cuerpo JSON con `message`).
 */
export function messageFromFetchError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const data = e.data as Record<string, unknown> | undefined
    const errors = data?.errors
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, string[]>)[0]?.[0]
      if (typeof first === 'string' && first.trim() !== '') {
        return first
      }
    }
    const nestedMessage = data?.message
    if (typeof nestedMessage === 'string' && nestedMessage.trim() !== '') {
      return nestedMessage
    }
    if (data?.errors && typeof data.errors === 'object') {
      const flat = Object.values(data.errors as Record<string, string[]>).flat().filter(Boolean)
      if (flat.length) {
        return flat.join(', ')
      }
    }
    const msg = e.message
    if (typeof msg === 'string' && /failed to fetch|networkerror|load failed/i.test(msg)) {
      return 'No hubo respuesta del servidor al subir el archivo. Suele deberse al límite de tamaño en Nginx del VPS (client_max_body_size 12M), archivos mayores a 10 MB, o MinIO/S3 no disponible. Revise con el administrador del servidor.'
    }
    if (typeof msg === 'string' && msg.trim() !== '') {
      return msg
    }
    const statusMessage = e.statusMessage
    if (typeof statusMessage === 'string' && statusMessage.trim() !== '') {
      return statusMessage
    }
    const statusCode = typeof e.statusCode === 'number' ? e.statusCode : typeof e.status === 'number' ? e.status : null
    if (statusCode === 401) {
      return 'Sesión no válida o expirada. Inicie sesión de nuevo.'
    }
    if (statusCode === 403) {
      return 'No tiene permiso para cargar este recurso.'
    }
    if (statusCode === 419) {
      return 'Sesión expirada (CSRF). Actualice la página e intente de nuevo.'
    }
    if (statusCode === 413) {
      return 'El archivo supera el límite permitido en el servidor (máx. 10 MB por adjunto).'
    }
    if (statusCode != null && statusCode >= 400) {
      return `${fallback} (HTTP ${statusCode})`
    }
  }
  return fallback
}
