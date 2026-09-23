import type {
  VentanillaFilingStatusValue,
  VentanillaFilingTypeValue,
  VentanillaTrafficLightValue,
} from '~/types/ventanilla'

export const VENTANILLA_FILING_TYPE_LABELS: Record<VentanillaFilingTypeValue, string> = {
  incoming: 'Entrada',
  outgoing: 'Salida',
  internal: 'Interna',
}

export const VENTANILLA_FILING_STATUS_LABELS: Record<VentanillaFilingStatusValue, string> = {
  registered: 'Registrado',
  in_progress: 'En gestión',
  closed: 'Cerrado',
  voided: 'Anulado',
}

export const VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY = 'informative'

/** IMAP / ingesta automática por correo (pantalla `/ventanilla/canales`). */
export const VENTANILLA_AUTOMATIC_CHANNELS_ENABLED = false

export const VENTANILLA_INFORMATIVE_TYPE_HINT
  = 'Documento informativo: no aplica SLA ni obligación de respuesta. Puede cerrarse desde la gestión del radicado.'

export const VENTANILLA_TRAFFIC_LIGHT_LABELS: Record<VentanillaTrafficLightValue, string> = {
  green: 'En término',
  orange: 'Próximo a vencer',
  red: 'Vencido',
}

export const VENTANILLA_NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  email: 'Correo',
  whatsapp: 'WhatsApp',
  internal: 'Interno',
}

export const VENTANILLA_NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  registered: 'Radicación',
  assigned: 'Asignación',
  responded: 'Respuesta al interesado',
  sla_alert: 'Alerta SLA',
  sla_reminder: 'Recordatorio SLA',
  escalated: 'Escalamiento SLA',
  workflow_task_assigned: 'Tarea workflow',
  workflow_sla_alert: 'Alerta SLA etapa',
  workflow_sla_reminder: 'Recordatorio SLA etapa',
  workflow_escalated: 'Escalamiento SLA etapa',
}

export function ventanillaTrafficLightBadgeVariant(
  status: VentanillaTrafficLightValue | null | undefined,
): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' {
  if (status === 'red') {
    return 'destructive'
  }
  if (status === 'orange') {
    return 'warning'
  }

  if (status === 'green') {
    return 'outline'
  }

  return 'default'
}

export function ventanillaTrafficLightBadgeClass(
  status: VentanillaTrafficLightValue | null | undefined,
): string {
  if (status === 'green') {
    return 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
  }

  return ''
}

/** Fondo de fila de listados según semáforo SLA (no solo la columna). */
export function ventanillaTrafficLightRowClass(
  status: VentanillaTrafficLightValue | null | undefined,
  requiresResponse?: boolean,
): string {
  if (requiresResponse === false || !status) {
    return ''
  }

  if (status === 'red') {
    return 'border-l-4 border-l-red-600 bg-red-500/12 hover:bg-red-500/18 dark:bg-red-950/40 dark:hover:bg-red-950/55'
  }

  if (status === 'orange') {
    return 'border-l-4 border-l-amber-500 bg-amber-500/12 hover:bg-amber-500/18 dark:bg-amber-950/40 dark:hover:bg-amber-950/55'
  }

  return 'border-l-4 border-l-emerald-600 bg-emerald-500/12 hover:bg-emerald-500/18 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/50'
}
