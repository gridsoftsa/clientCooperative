export type TalentPartyKind = 'employee' | 'supplier' | 'applicant'

export interface TalentPartyOrgUnit {
  id: number
  name: string
  code?: string | null
}

export interface TalentPartySummary {
  id: number
  kind: TalentPartyKind
  kind_label: string
  org_staff_id?: number | null
  applicant_id?: number | null
  display_name: string
  identifier: string | null
  document_type?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  postal_code?: string | null
  is_active?: boolean
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

export interface TalentPartyManualFolder {
  archival_file_id: number
  title: string
  file_number?: string | null
  documents: TalentPartyDocument[]
}

export interface TalentPartyDocumentTypeFolder {
  id: number
  code: string
  name: string
  archival_file_node_id: number | null
  manual_folders?: TalentPartyManualFolder[]
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

export interface TalentPartySettings {
  employee_trd_table_id: number | null
  supplier_trd_table_id: number | null
  applicant_trd_table_id: number | null
  employee_doc_subseries_ids: number[]
  supplier_doc_subseries_ids: number[]
  applicant_doc_subseries_ids: number[]
  employee_disabled_doc_document_type_ids: number[]
  supplier_disabled_doc_document_type_ids: number[]
  applicant_disabled_doc_document_type_ids: number[]
  employee_trd: TalentTrdOption | null
  supplier_trd: TalentTrdOption | null
  applicant_trd: TalentTrdOption | null
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
