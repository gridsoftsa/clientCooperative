export interface InboxNotificationRow {
  id: string
  type: string
  module?: string | null
  read_at?: string | null
  created_at?: string | null
  title?: string | null
  message?: string | null
  url?: string | null
  event_type?: string | null
  communication_id?: number | null
  ventanilla_filing_id?: number | null
  filing_number?: string | null
}

export interface InboxNotificationsData {
  data: InboxNotificationRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    unread_count: number
  }
}

export function useInboxNotificationsApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchInbox(query: Record<string, string | number | boolean> = {}) {
    return api<InboxNotificationsData>('/inbox-notifications', { query })
  }

  async function markRead(id: string) {
    const res = await api<{ data: InboxNotificationRow }>(`/inbox-notifications/${id}/read`, {
      method: 'PATCH',
    })
    return res.data
  }

  async function markAllRead(module?: string) {
    await api('/inbox-notifications/mark-all-read', {
      method: 'POST',
      body: module ? { module } : {},
    })
  }

  return {
    fetchInbox,
    markRead,
    markAllRead,
  }
}
