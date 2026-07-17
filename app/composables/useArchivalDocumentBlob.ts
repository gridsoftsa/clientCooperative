/**
 * Vista previa y descarga de documentos de expediente con credenciales Sanctum.
 * Evita iframe directo a la API (X-Frame-Options / origen cruzado).
 */
export function useArchivalDocumentBlob() {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

  function readXsrfCookie(): string | null {
    if (import.meta.server) {
      return null
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)

    return match?.[1] != null ? decodeURIComponent(match[1]) : null
  }

  async function ensureCsrfCookie(): Promise<string | null> {
    if (import.meta.server) {
      return null
    }

    if (readXsrfCookie()) {
      return readXsrfCookie()
    }

    try {
      await $fetch('/sanctum/csrf-cookie', {
        baseURL: apiBase,
        credentials: 'include',
      })
    }
    catch {
      // ignore
    }

    return readXsrfCookie()
  }

  function buildAuthHeaders(): Record<string, string> {
    const xsrf = readXsrfCookie()

    return {
      Accept: '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
    }
  }

  async function fetchDocumentViewBlob(fileId: number, documentId: number): Promise<Blob> {
    await ensureCsrfCookie()

    const url = `${apiBase}/api/archival-files/${fileId}/documents/${documentId}/view`
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: buildAuthHeaders(),
    })

    if (!response.ok) {
      let message = 'No se pudo cargar el documento.'

      try {
        const contentType = response.headers.get('Content-Type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json() as { message?: string }
          if (body.message) {
            message = body.message
          }
        }
      }
      catch {
        // keep default message
      }

      throw new Error(message)
    }

    return await response.blob()
  }

  function openBlobInNewTab(blob: Blob): void {
    if (import.meta.server) {
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
  }

  async function viewDocumentInNewTab(fileId: number, documentId: number): Promise<void> {
    const blob = await fetchDocumentViewBlob(fileId, documentId)
    openBlobInNewTab(blob)
  }

  return {
    fetchDocumentViewBlob,
    openBlobInNewTab,
    viewDocumentInNewTab,
  }
}
