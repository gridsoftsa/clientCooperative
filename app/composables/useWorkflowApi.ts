import type {
  WorkflowBoardData,
  WorkflowDefinition,
  WorkflowDefinitionPayload,
  WorkflowFilingContext,
  WorkflowBindingCoverageRow,
  WorkflowFunctionalTypeOption,
  WorkflowStagePayload,
  WorkflowTaskCard,
  WorkflowTaskCollaboratorRow,
  WorkflowCollaboratorsSummary,
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

  async function fetchTask(id: number): Promise<WorkflowTaskCard> {
    const res = await api<{ data: WorkflowTaskCard }>(`/workflow/tasks/${id}`)

    return res.data
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

  async function fetchFilingContext(filingId: number): Promise<WorkflowFilingContext | null> {
    const res = await api<{ data: WorkflowFilingContext | null }>(`/workflow/filings/${filingId}/context`)

    return res.data
  }

  async function fetchAssignableUsers(): Promise<Array<{ id: number, name: string, email?: string | null }>> {
    const res = await api<{ data: Array<{ id: number, name: string, email?: string | null }> }>('/workflow/meta/users')

    return res.data
  }

  async function fetchActiveDefinitions(): Promise<Array<{ id: number, key: string, name: string }>> {
    const res = await api<{ data: Array<{ id: number, key: string, name: string }> }>('/workflow/definitions/active')

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

  async function createDefinition(payload: WorkflowDefinitionPayload) {
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

  async function fetchBindingsCoverage(): Promise<WorkflowBindingCoverageRow[]> {
    const res = await api<{ data: WorkflowBindingCoverageRow[] }>('/workflow/bindings-coverage')

    return res.data
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

  async function fetchTaskCollaborators(taskId: number): Promise<{
    data: WorkflowTaskCollaboratorRow[]
    meta: WorkflowCollaboratorsSummary
  }> {
    return await api(`/workflow/tasks/${taskId}/collaborators`)
  }

  async function inviteTaskCollaborator(
    taskId: number,
    payload: {
      user_id: number
      org_unit_id?: number | null
      org_position_id?: number | null
      request_note?: string | null
    },
  ): Promise<WorkflowTaskCollaboratorRow> {
    const res = await api<{ data: WorkflowTaskCollaboratorRow, message: string }>(
      `/workflow/tasks/${taskId}/collaborators`,
      { method: 'POST', body: payload },
    )

    return res.data
  }

  async function removeTaskCollaborator(taskId: number, collaboratorId: number): Promise<void> {
    await api(`/workflow/tasks/${taskId}/collaborators/${collaboratorId}`, { method: 'DELETE' })
  }

  async function fetchMyCollaborations(status?: 'pending' | 'responded'): Promise<WorkflowTaskCollaboratorRow[]> {
    const query: Record<string, string> = {}
    if (status) {
      query.status = status
    }

    const res = await api<{ data: WorkflowTaskCollaboratorRow[] }>('/workflow/collaborations/mine', { query })

    return res.data
  }

  async function fetchMyPendingCollaborations(): Promise<WorkflowTaskCollaboratorRow[]> {
    return fetchMyCollaborations('pending')
  }

  async function fetchCollaboration(id: number): Promise<WorkflowTaskCollaboratorRow> {
    const res = await api<{ data: WorkflowTaskCollaboratorRow }>(`/workflow/collaborations/${id}`)

    return res.data
  }

  async function respondCollaboration(id: number, formData: FormData): Promise<WorkflowTaskCollaboratorRow> {
    const res = await api<{ data: WorkflowTaskCollaboratorRow, message: string }>(
      `/workflow/collaborations/${id}/respond`,
      { method: 'POST', body: formData },
    )

    return res.data
  }

  function resolveApiBase(): string {
    const config = useRuntimeConfig()

    return String(config.public.apiBase || 'http://localhost:8585').replace(/\/$/, '')
  }

  function collaborationFileViewUrl(collaborationId: number, fileId: number): string {
    return `${resolveApiBase()}/api/workflow/collaborations/${collaborationId}/files/${fileId}`
  }

  function parseContentDispositionFilename(header: string | null): string | null {
    if (!header) {
      return null
    }

    const utfMatch = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1].trim())
      }
      catch {
        return utfMatch[1].trim()
      }
    }

    const asciiMatch = header.match(/filename\s*=\s*("(?:\\.|[^"])*"|[^;]+)/i)
    if (!asciiMatch?.[1]) {
      return null
    }

    return asciiMatch[1].replace(/^"|"$/g, '').replace(/\\"/g, '"').trim()
  }

  function openBlobInNewTab(blob: Blob, mimeType?: string, filename?: string | null): void {
    if (import.meta.server) {
      return
    }

    const type = mimeType && blob.type !== mimeType
      ? mimeType
      : (blob.type || mimeType || 'application/octet-stream')
    const safeName = filename?.trim() || ''
    const namedBlob = safeName
      ? new File([blob], safeName, { type })
      : (mimeType && blob.type !== mimeType ? new Blob([blob], { type: mimeType }) : blob)
    const objectUrl = URL.createObjectURL(namedBlob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'position:fixed;left:-9999px;top:0'

    if (safeName) {
      a.download = safeName
    }
    else {
      a.target = '_blank'
    }

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
  }

  async function fetchAuthenticatedBlob(url: string): Promise<{ blob: Blob, filename: string | null }> {
    if (import.meta.server) {
      throw new Error('No disponible en servidor.')
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    let token = match?.[1] ? decodeURIComponent(match[1]) : ''
    if (!token) {
      try {
        await $fetch('/sanctum/csrf-cookie', {
          baseURL: resolveApiBase(),
          credentials: 'include',
        })
      }
      catch {
        // ignore
      }
      const retry = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
      token = retry?.[1] ? decodeURIComponent(retry[1]) : ''
    }

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
    })

    if (!res.ok) {
      throw new Error('No se pudo obtener el archivo.')
    }

    return {
      blob: await res.blob(),
      filename: parseContentDispositionFilename(res.headers.get('Content-Disposition')),
    }
  }

  async function fetchCollaborationFile(
    collaborationId: number,
    fileId: number,
  ): Promise<{ blob: Blob, filename: string | null }> {
    return fetchAuthenticatedBlob(collaborationFileViewUrl(collaborationId, fileId))
  }

  async function viewCollaborationFileInNewTab(
    collaborationId: number,
    fileId: number,
    mimeType?: string | null,
    originalName?: string | null,
  ): Promise<void> {
    const { blob, filename } = await fetchCollaborationFile(collaborationId, fileId)
    openBlobInNewTab(blob, mimeType ?? undefined, originalName || filename)
  }

  return {
    fetchBoard,
    fetchTasks,
    fetchTask,
    advanceTask,
    returnTask,
    reassignTask,
    commentTask,
    fetchFunctionalTypes,
    fetchFilingContext,
    fetchAssignableUsers,
    fetchDefinitions,
    fetchActiveDefinitions,
    fetchDefinition,
    createDefinition,
    updateDefinition,
    createStage,
    updateStage,
    deleteStage,
    upsertBinding,
    fetchBindingsCoverage,
    fetchTaskCollaborators,
    inviteTaskCollaborator,
    removeTaskCollaborator,
    fetchMyCollaborations,
    fetchMyPendingCollaborations,
    fetchCollaboration,
    respondCollaboration,
    fetchCollaborationFile,
    viewCollaborationFileInNewTab,
  }
}
