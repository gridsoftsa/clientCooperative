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

export interface VentanillaSearchableMetadataFieldRow {
  code: string
  name: string
}

export interface VentanillaReportableMetadataFieldRow {
  code: string
  name: string
  data_type: string
}

import type { OrgStaffListItem } from '~/types/org-structure'

export interface VentanillaCatalogOrgUnitRow {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

export interface VentanillaCatalogData {
  filing_types: Array<{ value: VentanillaFilingTypeValue; label: string }>
  functional_types: VentanillaFunctionalTypeRow[]
  reception_media: VentanillaReceptionMediumRow[]
  searchable_metadata_fields?: VentanillaSearchableMetadataFieldRow[]
  reportable_metadata_fields?: VentanillaReportableMetadataFieldRow[]
  org_units?: VentanillaCatalogOrgUnitRow[]
  org_staff?: OrgStaffListItem[]
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
  notify_assignee: boolean
  notify_immediate_supervisor: boolean
  notify_unit_manager: boolean
  red_reminder_interval_days: number
  escalation_enabled: boolean
  escalation_business_days_after_deadline: number
  escalation_notify_immediate_supervisor: boolean
  escalation_notify_unit_manager: boolean
  escalation_functional_type_keys: string[] | null
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

export interface VentanillaNotificationSettingsRow {
  id: number
  channel_email_enabled: boolean
  channel_whatsapp_enabled: boolean
  channel_internal_enabled: boolean
  is_active: boolean
}

export interface VentanillaFilingNotificationDeliveryRow {
  id: number
  event_type: string
  channel: string
  recipient_role: string | null
  recipient_address: string | null
  status: string
  error_message: string | null
  sent_at: string | null
  recipient_user?: { id: number; name: string } | null
}

export interface VentanillaInboxNotificationRow {
  id: string
  read_at: string | null
  created_at: string | null
  ventanilla_filing_id: number | null
  filing_number: string | null
  event_type: string | null
  title: string | null
  message: string | null
  url: string | null
}

export interface VentanillaInboxNotificationsData {
  data: VentanillaInboxNotificationRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    unread_count: number
  }
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

export interface VentanillaEmailAccountRow {
  id: number
  name: string
  host: string
  port: number
  encryption: 'ssl' | 'tls' | 'none'
  username: string
  mailbox: string
  is_active: boolean
  has_password: boolean
  last_uid: number | null
  last_fetched_at: string | null
  last_fetch_error: string | null
}

export interface VentanillaClassificationRuleRow {
  id: number
  name: string
  priority: number
  source: string | null
  match_field: string
  match_mode: string
  pattern: string
  functional_type_key: string
  filing_type: string | null
  is_active: boolean
}

export interface VentanillaIntakeClassification {
  rule_id: number
  rule_name: string
  matched_field: string
  functional_type_key: string
  filing_type: string | null
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
  classification?: VentanillaIntakeClassification | null
  classified_filing?: { id: number; filing_number: string } | null
  classified_by?: { id: number; name: string } | null
  classified_at: string | null
  discarded_by?: { id: number; name: string } | null
  discarded_at: string | null
  discard_reason: string | null
  files?: VentanillaIntakeFileRow[]
}

export interface VentanillaFilingWorkflowOpenTask {
  id: number
  status: string
  traffic_light_status: VentanillaTrafficLightValue | null
  due_at: string | null
  days_overdue: number | null
  stage_name: string | null
  assignee: { id: number; name: string } | null
  escalation?: {
    id: number
    message: string
    business_days_overdue: number
    escalated_at: string | null
  } | null
}

export interface VentanillaFilingWorkflowSummary {
  instance_status: string
  closure_on_time: boolean | null
  is_active: boolean
  workflow_key: string | null
  workflow_name: string | null
  current_stage_key: string | null
  current_stage_name: string | null
  open_task: VentanillaFilingWorkflowOpenTask | null
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
  workflow?: VentanillaFilingWorkflowSummary | null
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

export interface VentanillaFilingAlertDeliveryRow {
  id: number
  recipient_role: string
  recipient_email: string
  channel: string
  sent_at: string | null
  recipient_user?: { id: number; name: string } | null
}

export interface VentanillaSlaComplianceTrendRow {
  period: string
  closed_total: number
  closed_on_time: number
  closed_late: number
  compliance_rate: number | null
}

export interface VentanillaSlaComplianceDashboardData {
  filters: {
    org_unit_responsible_id: number | null
    functional_type_key: string | null
    filed_from: string | null
    filed_to: string | null
  }
  kpis: {
    total: number
    green: number
    orange: number
    red: number
    overdue: number
    closed_on_time: number
    closed_late: number
    open_total: number
    average_sla_business_days: number | null
    average_response_business_days: number | null
  }
  by_filing_status: {
    registered: number
    in_progress: number
    closed: number
  }
  by_traffic_light: {
    green: number
    orange: number
    red: number
  }
  compliance_trend: VentanillaSlaComplianceTrendRow[]
}

export interface VentanillaFilingEscalationRow {
  id: number
  message: string
  business_days_overdue: number
  escalated_at: string | null
  deliveries?: VentanillaFilingAlertDeliveryRow[]
}

export interface VentanillaFilingAlertRow {
  id: number
  alert_type: string
  traffic_light_status: VentanillaTrafficLightValue
  message: string
  triggered_at: string | null
  resolved_at: string | null
  deliveries?: VentanillaFilingAlertDeliveryRow[]
}

export interface VentanillaFilingVerificationData {
  filing_number: string
  filing_type: VentanillaFilingTypeValue | null
  functional_type_label: string | null
  status: VentanillaFilingStatusValue | null
  subject: string | null
  filed_at: string | null
  org_unit_responsible?: { id: number; name: string; code: string } | null
  doc_document_type?: { id: number; code: string; name: string } | null
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
  notification_deliveries?: VentanillaFilingNotificationDeliveryRow[]
  escalation?: VentanillaFilingEscalationRow | null
  files?: VentanillaFilingFileRow[]
}
