const DEFAULT_INTERVAL_MS = 5000

/**
 * Reconsulta una vista mientras la pestaña está visible, sin recargar la página.
 */
export function useLivePageRefresh(
  refresh: () => void | Promise<void>,
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight = false

  async function run(): Promise<void> {
    if (!import.meta.client || document.visibilityState !== 'visible' || inFlight) {
      return
    }

    inFlight = true

    try {
      await refresh()
    }
    finally {
      inFlight = false
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      void run()
    }
  }

  onMounted(() => {
    if (!import.meta.client) {
      return
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    timer = window.setInterval(() => {
      void run()
    }, intervalMs)
  })

  onBeforeUnmount(() => {
    if (timer !== undefined) {
      window.clearInterval(timer)
    }

    if (import.meta.client) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })
}
