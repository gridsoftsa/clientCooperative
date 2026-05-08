/**
 * Descarga binarios de reportes (Excel / PDF) con Sanctum + CSRF, sin usar $api (Accept JSON).
 */
export function useReportExport() {
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

  async function downloadReportFile(
    path: string,
    query: Record<string, string | number | null | undefined>,
    filename: string,
    acceptMime: string,
  ): Promise<void> {
    if (import.meta.server) {
      return
    }
    await ensureCsrfCookie()
    const token = readXsrfCookie()
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        params.set(k, String(v))
      }
    })
    const url = `${apiBase}/api${path}?${params.toString()}`
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: acceptMime,
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
    })
    const blob = await res.blob()
    if (!res.ok) {
      let message = `Error ${res.status}: no se pudo generar el archivo`
      if (blob.type.includes('json')) {
        try {
          const err = JSON.parse(await blob.text()) as { message?: string }
          if (typeof err.message === 'string' && err.message !== '') {
            message = err.message
          }
        } catch {
          // keep default
        }
      }
      throw new Error(message)
    }
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  return { downloadReportFile }
}
