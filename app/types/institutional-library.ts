export type InstitutionalLibraryCategoryValue =
  | 'policies'
  | 'procedures'
  | 'manuals'
  | 'forms'
  | 'instructions'
  | 'regulations'
  | 'guidelines'

export interface InstitutionalLibraryCategory {
  value: InstitutionalLibraryCategoryValue
  label: string
  icon: string
  count?: number
}

export interface InstitutionalLibraryDocument {
  id: number
  archival_file_id: number
  title: string
  version_number: number
  mime_type?: string | null
  institutional_category?: InstitutionalLibraryCategoryValue | null
  institutional_category_label?: string | null
  effective_from?: string | null
  effective_to?: string | null
  is_effective?: boolean
  published_at?: string | null
  org_unit?: { id: number, name: string } | null
  doc_document_type?: { id: number, code: string, name: string } | null
  published_by?: { id: number, name: string } | null
  view_count?: number
  description?: string | null
  metadata_values?: Record<string, unknown> | null
  approved_at?: string | null
  approved_by?: { id: number, name: string } | null
  uploaded_by?: { id: number, name: string } | null
  versions?: InstitutionalLibraryVersion[]
}

export interface InstitutionalLibraryVersion {
  id: number
  version_number: number
  is_current_version: boolean
  is_published: boolean
  is_effective: boolean
  effective_from?: string | null
  effective_to?: string | null
  published_at?: string | null
}

export interface InstitutionalLibraryListResponse {
  data: InstitutionalLibraryDocument[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PublishInstitutionalLibraryPayload {
  archival_file_id: number
  institutional_category?: InstitutionalLibraryCategoryValue
  effective_from?: string
  effective_to?: string | null
}
