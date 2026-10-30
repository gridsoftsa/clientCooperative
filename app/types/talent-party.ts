export type TalentPartyKind = 'employee' | 'supplier'

export interface TalentPartyOrgUnit {
  id: number
  name: string
  code?: string | null
}

export interface TalentPartySummary {
  id: number
  kind: TalentPartyKind
  kind_label: string
  display_name: string
  identifier: string | null
  trd_table_id: number
  org_unit_id: number
  org_unit: TalentPartyOrgUnit | null
  archival_file_id: number | null
  subseries_count: number
  documents_count: number
  created_at?: string | null
}

export interface TalentPartyDocument {
  id: number
  archival_file_id: number
  title: string
  original_name?: string | null
  folio_start?: number | null
  folio_end?: number | null
  uploaded_at?: string | null
}

export interface TalentPartyDocumentTypeFolder {
  id: number
  code: string
  name: string
  archival_file_node_id: number | null
  documents: TalentPartyDocument[]
}

export interface TalentPartySubseriesFolder {
  doc_series_id: number
  series_name: string
  doc_subseries_id: number
  name: string
  document_types: TalentPartyDocumentTypeFolder[]
}

export interface TalentPartyDetail extends TalentPartySummary {
  folders: TalentPartySubseriesFolder[]
}

export interface TalentTrdOption {
  id: number
  org_unit_id: number
  org_unit_name: string | null
  org_unit_code: string | null
  label: string
}

export interface TalentTrdDocumentType {
  id: number
  code: string
  name: string
}

export interface TalentTrdSubseries {
  id: number
  code: string
  name: string
  document_types: TalentTrdDocumentType[]
}

export interface TalentTrdSeries {
  id: number
  code: string
  name: string
  subseries: TalentTrdSubseries[]
}
