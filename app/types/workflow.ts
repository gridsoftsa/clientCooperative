export type WorkflowTrafficLight = 'green' | 'orange' | 'red'

export type WorkflowTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface WorkflowSubjectSummary {
  id: number
  filing_number: string
  subject: string
  functional_type_key: string
  functional_type_label?: string | null
  status: string
  traffic_light_status: WorkflowTrafficLight | null
}

export interface WorkflowTaskCard {
  id: number
  status: WorkflowTaskStatus
  traffic_light_status: WorkflowTrafficLight | null
  started_at: string | null
  due_at: string | null
  days_overdue: number | null
  stage: { id: number, key: string, name: string } | null
  assignee: { id: number, name: string } | null
  instance: { id: number, status: string } | null
  subject: WorkflowSubjectSummary | null
  workflow: { id: number, key: string, name: string } | null
}

export interface WorkflowBoardColumn {
  id: number
  key: string
  title: string
  tasks: WorkflowTaskCard[]
}

export interface WorkflowBoardData {
  definition: { id: number, key: string, name: string } | null
  columns: WorkflowBoardColumn[]
}

export interface WorkflowStage {
  id: number
  key: string
  name: string
  sort_order: number
  stage_type: string
  assignee_type: string
  assignee_user_id?: number | null
  assignee_org_unit_id?: number | null
  assignee_position_id?: number | null
  sla_business_days: number | null
  allows_advance: boolean
  allows_return: boolean
  allows_reassign: boolean
  is_terminal: boolean
  ventanilla_role?: string | null
  assignee_user?: { id: number, name: string } | null
  assignee_org_unit?: { id: number, name: string, code?: string } | null
  assignee_position?: { id: number, name: string, code?: string } | null
}

export interface WorkflowFunctionalTypeOption {
  key: string
  label: string
}

export interface WorkflowStagePayload {
  key: string
  name: string
  sort_order: number
  stage_type?: string
  assignee_type: string
  assignee_user_id?: number | null
  assignee_org_unit_id?: number | null
  assignee_position_id?: number | null
  sla_business_days?: number | null
  allows_advance?: boolean
  allows_return?: boolean
  allows_reassign?: boolean
  is_terminal?: boolean
  ventanilla_role?: string | null
}

export interface WorkflowBindingCoverageRow {
  functional_type_key: string
  functional_type_label: string
  has_active_binding: boolean
  workflow_definition_id: number | null
  workflow_key: string | null
  workflow_name: string | null
}

export interface WorkflowDefinitionSummary {
  id: number
  key: string
  name: string
}

export interface WorkflowContextWarning {
  code: string
  message: string
}

export interface WorkflowTaskEscalationSummary {
  id: number
  message: string
  business_days_overdue: number
  escalated_at: string | null
  deliveries?: Array<{
    id: number
    recipient_role: string
    channel: string
    sent_at: string | null
    recipient_user: { id: number, name: string } | null
  }>
}

export interface WorkflowArchivalFileContext {
  id: number
  file_number: string
  title: string
  status: string
  workflow_task_id: number | null
  workflow_stage_key: string | null
  archival_file_node_id: number | null
  stage_folder_name: string | null
  default_doc_document_type_id: number | null
  can_upload: boolean
  required_documents_stage: {
    complete: boolean
    missing: Array<{ doc_document_type_id: number, label: string, workflow_stage_key: string | null }>
    fulfilled: Array<{ doc_document_type_id: number, label: string }>
  } | null
  required_documents_overall: {
    complete: boolean
    missing: Array<{ doc_document_type_id: number, label: string, workflow_stage_key: string | null }>
    fulfilled: Array<{ doc_document_type_id: number, label: string }>
  }
}

export interface WorkflowFilingContext {
  instance: {
    id: number
    status: string
    started_at: string | null
    completed_at: string | null
    closure_on_time: boolean | null
  }
  workflow: WorkflowDefinitionSummary | null
  current_stage: { id: number, key: string, name: string } | null
  open_task: {
    id: number
    status: WorkflowTaskStatus
    traffic_light_status: WorkflowTrafficLight | null
    started_at: string | null
    due_at: string | null
    days_overdue: number | null
    stage: {
      id: number
      key: string
      name: string
      allows_advance: boolean
      allows_return: boolean
      allows_reassign: boolean
      is_terminal: boolean
    } | null
    assignee: { id: number, name: string } | null
  } | null
  returnable_stages: Array<{ id: number, key: string, name: string, sort_order: number }>
  events: Array<{
    id: number
    event_type: string
    description: string | null
    created_at: string | null
    created_by: { id: number, name: string } | null
    stage: { key: string, name: string } | null
  }>
  is_active: boolean
  advance_guidance?: string | null
  warnings?: WorkflowContextWarning[]
  task_escalation?: WorkflowTaskEscalationSummary | null
  archival_file?: WorkflowArchivalFileContext | null
  sla_alerts?: Array<{
    id: number
    alert_type: string
    traffic_light_status: string | null
    message: string
    triggered_at: string | null
  }>
}

export interface WorkflowDefinitionPayload {
  key?: string
  name: string
  description?: string | null
  is_active?: boolean
}

export interface WorkflowFunctionalBinding {
  id: number
  functional_type_key: string
  is_active: boolean
}

export interface WorkflowDefinition {
  id: number
  key: string
  name: string
  description: string | null
  is_active: boolean
  is_locked: boolean
  stages?: WorkflowStage[]
  functional_bindings?: WorkflowFunctionalBinding[]
  functionalBindings?: WorkflowFunctionalBinding[]
  instances_count?: number
}
