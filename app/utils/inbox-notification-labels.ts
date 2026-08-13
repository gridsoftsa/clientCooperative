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
