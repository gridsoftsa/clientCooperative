export type ArchivalFileStatus =
  | 'draft'
  | 'active'
  | 'in_review'
  | 'returned'
  | 'closed'
  | 'inactive'
  | 'management_archive'
  | 'central_archive'
  | 'historical_archive'
  | 'final_disposition'

export type ArchivalFileModel = 'entity_case' | 'org_area'

export interface ArchivalFileType {
  id: number
  type_key: string
  name: string
  description?: string | null
  model: ArchivalFileModel
  doc_series_id?: number | null
  doc_subseries_id?: number | null
  doc_document_type_id?: number | null
  org_unit_id?: number | null
  trd_table_id?: number | null
  archival_metadata_schema_id?: number | null
  allows_master_documents: boolean
  is_system: boolean
  is_active: boolean
  sort_order: number
  required_documents?: ArchivalFileTypeRequiredDocument[]
  org_unit?: { id: number, name: string, code?: string } | null
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries?: { id: number, code: string, name: string, doc_series_id?: number } | null
  doc_document_type?: { id: number, code: string, name: string, doc_subseries_id?: number } | null
  trd_table?: { id: number, org_unit_id?: number, org_unit?: { id: number, name: string, code?: string } } | null
  metadata_schema?: { id: number, name: string, version_number?: number } | null
}

export interface ArchivalFileTypeRequiredDocument {
  id?: number
  doc_document_type_id: number
  label?: string | null
  workflow_stage_key?: string | null
  is_required: boolean
  sort_order: number
  doc_document_type?: { id: number, code: string, name: string }
}

export interface ArchivalFile {
  id: number
  archival_file_type_id: number
  file_number: string
  title: string
  status: ArchivalFileStatus
  archival_phase?: string | null
  parent_archival_file_id?: number | null
  org_unit_id: number
  org_office_id?: number | null
  entity_key?: string | null
  entity_label?: string | null
  metadata_values?: Record<string, unknown> | null
  is_master_file: boolean
  is_frozen: boolean
  closed_at?: string | null
  file_type?: ArchivalFileType
  org_unit?: { id: number, name: string }
  metadata_schema?: {
    id: number
    name: string
    active_fields?: Array<{
      code: string
      name: string
      data_type: string
      is_required: boolean
      is_reusable: boolean
      is_variable: boolean
      is_autocompletable: boolean
      options?: Array<{ value: string, label: string }>
    }>
  }
  consolidated_path?: string | null
  consolidated_at?: string | null
}

export interface ArchivalFileTreeNode {
  id: string
  type: 'file' | 'child_file' | 'folder' | 'document' | 'document_reference' | 'area' | 'series' | 'subseries' | 'document_type'
  name: string
  children: ArchivalFileTreeNode[]
  archival_file_id?: number
  archival_file_document_id?: number
  archival_file_node_id?: number
  file_number?: string
  status?: ArchivalFileStatus
  status_label?: string
  is_frozen?: boolean
  is_master_file?: boolean
  is_reference?: boolean
  download_url?: string | null
  metadata_values?: Record<string, unknown> | null
}

export interface ArchivalFileRequiredDocumentsEvaluation {
  complete: boolean
  missing: Array<{ doc_document_type_id: number, label: string, workflow_stage_key?: string | null }>
  fulfilled: Array<{ doc_document_type_id: number, label: string }>
}

export type ArchivalFileAlertType =
  | 'missing_required_documents'
  | 'closure_ready'
  | 'stale_draft'
  | 'closed_without_consolidation'
  | 'consolidation_pending_reminder'
  | 'retention_management_upcoming'
  | 'retention_management_overdue'
  | 'retention_central_upcoming'
  | 'retention_central_overdue'
  | 'retention_historical_upcoming'
  | 'retention_historical_overdue'

export interface ArchivalFileAlert {
  id: number
  archival_file_id: number
  alert_type: ArchivalFileAlertType | string
  severity: 'info' | 'warning' | 'danger' | string
  message: string
  is_resolved: boolean
  resolved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  file?: Pick<ArchivalFile, 'id' | 'file_number' | 'title' | 'status'>
}

export interface ArchivalFileAlertCatalogParameter {
  key: string
  label: string
  description: string
  value: number | boolean
  unit: string | null
}

export interface ArchivalFileAlertCatalogType {
  id: number
  key: ArchivalFileAlertType | string
  label: string
  severity: string
  category: string
  category_label: string
  trigger_description: string
  resolution_hint: string
  evaluation_mode: string
  evaluation_mode_label: string
  config_parameter: string | null
  threshold_days: number | null
  effective_threshold_days: number | null
  is_enabled: boolean
}

export interface ArchivalFileAlertSettingsPayload {
  global?: {
    enabled?: boolean
    retention_upcoming_days?: number
    stale_draft_days?: number
    consolidation_reminder_days?: number
  }
  types?: Array<{
    type_key: string
    label?: string
    severity?: string
    trigger_description?: string
    resolution_hint?: string
    threshold_days?: number | null
    is_enabled?: boolean
  }>
}

export interface ArchivalFileAlertCatalog {
  global: {
    enabled: boolean
    retention_upcoming_days: number
    stale_draft_days: number
    consolidation_reminder_days: number
    schedule: string
    schedule_label: string
    command: string
  }
  parameters: ArchivalFileAlertCatalogParameter[]
  types: ArchivalFileAlertCatalogType[]
  categories: Array<{ key: string, label: string }>
}

export interface ArchivalFileMetadataSuggestion {
  schema: Record<string, unknown> | null
  suggestions: Record<string, unknown>
  field_sources: Record<string, string>
  matched_document_id: number | null
}

export interface ArchivalFileMetadataOcrResult {
  schema: Record<string, unknown> | null
  suggestions: Record<string, unknown>
  field_sources: Record<string, string>
  confidence: Record<string, number>
  ocr_text: string | null
  engine: string
  processed: boolean
}

export const ARCHIVAL_FILE_STATUS_LABELS: Record<ArchivalFileStatus, string> = {
  draft: 'En construcción',
  active: 'Activo',
  in_review: 'En revisión',
  returned: 'Devuelto para ajuste',
  closed: 'Cerrado',
  inactive: 'Inactivo',
  management_archive: 'En archivo de gestión',
  central_archive: 'En archivo central',
  historical_archive: 'En archivo histórico',
  final_disposition: 'En disposición final',
}
