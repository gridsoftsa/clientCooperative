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

const POLL_MS = 20_000
const MAX_VISIBLE = 4
const AUTO_DISMISS_MS = 12_000

export function useNotificationToasts() {
  const inboxApi = useInboxNotificationsApi()
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const { hasPermission } = usePermissions()
  const router = useRouter()

  const visibleToasts = useState<NotificationToastItem[]>('notification-toasts-visible', () => [])
  const unreadCount = useState('notification-toasts-unread-count', () => 0)
  const inboxItems = useState<InboxNotificationRow[]>('notification-toasts-inbox-items', () => [])
  const refreshNonce = useState('notification-toasts-refresh-nonce', () => 0)
  const loading = ref(false)

  const seenToastKeys = import.meta.client ? new Set<string>() : null
  let initialInboxLoad = true
  let initialAnnouncementLoad = true
  let pollTimer: ReturnType<typeof setInterval> | undefined

  const canCheckAnnouncements = computed(() => hasPermission('comunicados_ver'))

  function dismissToast(key: string) {
    visibleToasts.value = visibleToasts.value.filter(item => item.key !== key)
  }

  function pushToast(item: NotificationToastItem) {
    if (seenToastKeys?.has(item.key)) {
      return
    }

    seenToastKeys?.add(item.key)
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
      important: row.module === 'comunicados' || title.toUpperCase().includes('TRD'),
      source: 'inbox',
      communicationId: row.communication_id,
    }
  }

  function announcementToastFromItem(item: CommunicationAnnouncementItem): NotificationToastItem {
    return {
      key: `announcement:${item.id}`,
      title: item.title,
      message: item.summary || item.body,
      url: item.url,
      createdAt: item.published_at,
      important: item.is_important,
      source: 'announcement',
      communicationId: item.id,
    }
  }

  async function refreshInbox(showHistoricalUnread = false) {
    const response = await inboxApi.fetchInbox({ per_page: 12, page: 1 })
    inboxItems.value = response.data
    unreadCount.value = response.meta.unread_count

    for (const row of response.data) {
      if (row.read_at) {
        continue
      }

      const toast = inboxToastFromRow(row)
      if (initialInboxLoad && !showHistoricalUnread) {
        seenToastKeys?.add(toast.key)
        continue
      }

      pushToast(toast)
    }

    initialInboxLoad = false
  }

  async function refreshAnnouncements(showHistoricalUnread = false) {
    if (!canCheckAnnouncements.value) {
      return
    }

    const res = await api<{ data: CommunicationAnnouncementItem[] }>('/communications/pending-announcements')
    const pending = res.data ?? []

    for (const item of pending) {
      const toast = announcementToastFromItem(item)
      if (initialAnnouncementLoad && !showHistoricalUnread) {
        seenToastKeys?.add(toast.key)
        continue
      }

      pushToast(toast)
    }

    initialAnnouncementLoad = false
  }

  async function refreshAll(showHistoricalUnread = false) {
    if (import.meta.server || loading.value) {
      return
    }

    loading.value = true
    try {
      await Promise.all([
        refreshInbox(showHistoricalUnread),
        refreshAnnouncements(showHistoricalUnread),
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
    void refreshAll(true)
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

  function startPolling() {
    if (!import.meta.client) {
      return () => {}
    }

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
    void refreshAll(true)
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
