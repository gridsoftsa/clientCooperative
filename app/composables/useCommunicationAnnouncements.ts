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
  const { hasPermission } = usePermissions()
  const router = useRouter()

  const queue = useState<CommunicationAnnouncementItem[]>('communication-announcement-queue', () => [])
  const dismissedIds = useState<number[]>('communication-announcement-dismissed-ids', () => [])
  const checking = ref(false)

  const current = computed(() => queue.value[0] ?? null)
  const canCheck = computed(() => hasPermission('comunicados_ver'))

  function isDismissed(id: number): boolean {
    return dismissedIds.value.includes(id)
  }

  function enqueueAnnouncement(item: CommunicationAnnouncementItem): void {
    if (isDismissed(item.id)) {
      return
    }

    if (queue.value.some(existing => existing.id === item.id)) {
      return
    }

    queue.value.push(item)
  }

  function syncPendingQueue(items: CommunicationAnnouncementItem[], options?: { sessionInitial?: boolean }): void {
    const sessionInitial = options?.sessionInitial === true

    for (const item of items) {
      if (isDismissed(item.id)) {
        continue
      }

      if (sessionInitial || !queue.value.some(existing => existing.id === item.id)) {
        enqueueAnnouncement(item)
      }
    }
  }

  async function dismissCurrent(openDetail = false) {
    const item = current.value
    if (!item) {
      return
    }

    if (!dismissedIds.value.includes(item.id)) {
      dismissedIds.value.push(item.id)
    }

    queue.value.shift()

    const { $api } = useNuxtApp()
    const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

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

  return {
    queue,
    current,
    canCheck,
    checking,
    enqueueAnnouncement,
    syncPendingQueue,
    dismissCurrent,
  }
}
