export type DocumentConfidentialityLevel = 'public' | 'restricted' | 'internal_by_area'
export type ClassificationAudienceType = 'user' | 'org_unit'
export type ClassificationPermission = 'view' | 'edit'

export interface ClassificationAccessGrantRow {
  id?: number
  audience_type: ClassificationAudienceType
  audience_id: number
  permission: ClassificationPermission
  audience_label?: string
}

export interface CatalogConfidentialityPayload {
  inherited: boolean
  level: DocumentConfidentialityLevel
  effective_level: DocumentConfidentialityLevel
  effective_source: 'series' | 'subseries' | 'document_type'
  grants: ClassificationAccessGrantRow[]
  effective_grants: ClassificationAccessGrantRow[]
}

export interface DocumentClassificationOptions {
  levels: Array<{ value: DocumentConfidentialityLevel, label: string }>
  permissions: Array<{ value: ClassificationPermission, label: string }>
  users: Array<{ id: number, name: string, email: string | null, org_unit_ids?: number[] }>
  org_units: Array<{ id: number, name: string, code: string }>
}

export interface DocSeriesRow {
  id: number
  org_unit_id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  publishable_to_institutional_library?: boolean
  subseries_count?: number
  active_subseries_count?: number
  org_unit?: { id: number, name: string, code: string }
  confidentiality?: CatalogConfidentialityPayload
}

export interface DocSubseriesRow {
  id: number
  doc_series_id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  document_types_count?: number
  active_document_types_count?: number
  series?: Pick<DocSeriesRow, 'id' | 'code' | 'name'>
  confidentiality?: CatalogConfidentialityPayload
}

export interface DocDocumentTypeRow {
  id: number
  doc_subseries_id: number
  code: string
  name: string
  description?: string | null
  allowed_support?: string | null
  is_active: boolean
  subseries?: Pick<DocSubseriesRow, 'id' | 'code' | 'name' | 'doc_series_id'>
  confidentiality?: CatalogConfidentialityPayload
}

export interface ArchivalCatalogListMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ArchivalCatalogListResponse<T> {
  data: T[]
  meta: ArchivalCatalogListMeta
}
