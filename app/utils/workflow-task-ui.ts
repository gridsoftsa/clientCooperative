export function extractApiErrorMessage(error: unknown, fallback = 'No se pudo completar la acción.'): string {
  const err = error as {
    data?: {
      message?: string
      errors?: Record<string, string[] | string>
    }
  }

  const taskError = err?.data?.errors?.task
  if (Array.isArray(taskError) && taskError[0]) {
    return taskError[0]
  }
  if (typeof taskError === 'string' && taskError) {
    return taskError
  }

  if (err?.data?.message) {
    return err.data.message
  }

  return fallback
}

export function isOpenWorkflowTaskStatus(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress'
}

export function workflowTaskAllowsActions(
  task: { can_act?: boolean, assignee?: { id: number } | null } | null | undefined,
  userId?: number | null,
): boolean {
  if (task?.can_act === true) {
    return true
  }

  if (task?.can_act === false) {
    return false
  }

  return task?.assignee?.id != null && userId != null && task.assignee.id === userId
}
