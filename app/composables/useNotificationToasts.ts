import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'
import type { CommunicationAnnouncementItem } from '~/composables/useCommunicationAnnouncements'

export interface NotificationToastItem {
  key: string
  title: string
  message?: string | null
  url?: string | null
  createdAt?: string | null
  important: boolean
  source: 'inbox' | 'announcement'
  communicationId?: number | null
}

const POLL_MS = 15_000
const MAX_VISIBLE = 4
const AUTO_DISMISS_MS = 12_000

export function useNotificationToasts() {
  const inboxApi = useInboxNotificationsApi()
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const {
    syncPendingQueue,
    canCheck: canCheckAnnouncements,
  } = useCommunicationAnnouncements()

  const visibleToasts = useState<NotificationToastItem[]>('notification-toasts-visible', () => [])
  const unreadCount = useState('notification-toasts-unread-count', () => 0)
  const inboxItems = useState<InboxNotificationRow[]>('notification-toasts-inbox-items', () => [])
  const refreshNonce = useState('notification-toasts-refresh-nonce', () => 0)
  const seenToastKeys = useState<string[]>('notification-toasts-seen-keys', () => [])
  const knownAnnouncementIds = useState<number[]>('notification-known-announcement-ids', () => [])
  const loading = ref(false)

  let initialInboxLoad = true
  let initialAnnouncementLoad = true
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let visibilityListenerAttached = false

  function hasSeenToast(key: string): boolean {
    return seenToastKeys.value.includes(key)
  }

  function markToastSeen(key: string): void {
    if (!hasSeenToast(key)) {
      seenToastKeys.value.push(key)
    }
  }

  function hasSeenCommunication(communicationId: number | null | undefined): boolean {
    if (!communicationId) {
      return false
    }

    return knownAnnouncementIds.value.includes(communicationId)
      || hasSeenToast(`announcement:${communicationId}`)
      || hasSeenToast(`inbox-communication:${communicationId}`)
  }

  function markCommunicationSeen(communicationId: number | null | undefined): void {
    if (!communicationId) {
      return
    }

    if (!knownAnnouncementIds.value.includes(communicationId)) {
      knownAnnouncementIds.value.push(communicationId)
    }

    markToastSeen(`announcement:${communicationId}`)
    markToastSeen(`inbox-communication:${communicationId}`)
  }

  function dismissToast(key: string) {
    visibleToasts.value = visibleToasts.value.filter(item => item.key !== key)
  }

  function pushToast(item: NotificationToastItem) {
    if (hasSeenToast(item.key)) {
      return
    }

    if (item.communicationId && hasSeenCommunication(item.communicationId)) {
      markToastSeen(item.key)

      return
    }

    markToastSeen(item.key)

    if (item.communicationId) {
      markCommunicationSeen(item.communicationId)
    }

    visibleToasts.value = [item, ...visibleToasts.value].slice(0, MAX_VISIBLE)

    if (!item.important) {
      window.setTimeout(() => {
        dismissToast(item.key)
      }, AUTO_DISMISS_MS)
    }
  }

  function inboxToastFromRow(row: InboxNotificationRow): NotificationToastItem {
    const title = row.title || 'Nueva notificación'
    return {
      key: `inbox:${row.id}`,
      title,
      message: row.message,
      url: row.url,
      createdAt: row.created_at,
      important: row.module === 'comunicados'
        || title.toUpperCase().includes('TRD')
        || title.toLowerCase().includes('recordatorio'),
      source: 'inbox',
      communicationId: row.communication_id,
    }
  }

  async function refreshInbox() {
    const response = await inboxApi.fetchInbox({ per_page: 12, page: 1 })
    inboxItems.value = response.data
    unreadCount.value = response.meta.unread_count

    for (const row of response.data) {
      if (row.read_at) {
        continue
      }

      const toast = inboxToastFromRow(row)

      if (initialInboxLoad) {
        markToastSeen(toast.key)
        if (toast.communicationId) {
          markCommunicationSeen(toast.communicationId)
        }
        continue
      }

      pushToast(toast)
    }

    initialInboxLoad = false
  }

  async function refreshAnnouncements() {
    if (!canCheckAnnouncements.value) {
      return
    }

    const res = await api<{ data: CommunicationAnnouncementItem[] }>('/communications/pending-announcements')
    const pending = res.data ?? []

    if (initialAnnouncementLoad) {
      syncPendingQueue(pending, { sessionInitial: true })
    }

    for (const item of pending) {
      if (!knownAnnouncementIds.value.includes(item.id)) {
        knownAnnouncementIds.value.push(item.id)
      }
    }

    initialAnnouncementLoad = false
  }

  async function refreshAll() {
    if (import.meta.server || loading.value) {
      return
    }

    loading.value = true
    try {
      await Promise.all([
        refreshInbox(),
        refreshAnnouncements(),
      ])
    }
    catch {
      // Silencioso en segundo plano
    }
    finally {
      loading.value = false
    }
  }

  function requestImmediateRefresh() {
    refreshNonce.value += 1
    void refreshAll()
  }

  async function openToast(item: NotificationToastItem) {
    dismissToast(item.key)

    if (item.source === 'inbox' && item.key.startsWith('inbox:')) {
      const inboxId = item.key.replace('inbox:', '')
      try {
        await inboxApi.markRead(inboxId)
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      catch {
        // Navegar igual si falla marcar leída
      }
    }

    if (item.source === 'announcement' && item.communicationId) {
      try {
        await api(`/communications/${item.communicationId}/dismiss-announcement`, { method: 'POST' })
      }
      catch {
        // Continuar navegación
      }
    }

    if (item.url) {
      await router.push(item.url)
      return
    }

    if (item.communicationId) {
      await router.push(`/comunicados/${item.communicationId}`)
    }
  }

  function attachVisibilityListener() {
    if (!import.meta.client || visibilityListenerAttached) {
      return
    }

    visibilityListenerAttached = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void refreshAll()
      }
    })
  }

  function startPolling() {
    if (!import.meta.client) {
      return () => {}
    }

    attachVisibilityListener()
    void refreshAll()
    pollTimer = window.setInterval(() => {
      void refreshAll()
    }, POLL_MS)

    return () => {
      if (pollTimer) {
        window.clearInterval(pollTimer)
      }
    }
  }

  watch(refreshNonce, () => {
    void refreshAll()
  })

  return {
    visibleToasts,
    unreadCount,
    inboxItems,
    loading,
    refreshAll,
    requestImmediateRefresh,
    dismissToast,
    openToast,
    startPolling,
  }
}
