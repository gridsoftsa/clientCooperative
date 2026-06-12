export type WorkflowReportScope = 'mine' | 'area' | 'all'

export type WorkflowReportKey =
  | 'dashboard'
  | 'overdue-tasks'
  | 'sla-compliance'
  | 'user-performance'
  | 'workload'
  | 'stage-duration'

export interface WorkflowReportFilters {
  scope: WorkflowReportScope
  org_unit_id?: number | null
  assignee_user_id?: number | null
  functional_type_key?: string | null
  workflow_definition_id?: number | null
  filed_from?: string | null
  filed_to?: string | null
  completed_from?: string | null
  completed_to?: string | null
  group_by?: 'user' | 'org_unit'
}

export interface WorkflowOverdueTaskRow {
  task_id: number
  filing_number: string | null
  filing_id: number | null
  subject: string | null
  functional_type_key: string | null
  functional_type_label: string | null
  stage_name: string | null
  workflow_name: string | null
  assignee: { id: number, name: string } | null
  org_unit: { id: number, name: string } | null
  due_at: string | null
  days_overdue: number | null
  traffic_light_status: string | null
}

export interface WorkflowSlaComplianceSummary {
  total_completed: number
  on_time_count: number
  off_time_count: number
  on_time_percent: number | null
  off_time_percent: number | null
  avg_response_hours: number | null
  active_instances: number
  overdue_open_tasks: number
}

export interface WorkflowUserPerformanceRow {
  user: { id: number, name: string } | null
  assigned_count: number
  completed_count: number
  overdue_open_count: number
  avg_completion_hours: number | null
  productivity_percent: number | null
}

export interface WorkflowWorkloadRow {
  group_by: 'user' | 'org_unit'
  label: string
  user?: { id: number, name: string } | null
  org_unit?: { id: number, name: string, code?: string | null } | null
  active_count: number
  overdue_count: number
  due_soon_count: number
}

export interface WorkflowStageDurationRow {
  stage: { id: number, key: string, name: string } | null
  workflow: { id: number, key: string, name: string } | null
  sample_count: number
  avg_hours: number
  max_hours: number
  completed_late_count: number
}

export interface WorkflowDashboardData {
  kpis: WorkflowSlaComplianceSummary & {
    traffic_light: { green: number, orange: number, red: number }
    workload_total_active: number
    overdue_tasks_listed: number
  }
  workload_top: WorkflowWorkloadRow[]
  overdue_top: WorkflowOverdueTaskRow[]
  trends: Array<{
    period: string
    label: string
    completed_count: number
    on_time_percent: number | null
  }>
}
