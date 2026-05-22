export type ArchivalAuditScopeFilter = 'all' | 'catalog' | 'trd'

export interface ArchivalAuditRow {
  id: number
  event: string
  archival_scope: string
  archival_scope_label: string
  auditable_label?: string | null
  auditable_id: string | number | null
  subject_summary?: string | null
  description: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  old_values_labeled?: Record<string, unknown> | null
  new_values_labeled?: Record<string, unknown> | null
  user?: { id: number, name: string, email?: string | null } | null
  ip_address?: string | null
  created_at: string | null
}

export interface ArchivalAuditMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  scope: string
  scope_label: string
}

export function useArchivalAuditApi() {
  const { $api } = useNuxtApp()

  async function fetchAudits(query: Record<string, string | number | undefined>) {
    return await $api<{ data: ArchivalAuditRow[], meta: ArchivalAuditMeta }>('/archival/audit', { query })
  }

  async function fetchAuditableTypes(scope: ArchivalAuditScopeFilter = 'all') {
    return await $api<{
      data: {
        groups: Array<{ scope: string, label: string, types: Array<{ type: string, label: string, has_records?: boolean }> }>
        types: Array<{ type: string, label: string, scope: string }>
      }
    }>('/archival/audit/auditable-types', { query: { scope } })
  }

  return { fetchAudits, fetchAuditableTypes }
}
