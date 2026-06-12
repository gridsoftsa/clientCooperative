import type {
  WorkflowDashboardData,
  WorkflowOverdueTaskRow,
  WorkflowReportFilters,
  WorkflowReportKey,
  WorkflowSlaComplianceSummary,
  WorkflowStageDurationRow,
  WorkflowUserPerformanceRow,
  WorkflowWorkloadRow,
} from '~/types/workflow-reports'

function queryFromFilters(filters: Partial<WorkflowReportFilters>): Record<string, string | number> {
  const query: Record<string, string | number> = {}

  if (filters.scope) {
    query.scope = filters.scope
  }
  if (filters.org_unit_id) {
    query.org_unit_id = filters.org_unit_id
  }
  if (filters.assignee_user_id) {
    query.assignee_user_id = filters.assignee_user_id
  }
  if (filters.functional_type_key) {
    query.functional_type_key = filters.functional_type_key
  }
  if (filters.workflow_definition_id) {
    query.workflow_definition_id = filters.workflow_definition_id
  }
  if (filters.filed_from) {
    query.filed_from = filters.filed_from
  }
  if (filters.filed_to) {
    query.filed_to = filters.filed_to
  }
  if (filters.completed_from) {
    query.completed_from = filters.completed_from
  }
  if (filters.completed_to) {
    query.completed_to = filters.completed_to
  }
  if (filters.group_by) {
    query.group_by = filters.group_by
  }

  return query
}

export function useWorkflowReportsApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const { downloadReportFile } = useReportExport()

  async function fetchOverdueTasks(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, rows: WorkflowOverdueTaskRow[], totals: { count: number } } }>(
      '/workflow/reports/overdue-tasks',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function fetchSlaCompliance(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, summary: WorkflowSlaComplianceSummary } }>(
      '/workflow/reports/sla-compliance',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function fetchUserPerformance(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, rows: WorkflowUserPerformanceRow[] } }>(
      '/workflow/reports/user-performance',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function fetchWorkload(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, rows: WorkflowWorkloadRow[] } }>(
      '/workflow/reports/workload',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function fetchStageDuration(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, rows: WorkflowStageDurationRow[] } }>(
      '/workflow/reports/stage-duration',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function fetchDashboard(filters: Partial<WorkflowReportFilters>) {
    const res = await api<{ data: { filters: WorkflowReportFilters, dashboard: WorkflowDashboardData } }>(
      '/workflow/reports/dashboard',
      { query: queryFromFilters(filters) },
    )

    return res.data
  }

  async function exportReport(report: WorkflowReportKey, format: 'xlsx' | 'pdf', filters: Partial<WorkflowReportFilters>) {
    const ext = format === 'xlsx' ? 'xlsx' : 'pdf'
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

    await downloadReportFile(
      '/workflow/reports/export',
      { report, format, ...queryFromFilters(filters) },
      `workflow-${report}.${ext}`,
      mime,
    )
  }

  return {
    fetchOverdueTasks,
    fetchSlaCompliance,
    fetchUserPerformance,
    fetchWorkload,
    fetchStageDuration,
    fetchDashboard,
    exportReport,
  }
}
