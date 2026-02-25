/**
 * Descarga documentos desde la API con credenciales (Sanctum).
 * Evita el redirect a login que ocurre al usar <a href> directo.
 */
export function useDocumentDownload() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000'

  function readXsrfCookie(): string | null {
    if (import.meta.server) return null
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  async function ensureCsrfCookie(): Promise<string | null> {
    if (import.meta.server) return null
    if (readXsrfCookie()) return readXsrfCookie()
    try {
      await $fetch('/sanctum/csrf-cookie', {
        baseURL: apiBase,
        credentials: 'include',
      })
    } catch {
      // ignore
    }
    return readXsrfCookie()
  }

  async function downloadDocument(
    applicationId: string | number,
    documentId: number,
    filename?: string,
  ): Promise<void> {
    const xsrf = await ensureCsrfCookie()
    const url = `${apiBase}/api/credit-applications/${applicationId}/documents/${documentId}/download`

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      },
    })

    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo descargar`)
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition')
    let finalFilename = filename
    if (!finalFilename && disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match) {
        finalFilename = match[1].replace(/['"]/g, '').trim()
      }
    }
    finalFilename = finalFilename || 'documento'

    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }

  return { downloadDocument }
}
