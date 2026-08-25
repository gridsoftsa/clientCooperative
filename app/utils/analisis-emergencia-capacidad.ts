import { parseMontoCOPConSigno } from '~/composables/usePesosFormat'
import type { EmergenciaCapacidadBloque } from '~/constants/analisis-score-emergencia'

/**
 * Texto en COP (radicación o análisis), **con signo**.
 * `parsePesosInput` descarta el minus; sin signo el saldo queda positivo si ingresos disponibles es negativo.
 */
export function parsePesosFlexibleAnalisis(s: string | undefined | null): number {
  return parseMontoCOPConSigno(s)
}

/** Suma las cuotas mensuales declaradas en «Cuota entidades financieras» para esa persona. */
export function sumCuotasFinEmergencia(b: EmergenciaCapacidadBloque): number {
  return (b.cuotasFin ?? []).reduce((s, l) => s + parsePesosFlexibleAnalisis(l.cuota), 0)
}

/**
 * Total gastos efectivos en capacidad de pago:
 * total egresos desde radicación (`totalEgresos`) + suma de cuotas en otras entidades.
 */
export function totalGastosCapacidadConCuotasFin(b: EmergenciaCapacidadBloque): number {
  return parsePesosFlexibleAnalisis(b.totalEgresos) + sumCuotasFinEmergencia(b)
}
