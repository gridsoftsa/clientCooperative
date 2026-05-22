export interface DocSeriesRow {
  id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  subseries_count?: number
}

export interface DocSubseriesRow {
  id: number
  doc_series_id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  document_types_count?: number
  series?: Pick<DocSeriesRow, 'id' | 'code' | 'name'>
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
