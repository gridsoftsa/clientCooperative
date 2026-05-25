export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000'

  // Custom $fetch instance for Laravel API
  const $api = $fetch.create({
    baseURL: `${apiBase}/api`,
    credentials: 'include', // Important for Sanctum cookies
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    async onRequest({ options }) {
      /**
       * No fijar `Content-Type: application/json` en defaults: con FormData, ofetch puede fusionar
       * headers y dejar `application/json`, y entonces el boundary multipart no se envía → Laravel
       * no recibe `file` y responde 422 (p. ej. subida FNG / adjuntos).
       */
      if (options.body instanceof FormData) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.delete('Content-Type')
        headers.delete('content-type')
        options.headers = headers
      } else if (
        options.body !== undefined
        && options.body !== null
        && typeof options.body === 'object'
        && !(options.body instanceof Blob)
        && !(options.body instanceof ArrayBuffer)
        && !(options.body instanceof URLSearchParams)
      ) {
        const headers = new Headers(options.headers as HeadersInit)
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json')
        }
        options.headers = headers
      }
      const csrfToken = await getCsrfToken(apiBase)
      if (csrfToken) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('X-XSRF-TOKEN', csrfToken)
        options.headers = headers
      }
    },
  })

  // Lee XSRF-TOKEN directo de document.cookie (más fiable en cross-subdomain que useCookie)
  function readXsrfCookie(): string | null {
    if (import.meta.server) return null
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match && match[1] != null ? decodeURIComponent(match[1]) : null
  }

  // CSRF token helper
  async function getCsrfToken(baseURL: string): Promise<string | null> {
    if (import.meta.server) return null

    if (!readXsrfCookie()) {
      try {
        await $fetch('/sanctum/csrf-cookie', {
          baseURL,
          credentials: 'include'
        })
      } catch (error) {
        console.warn('Failed to fetch CSRF cookie:', error)
      }
    }

    return readXsrfCookie()
  }

  async function $csrf() {
    return await getCsrfToken(apiBase)
  }

  return {
    provide: {
      api: $api,
      csrf: $csrf
    }
  }
})
