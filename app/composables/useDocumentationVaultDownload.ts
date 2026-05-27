/**
 * Descargas desde rutas `/api/documentation/credit-applications/...` (centro de documentación).
 */
export function useDocumentationVaultDownload() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000'

  function readXsrfCookie(): string | null {
    if (import.meta.server) {
      return null
    }
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match && match[1] != null ? decodeURIComponent(match[1]) : null
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
    } catch {
      // ignore
    }
    return readXsrfCookie()
  }

  function openPdfBlobInNewTab(blob: Blob): void {
    if (import.meta.server) {
      return
    }
    const pdfBlob = blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
  }

  function openBlobInNewTab(blob: Blob): void {
    if (import.meta.server) {
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
  }

  async function fetchVaultDocument(
    applicationId: string | number,
    documentId: number,
  ): Promise<Blob> {
    const docId = Number(documentId)
    if (!Number.isFinite(docId) || docId < 1) {
      throw new Error('Identificador de documento no válido.')
    }
    const xsrf = await ensureCsrfCookie()
    const url = `${apiBase}/api/documentation/credit-applications/${applicationId}/documents/${docId}/download`
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
      let msg = `Error ${res.status}: No se pudo obtener el documento`
      try {
        const ct = res.headers.get('Content-Type') ?? ''
        if (ct.includes('application/json')) {
          const body = await res.json() as { message?: string }
          if (body?.message) {
            msg = body.message
          }
        }
      } catch {
        // default
      }
      throw new Error(msg)
    }
    return res.blob()
  }

  async function viewVaultDocument(applicationId: string | number, documentId: number): Promise<void> {
    const blob = await fetchVaultDocument(applicationId, documentId)
    openBlobInNewTab(blob)
  }

  async function downloadVaultPdf(
    applicationId: string | number,
    kind: 'application' | 'analisis_score',
  ): Promise<void> {
    const xsrf = await ensureCsrfCookie()
    const suffix = kind === 'analisis_score' ? '/analisis-score/pdf' : '/pdf'
    let url = `${apiBase}/api/documentation/credit-applications/${applicationId}${suffix}`
    if (kind === 'analisis_score' && import.meta.client) {
      const d = new Date()
      const params = new URLSearchParams({
        client_fecha: d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'medium' }),
      })
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (tz) {
          params.set('client_tz', tz)
        }
      } catch {
        // ignore
      }
      url = `${url}?${params.toString()}`
    }
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      },
    })
    if (!res.ok) {
      let msg = 'No se pudo abrir el PDF'
      try {
        const ct = res.headers.get('Content-Type') ?? ''
        if (ct.includes('application/json')) {
          const body = await res.json() as { message?: string }
          if (body?.message) {
            msg = body.message
          }
        }
      } catch {
        // default
      }
      throw new Error(msg)
    }
    const blob = await res.blob()
    if (blob.size < 1) {
      throw new Error('El PDF llegó vacío desde el servidor.')
    }
    openPdfBlobInNewTab(blob)
  }

  return {
    viewVaultDocument,
    downloadVaultPdf,
  }
}
