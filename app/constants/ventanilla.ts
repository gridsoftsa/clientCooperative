import type { VentanillaFilingTypeValue, VentanillaTrafficLightValue } from '~/types/ventanilla'

export const VENTANILLA_FILING_TYPE_LABELS: Record<VentanillaFilingTypeValue, string> = {
  incoming: 'Entrada',
  outgoing: 'Salida',
  internal: 'Interna',
}

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
