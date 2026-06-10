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
  assigned: 'Asignación',
  sla_alert: 'Alerta SLA',
  sla_reminder: 'Recordatorio SLA',
  escalated: 'Escalamiento SLA',
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
