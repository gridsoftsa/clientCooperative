export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000'

  // Custom $fetch instance for Laravel API
  const $api = $fetch.create({
    baseURL: `${apiBase}/api`,
    credentials: 'include', // Important for Sanctum cookies
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    },
    async onRequest({ request, options }) {
      // Get CSRF token before making requests
      const csrfToken = await getCsrfToken(apiBase)
      if (csrfToken) {
        options.headers = {
          ...options.headers,
          'X-XSRF-TOKEN': csrfToken
        }
      }
    }
  })

  // Lee XSRF-TOKEN directo de document.cookie (más fiable en cross-subdomain que useCookie)
  function readXsrfCookie(): string | null {
    if (import.meta.server) return null
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
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
