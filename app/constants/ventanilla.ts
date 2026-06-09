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

export function ventanillaTrafficLightBadgeVariant(
  status: VentanillaTrafficLightValue | null | undefined,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'red') {
    return 'destructive'
  }
  if (status === 'orange') {
    return 'secondary'
  }

  return 'default'
}
