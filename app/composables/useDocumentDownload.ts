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
    return match && match[1] != null ? decodeURIComponent(match[1]) : null
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

  /**
   * Abre el PDF en una pestaña nueva. Usa enlace con target=_blank: en muchos navegadores
   * `window.open` con `noopener` devuelve `null` aunque la pestaña sí se abre, lo que
   * disparaba un falso error "permita ventanas emergentes".
   */
  function openPdfBlobInNewTab(blob: Blob): void {
    if (import.meta.server) return
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

  async function fetchApplicationDocument(
    applicationId: string | number,
    documentId: number,
  ): Promise<{ blob: Blob, dispositionFilename: string | null }> {
    const docId = Number(documentId)
    if (!Number.isFinite(docId) || docId < 1) {
      throw new Error('Identificador de documento no válido.')
    }
    const xsrf = await ensureCsrfCookie()
    const url = `${apiBase}/api/credit-applications/${applicationId}/documents/${docId}/download`

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
        // mantener mensaje por defecto
      }
      throw new Error(msg)
    }

    const disposition = res.headers.get('Content-Disposition')
    let dispositionFilename: string | null = null
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match) {
        dispositionFilename = match[1]!.replace(/['"]/g, '').trim()
      }
    }

    const blob = await res.blob()
    return { blob, dispositionFilename }
  }

  async function downloadDocument(
    applicationId: string | number,
    documentId: number,
    filename?: string,
  ): Promise<void> {
    const { blob, dispositionFilename } = await fetchApplicationDocument(applicationId, documentId)
    const finalFilename = filename || dispositionFilename || 'documento'

    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = finalFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }

  /**
   * Abre el archivo en una pestaña nueva (vista previa). PDF e imágenes suelen mostrarse en el navegador;
   * DOC/DOCX pueden descargarse u ofrecer abrir con otra app según el equipo.
   */
  async function viewDocumentInNewTab(
    applicationId: string | number,
    documentId: number,
  ): Promise<void> {
    const { blob } = await fetchApplicationDocument(applicationId, documentId)
    openPdfBlobInNewTab(blob)
  }

  async function downloadApplicationPdf(applicationId: string | number, _filename?: string): Promise<void> {
    const xsrf = await ensureCsrfCookie()
    const url = `${apiBase}/api/credit-applications/${applicationId}/pdf`

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
      let msg = `Error ${res.status}: No se pudo abrir el PDF`
      try {
        const ct = res.headers.get('Content-Type') ?? ''
        if (ct.includes('application/json')) {
          const body = await res.json() as { message?: string }
          if (body?.message) {
            msg = body.message
          }
        }
      } catch {
        // mantener mensaje por defecto
      }
      throw new Error(msg)
    }

    const blob = await res.blob()
    openPdfBlobInNewTab(blob)
  }

  /**
   * Fecha, hora y zona tal como el navegador las muestra (equipo del usuario), para el pie del PDF.
   */
  function pdfClientLocalQuery(): { clientFecha: string, clientZona: string } {
    if (import.meta.server) {
      return { clientFecha: '', clientZona: '' }
    }
    const d = new Date()
    const clientFecha = d.toLocaleString('es-CO', {
      dateStyle: 'long',
      timeStyle: 'medium',
    })
    let clientZona = ''
    try {
      clientZona = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
      clientZona = ''
    }
    return { clientFecha, clientZona }
  }

  async function downloadAnalisisScorePdf(applicationId: string | number, _filename?: string): Promise<void> {
    const xsrf = await ensureCsrfCookie()
    const { clientFecha, clientZona } = pdfClientLocalQuery()
    const params = new URLSearchParams()
    if (clientFecha) {
      params.set('client_fecha', clientFecha)
    }
    if (clientZona) {
      params.set('client_tz', clientZona)
    }
    const q = params.toString()
    const url = `${apiBase}/api/credit-applications/${applicationId}/analisis-score/pdf${q ? `?${q}` : ''}`

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
      let msg = `Error ${res.status}: No se pudo abrir el PDF del SCORE`
      try {
        const ct = res.headers.get('Content-Type') ?? ''
        if (ct.includes('application/json')) {
          const body = await res.json() as { message?: string }
          if (body?.message) {
            msg = body.message
          }
        }
      } catch {
        // mantener mensaje por defecto
      }
      throw new Error(msg)
    }

    const blob = await res.blob()
    openPdfBlobInNewTab(blob)
  }

  return { downloadDocument, viewDocumentInNewTab, downloadApplicationPdf, downloadAnalisisScorePdf }
}
