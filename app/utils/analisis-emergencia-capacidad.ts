import { parsePesosInput } from '~/composables/usePesosFormat'
import type { EmergenciaCapacidadBloque } from '~/constants/analisis-score-emergencia'
import { parseMontoCop } from '~/utils/analisis-emergencia-cuota'

/**
 * Mismo criterio que `AnalisisEmergenciaForm`: texto en COP (radicación o análisis).
 */
export function parsePesosFlexibleAnalisis(s: string | undefined | null): number {
  if (s == null) {
    return 0
  }
  const t = String(s).trim()
  if (!t) {
    return 0
  }
  const p = parsePesosInput(t)
  if (p !== undefined) {
    return p
  }
  const m = parseMontoCop(t)
  return m ?? 0
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
