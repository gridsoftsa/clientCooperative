import type { CommunicationItem } from '~/types/communications'

export interface CommunicationAnnouncementItem {
  id: number
  type: string
  type_label: string
  title: string
  summary?: string | null
  body?: string | null
  is_important: boolean
  is_featured: boolean
  published_at?: string | null
  event_starts_at?: string | null
  event_location?: string | null
  url: string
}

export function useCommunicationAnnouncements() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const { hasPermission } = usePermissions()
  const router = useRouter()

  const queue = ref<CommunicationAnnouncementItem[]>([])
  const current = computed(() => queue.value[0] ?? null)
  const checking = ref(false)
  const dismissedLocally = ref(new Set<number>())

  const canCheck = computed(() => hasPermission('comunicados_ver'))

  async function fetchPending(): Promise<CommunicationAnnouncementItem[]> {
    const res = await api<{ data: CommunicationAnnouncementItem[] }>('/communications/pending-announcements')
    return res.data ?? []
  }

  async function refreshQueue() {
    if (!canCheck.value || checking.value || import.meta.server) {
      return
    }

    checking.value = true
    try {
      const pending = await fetchPending()
      const existingIds = new Set(queue.value.map(item => item.id))
      const incoming = pending.filter(item => !dismissedLocally.value.has(item.id))

      for (const item of incoming) {
        if (!existingIds.has(item.id)) {
          queue.value.push(item)
        }
      }
    }
    catch {
      // Silencioso: no bloquear la sesión por avisos
    }
    finally {
      checking.value = false
    }
  }

  async function dismissCurrent(openDetail = false) {
    const item = current.value
    if (!item) {
      return
    }

    dismissedLocally.value.add(item.id)
    queue.value.shift()

    try {
      await api(`/communications/${item.id}/dismiss-announcement`, { method: 'POST' })
    }
    catch {
      // Ya no volver a mostrar en esta sesión aunque falle el API
    }

    if (openDetail) {
      await router.push(item.url)
    }
  }

  function startPolling() {
    if (!import.meta.client || !canCheck.value) {
      return () => {}
    }

    void refreshQueue()
    const timer = window.setInterval(() => {
      void refreshQueue()
    }, 90_000)

    return () => window.clearInterval(timer)
  }

  return {
    queue,
    current,
    canCheck,
    refreshQueue,
    dismissCurrent,
    startPolling,
  }
}
