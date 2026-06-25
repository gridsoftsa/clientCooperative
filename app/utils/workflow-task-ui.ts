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
