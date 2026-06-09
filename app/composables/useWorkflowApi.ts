import type {
  WorkflowBoardData,
  WorkflowDefinition,
  WorkflowDefinitionPayload,
  WorkflowFunctionalTypeOption,
  WorkflowStagePayload,
  WorkflowTaskCard,
} from '~/types/workflow'

export function useWorkflowApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchBoard(query: Record<string, string | number> = {}): Promise<WorkflowBoardData> {
    const res = await api<{ data: WorkflowBoardData }>('/workflow/board', { query })

    return res.data
  }

  async function fetchTasks(query: Record<string, string | number> = {}): Promise<{
    data: WorkflowTaskCard[]
    meta: { current_page: number, last_page: number, per_page: number, total: number }
  }> {
    return await api('/workflow/tasks', { query })
  }

  async function advanceTask(id: number, note?: string) {
    const res = await api<{ data: WorkflowTaskCard, message: string }>(`/workflow/tasks/${id}/advance`, {
      method: 'POST',
      body: note ? { note } : {},
    })

    return res
  }

  async function returnTask(id: number, targetStageId: number, note?: string) {
    const res = await api<{ data: WorkflowTaskCard, message: string }>(`/workflow/tasks/${id}/return`, {
      method: 'POST',
      body: { target_stage_id: targetStageId, note },
    })

    return res
  }

  async function reassignTask(id: number, assigneeUserId: number, note?: string) {
    const res = await api<{ data: WorkflowTaskCard, message: string }>(`/workflow/tasks/${id}/reassign`, {
      method: 'POST',
      body: { assignee_user_id: assigneeUserId, note },
    })

    return res
  }

  async function commentTask(id: number, comment: string) {
    return await api<{ message: string }>(`/workflow/tasks/${id}/comment`, {
      method: 'POST',
      body: { comment },
    })
  }

  async function fetchFunctionalTypes(): Promise<WorkflowFunctionalTypeOption[]> {
    const res = await api<{ data: WorkflowFunctionalTypeOption[] }>('/workflow/meta/functional-types')

    return res.data
  }

  async function fetchAssignableUsers(): Promise<Array<{ id: number, name: string, email?: string | null }>> {
    const res = await api<{ data: Array<{ id: number, name: string, email?: string | null }> }>('/workflow/meta/users')

    return res.data
  }

  async function fetchDefinitions(): Promise<WorkflowDefinition[]> {
    const res = await api<{ data: WorkflowDefinition[] }>('/workflow/definitions')

    return res.data
  }

  async function fetchDefinition(id: number): Promise<WorkflowDefinition> {
    const res = await api<{ data: WorkflowDefinition }>(`/workflow/definitions/${id}`)

    return res.data
  }

  async function createDefinition(payload: WorkflowDefinitionPayload & { key: string }) {
    const res = await api<{ data: WorkflowDefinition, message: string }>('/workflow/definitions', {
      method: 'POST',
      body: payload,
    })

    return res.data
  }

  async function updateDefinition(id: number, payload: Partial<WorkflowDefinitionPayload>) {
    const res = await api<{ data: WorkflowDefinition, message: string }>(`/workflow/definitions/${id}`, {
      method: 'PUT',
      body: payload,
    })

    return res.data
  }

  async function createStage(definitionId: number, payload: WorkflowStagePayload) {
    const res = await api<{ data: WorkflowDefinition['stages'] extends (infer S)[] | undefined ? S : never, message: string }>(
      `/workflow/definitions/${definitionId}/stages`,
      { method: 'POST', body: payload },
    )

    return res.data
  }

  async function updateStage(stageId: number, payload: Partial<WorkflowStagePayload>) {
    const res = await api<{ data: WorkflowDefinition['stages'] extends (infer S)[] | undefined ? S : never, message: string }>(
      `/workflow/stages/${stageId}`,
      { method: 'PUT', body: payload },
    )

    return res.data
  }

  async function deleteStage(stageId: number) {
    return await api<{ message: string }>(`/workflow/stages/${stageId}`, { method: 'DELETE' })
  }

  async function upsertBinding(workflowDefinitionId: number, functionalTypeKey: string, isActive = true) {
    const res = await api<{ data: { id: number, functional_type_key: string, is_active: boolean }, message: string }>(
      '/workflow/functional-bindings',
      {
        method: 'POST',
        body: {
          workflow_definition_id: workflowDefinitionId,
          functional_type_key: functionalTypeKey,
          is_active: isActive,
        },
      },
    )

    return res.data
  }

  return {
    fetchBoard,
    fetchTasks,
    advanceTask,
    returnTask,
    reassignTask,
    commentTask,
    fetchFunctionalTypes,
    fetchAssignableUsers,
    fetchDefinitions,
    fetchDefinition,
    createDefinition,
    updateDefinition,
    createStage,
    updateStage,
    deleteStage,
    upsertBinding,
  }
}
