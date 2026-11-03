export interface NotificationDeliveryRow {
  id: number
  event_type: string
  channel: string
  recipient_role: string | null
  recipient_address: string | null
  status: string
  error_message: string | null
  sent_at: string | null
  ventanilla_filing_id: number
  filing_number: string | null
  filing_subject: string | null
  recipient_user?: { id: number, name: string, email?: string | null } | null
}

export interface NotificationDeliveriesData {
  data: NotificationDeliveryRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    sent_count: number
    failed_count: number
    skipped_count: number
  }
}

export function useNotificationDeliveriesApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchDeliveries(query: Record<string, string | number> = {}) {
    return api<NotificationDeliveriesData>('/notification-deliveries', { query })
  }

  return { fetchDeliveries }
}
