import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'

export interface TrdTableRow {
  id: number
  org_unit_id: number
  notes?: string | null
  org_unit?: { id: number; name: string; code: string; is_document_producer?: boolean }
  versions?: TrdVersionRow[]
}

export interface TrdVersionRow {
  id: number
  trd_table_id: number
  version_number: number
  status: string
  producer_office_name: string
  producer_office_code: string
  approved_at?: string | null
  effective_from?: string | null
  effective_to?: string | null
  retention_application_level: string
  is_locked: boolean
  document_types?: DocDocumentTypeRow[]
  retention_rules?: TrdRetentionRuleRow[]
}

export interface TrdRetentionRuleRow {
  id: number
  trd_version_id: number
  scope_level: string
  doc_series_id?: number | null
  doc_subseries_id?: number | null
  doc_document_type_id?: number | null
  years_management: number
  years_central: number
  years_historical?: number | null
  final_disposition: string
  procedure_text?: string | null
  notes?: string | null
}

export interface EffectiveRetentionPayload {
  rule_id: number
  years_management: number
  years_central: number
  years_historical?: number | null
  final_disposition: string
  procedure_text?: string | null
  notes?: string | null
  inherited_from: 'document_type' | 'subseries' | 'series'
}

export interface CatalogTreeSeries extends Pick<DocSeriesRow, 'id' | 'code' | 'name' | 'is_active'> {
  subseries: Array<
    Pick<DocSubseriesRow, 'id' | 'doc_series_id' | 'code' | 'name' | 'is_active'> & {
      document_types: DocDocumentTypeRow[]
    }
  >
}

export interface TrdVersionShowResponse {
  data: TrdVersionRow
  effective_retention_preview: Record<number, EffectiveRetentionPayload | null>
}

/** Tipo documental en consulta TRD vigente (HU-TRD-16) con retención efectiva. */
export interface TrdConsultDocumentTypeNode {
  id: number
  doc_subseries_id: number
  code: string
  name: string
  allowed_support?: string | null
  is_active: boolean
  effective_retention: EffectiveRetentionPayload | null
}

export interface TrdConsultSubseriesNode {
  id: number
  doc_series_id: number
  code: string
  name: string
  is_active: boolean
  document_types: TrdConsultDocumentTypeNode[]
}

export interface TrdConsultSeriesNode {
  id: number
  code: string
  name: string
  is_active: boolean
  subseries: TrdConsultSubseriesNode[]
}

export interface TrdActiveVersionConsultData {
  trd_table: TrdTableRow
  version: TrdVersionRow
  catalog_tree: TrdConsultSeriesNode[]
  effective_retention_by_document_type: Record<number, EffectiveRetentionPayload | null>
  summary: {
    document_types_count: number
    with_effective_rule: number
    without_effective_rule: number
  }
}
