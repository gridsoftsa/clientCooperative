import type {
  CommunicationDashboard,
  CommunicationItem,
  CommunicationReminderSettings,
  CommunicationSettingsPayload,
  CreateCommunicationPayload,
} from '~/types/communications'

export function useCommunicationsApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchFeed(params: Record<string, string | number | boolean | undefined> = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        query.set(key, String(value))
      }
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return api<{
      data: CommunicationItem[]
      current_page: number
      last_page: number
      total: number
    }>(`/communications/feed${suffix}`)
  }

  async function fetchDashboard() {
    const res = await api<{ data: CommunicationDashboard }>('/communications/dashboard')
    return res.data
  }

  async function fetchBirthdays() {
    const res = await api<{
      data: {
        today: Array<{ id: number, name: string, org_unit?: string | null }>
        upcoming: Array<{ id: number, name: string, org_unit?: string | null, next_birthday: string }>
      }
    }>('/communications/birthdays')
    return res.data
  }

  async function fetchTypes() {
    const res = await api<{ data: Array<{ value: string, label: string }> }>('/communications/types')
    return res.data ?? []
  }

  async function fetchOptions() {
    const res = await api<{
      data: {
        types: Array<{ value: string, label: string }>
        org_units: Array<{ id: number, name: string }>
        org_offices: Array<{ id: number, name: string }>
        roles: Array<{ id: number, name: string }>
        users: Array<{ id: number, name: string, email?: string | null }>
        reminder_settings?: CommunicationReminderSettings
        attachment_limits?: {
          max_kb: number
          php_upload_max_kb: number
          php_post_max_kb: number
          effective_max_kb: number
        }
      }
    }>('/communications/meta/options')
    return res.data
  }

  async function fetchSettings() {
    const res = await api<{ data: CommunicationSettingsPayload }>('/communications/settings')
    return res.data
  }

  async function updateSettings(payload: CommunicationSettingsPayload) {
    return api<{ data: CommunicationSettingsPayload, message: string }>('/communications/settings', {
      method: 'PUT',
      body: payload,
    })
  }

  async function fetchCommunication(id: number) {
    const res = await api<{ data: CommunicationItem }>(`/communications/${id}`)
    return res.data
  }

  async function createCommunication(payload: CreateCommunicationPayload) {
    return api<{ data: CommunicationItem, message: string }>('/communications', {
      method: 'POST',
      body: payload,
    })
  }

  async function publishCommunication(id: number) {
    return api<{ data: CommunicationItem, message: string }>(`/communications/${id}/publish`, {
      method: 'POST',
    })
  }

  async function confirmRead(id: number) {
    return api<{ data: { read_at: string | null, confirmed_at: string | null }, message: string }>(
      `/communications/${id}/confirm-read`,
      { method: 'POST' },
    )
  }

  async function deleteCommunication(id: number) {
    return api<{ message: string }>(`/communications/${id}`, {
      method: 'DELETE',
    })
  }

  async function uploadAttachment(id: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    return api<{ data: unknown, message: string }>(`/communications/${id}/attachments`, {
      method: 'POST',
      body: form,
    })
  }

  return {
    fetchFeed,
    fetchDashboard,
    fetchBirthdays,
    fetchTypes,
    fetchOptions,
    fetchSettings,
    updateSettings,
    fetchCommunication,
    createCommunication,
    publishCommunication,
    deleteCommunication,
    confirmRead,
    uploadAttachment,
  }
}
