import type { ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'

export type VentanillaFilingTypeValue = 'incoming' | 'outgoing' | 'internal'

export type VentanillaTrafficLightValue = 'green' | 'orange' | 'red'

export type VentanillaFilingStatusValue = 'registered' | 'in_progress' | 'closed' | 'voided'

export type VentanillaIntakeSourceValue = 'web_form' | 'email'

export type VentanillaIntakeStatusValue = 'pending_classification' | 'classified' | 'discarded'

export interface VentanillaFunctionalTypeRow {
  key: string
  label: string
  requires_response_default: boolean
  sla_business_days: number | null
  is_active?: boolean
  sort_order?: number
}

export interface VentanillaReceptionMediumRow {
  value: string
  label: string
  is_active?: boolean
  sort_order?: number
}

export interface VentanillaResponsibleUserRow {
  id: number
  name: string
  email?: string | null
}

export interface VentanillaCatalogData {
  filing_types: Array<{ value: VentanillaFilingTypeValue; label: string }>
  functional_types: VentanillaFunctionalTypeRow[]
  reception_media: VentanillaReceptionMediumRow[]
  responsible_users: VentanillaResponsibleUserRow[]
}

export interface VentanillaCatalogSettingsData {
  functional_types: Required<VentanillaFunctionalTypeRow>[]
  reception_media: Required<VentanillaReceptionMediumRow>[]
}

export interface VentanillaSlaSettingsRow {
  id: number
  calendar_name: string
  working_days: number[]
  orange_model: 'percentage' | 'days_before'
  orange_percentage: number
  orange_days_before: number
  alerts_enabled: boolean
  is_active: boolean
}

export interface VentanillaBusinessHolidayRow {
  id: number
  date: string
  name: string
  is_active: boolean
}

export interface VentanillaSlaSettingsData {
  settings: VentanillaSlaSettingsRow
  holidays: VentanillaBusinessHolidayRow[]
}

export interface VentanillaColombiaHolidayPreviewRow {
  date: string
  name: string
  source: 'seed' | 'calculated'
  already_configured: boolean
  configured_holiday_id: number | null
}

export interface VentanillaColombiaHolidayPreviewData {
  year: number
  holidays: VentanillaColombiaHolidayPreviewRow[]
}

export interface VentanillaColombiaHolidayImportResult {
  year: number
  imported: number
  reactivated: number
  skipped: number
}

export interface VentanillaIntakeFileRow {
  id: number
  title: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string | null
}

export interface VentanillaIntakeRow {
  id: number
  source: VentanillaIntakeSourceValue
  status: VentanillaIntakeStatusValue
  received_at: string
  mail_message_id: string | null
  sender_name: string | null
  sender_email: string | null
  sender_identifier: string | null
  subject: string
  body: string | null
  payload: Record<string, unknown> | null
  suggested_filing_type: VentanillaFilingTypeValue | null
  suggested_functional_type_key: string | null
  suggested_reception_medium: string | null
  classified_filing?: { id: number; filing_number: string } | null
  classified_by?: { id: number; name: string } | null
  classified_at: string | null
  discarded_by?: { id: number; name: string } | null
  discarded_at: string | null
  discard_reason: string | null
  files?: VentanillaIntakeFileRow[]
}

export interface VentanillaFilingSummary {
  id: number
  filing_number: string
  filing_type: VentanillaFilingTypeValue
  functional_type_key: string
  functional_type_label: string | null
  status: VentanillaFilingStatusValue
  subject: string
  filed_at: string
  requires_response: boolean
  response_deadline_at: string | null
  traffic_light_status: VentanillaTrafficLightValue | null
  filed_by?: { id: number; name: string }
  org_unit_responsible?: { id: number; name: string; code: string }
  doc_document_type?: { id: number; code: string; name: string }
}

export interface VentanillaFilingFileRow {
  id: number
  is_primary: boolean
  title: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by?: { id: number; name: string }
  created_at?: string
}

export interface VentanillaFilingEventRow {
  id: number
  event_type: string
  from_status: VentanillaFilingStatusValue | null
  to_status: VentanillaFilingStatusValue | null
  description: string | null
  metadata: Record<string, unknown> | null
  created_by?: { id: number; name: string } | null
  created_at: string | null
}

export interface VentanillaFilingAlertRow {
  id: number
  alert_type: string
  traffic_light_status: VentanillaTrafficLightValue
  message: string
  triggered_at: string | null
  resolved_at: string | null
}

export interface VentanillaFilingDetail extends VentanillaFilingSummary {
  requires_response_manual: boolean
  sla_business_days: number | null
  producer_org_unit?: { id: number; name: string; code: string } | null
  recipient_org_unit?: { id: number; name: string; code: string } | null
  sender_name: string | null
  sender_identifier: string | null
  recipient_name: string | null
  recipient_identifier: string | null
  reception_medium: string | null
  notes: string | null
  doc_series?: { id: number; code: string; name: string }
  doc_subseries?: { id: number; code: string; name: string }
  trd_version?: { id: number; version_number: number; status: string }
  trd_table_id: number
  effective_retention_snapshot: Record<string, unknown>
  archival_metadata_schema_id: number | null
  metadata_values: Record<string, unknown> | null
  archival_metadata_schema?: Pick<ArchivalMetadataSchemaRow, 'id' | 'name' | 'version_number' | 'fields'> | null
  receipt_url: string
  verification_url: string
  assigned_user?: { id: number; name: string } | null
  assigned_at: string | null
  response_text: string | null
  responded_at: string | null
  responded_by?: { id: number; name: string } | null
  closed_at: string | null
  closed_by?: { id: number; name: string } | null
  closure_result: string | null
  close_reason: string | null
  voided_at: string | null
  voided_by?: { id: number; name: string } | null
  void_reason: string | null
  events?: VentanillaFilingEventRow[]
  alerts?: VentanillaFilingAlertRow[]
  files?: VentanillaFilingFileRow[]
}
