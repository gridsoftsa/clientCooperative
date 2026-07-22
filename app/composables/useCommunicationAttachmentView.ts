/**
 * Vista previa de adjuntos de comunicados con credenciales Sanctum.
 * Evita <a href> directo a la API (sin cookies / redirect a login).
 */
export function useCommunicationAttachmentView() {
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

  async function viewAttachmentInNewTab(attachmentId: number): Promise<void> {
    await ensureCsrfCookie()
    const xsrf = readXsrfCookie()
    const url = `${apiBase}/api/communications/attachments/${attachmentId}/view`

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      },
    })

    if (!response.ok) {
      let message = 'No se pudo abrir el adjunto.'
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
        // keep default
      }
      throw new Error(message)
    }

    const blob = await response.blob()
    openBlobInNewTab(blob)
  }

  return {
    viewAttachmentInNewTab,
    openBlobInNewTab,
  }
}
