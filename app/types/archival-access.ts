export type ArchivalAccessPermissionValue =
  | 'view'
  | 'create'
  | 'edit'
  | 'download'
  | 'attach'
  | 'close'
  | 'transfer'
  | 'void'

export type ArchivalAccessGrantableType = 'user' | 'role'

export interface ArchivalAccessGrant {
  id: number
  grantable_type: ArchivalAccessGrantableType
  grantable_id: number
  grantable_label: string
  archival_file_type_id?: number | null
  archival_file_type?: { id: number, name: string, type_key: string } | null
  doc_series_id?: number | null
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries_id?: number | null
  doc_subseries?: { id: number, code: string, name: string } | null
  doc_document_type_id?: number | null
  doc_document_type?: { id: number, code: string, name: string } | null
  archival_file_id?: number | null
  archival_file?: { id: number, file_number: string, title: string } | null
  permission: ArchivalAccessPermissionValue
  permission_label: string
  status: string
  status_label: string
  starts_at?: string | null
  ends_at?: string | null
  authorized_by?: { id: number, name: string } | null
  created_at?: string | null
}

export interface ArchivalAccessGrantOptions {
  permissions: Array<{ value: string, label: string }>
  statuses: Array<{ value: string, label: string }>
  grantable_types: Array<{ value: string, label: string }>
  file_types: Array<{ id: number, name: string, type_key: string }>
  roles: Array<{ id: number, name: string }>
  users: Array<{ id: number, name: string, email?: string }>
  series: Array<{ id: number, code: string, name: string }>
  subseries: Array<{ id: number, doc_series_id: number, code: string, name: string }>
  document_types: Array<{ id: number, doc_subseries_id: number, code: string, name: string }>
}

export interface ArchivalAccessControlReportRow {
  id: number
  file_type: string
  series: string
  subseries: string
  document_type: string
  archival_file: string
  grantable_type: string
  grantable_label: string
  permission: string
  status: string
  starts_at: string
  ends_at: string
  authorized_by: string
}

export interface StoreArchivalAccessGrantPayload {
  grantable_type: ArchivalAccessGrantableType
  grantable_id: number
  archival_file_type_id?: number | null
  doc_series_id?: number | null
  doc_subseries_id?: number | null
  doc_document_type_id?: number | null
  archival_file_id?: number | null
  permission: ArchivalAccessPermissionValue
  status?: string
  starts_at?: string | null
  ends_at?: string | null
}
