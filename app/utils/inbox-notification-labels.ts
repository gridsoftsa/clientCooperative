export function inboxNotificationModuleLabel(module?: string | null): string {
  if (module === 'comunicados') {
    return 'Comunicados'
  }

  if (module === 'ventanilla') {
    return 'Ventanilla'
  }

  if (module === 'workflow') {
    return 'Workflow'
  }

  return 'Sistema'
}

export function inboxNotificationModuleIcon(module?: string | null): string {
  if (module === 'comunicados') {
    return 'i-lucide-megaphone'
  }

  if (module === 'ventanilla') {
    return 'i-lucide-inbox'
  }

  if (module === 'workflow') {
    return 'i-lucide-git-branch'
  }

  return 'i-lucide-bell'
}

export function inboxNotificationModuleTone(module?: string | null): string {
  if (module === 'comunicados') {
    return 'bg-emerald-500/10 text-emerald-800 ring-emerald-500/15 dark:text-emerald-200'
  }

  if (module === 'ventanilla') {
    return 'bg-sky-500/10 text-sky-800 ring-sky-500/15 dark:text-sky-200'
  }

  if (module === 'workflow') {
    return 'bg-violet-500/10 text-violet-800 ring-violet-500/15 dark:text-violet-200'
  }

  return 'bg-muted text-muted-foreground ring-border/60'
}

export function inboxNotificationOpenAction(row: {
  module?: string | null
  ventanilla_filing_id?: number | null
  communication_id?: number | null
}): { label: string | null, title: string } {
  if (row.ventanilla_filing_id || row.module === 'ventanilla') {
    return { label: 'Abrir radicado', title: 'Abrir radicado' }
  }

  if (row.communication_id || row.module === 'comunicados') {
    return { label: 'Abrir comunicado', title: 'Abrir comunicado' }
  }

  if (row.module === 'workflow') {
    return { label: 'Abrir tarea', title: 'Abrir tarea' }
  }

  return { label: null, title: 'Abrir' }
}

export function inboxNotificationEventLabel(eventType?: string | null): string | null {
  if (!eventType) {
    return null
  }

  const labels: Record<string, string> = {
    published: 'Nueva publicación',
    read_reminder: 'Recordatorio de lectura',
    registered: 'Radicado registrado',
    registered_confirmation: 'Confirmación de radicación',
    assigned: 'Radicado asignado',
    responded: 'Respuesta al interesado',
    sender_notified: 'Correo al interesado',
    sla_alert: 'Alerta SLA',
    sla_reminder: 'Recordatorio SLA',
    escalated: 'Escalamiento',
    workflow_task_assigned: 'Tarea de workflow',
    task_collaborator_invited: 'Colaboración solicitada',
    workflow_sla_alert: 'Alerta SLA de etapa',
    workflow_sla_reminder: 'Recordatorio SLA de etapa',
    workflow_escalated: 'Escalamiento de etapa',
  }

  return labels[eventType] ?? eventType.replaceAll('_', ' ')
}

export function inboxNotificationRelativeTime(value?: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) {
    return 'Ahora'
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute)

    return `Hace ${minutes} min`
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour)

    return `Hace ${hours} h`
  }

  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day)

    return days === 1 ? 'Ayer' : `Hace ${days} días`
  }

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
