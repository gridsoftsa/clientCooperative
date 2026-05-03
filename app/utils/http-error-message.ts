/**
 * Mensaje legible desde errores de `$fetch` / Laravel (419 CSRF, 401, cuerpo JSON con `message`).
 */
export function messageFromFetchError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const data = e.data as Record<string, unknown> | undefined
    const nestedMessage = data?.message
    if (typeof nestedMessage === 'string' && nestedMessage.trim() !== '') {
      return nestedMessage
    }
    const msg = e.message
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
    if (statusCode != null && statusCode >= 400) {
      return `${fallback} (HTTP ${statusCode})`
    }
  }
  return fallback
}
