import { formatPesos, parseMontoCOPConSigno } from '~/composables/usePesosFormat'
import type { EmergenciaCapacidadBloque, EmergenciaState } from '~/constants/analisis-score-emergencia'

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

/** `formatPesos` asume no negativos; aquí hace falta el signo y miles en COP. */
function formatPesosDiferencia(n: number): string {
  if (!Number.isFinite(n)) {
    return ''
  }
  if (n === 0) {
    return '0'
  }
  const sign = n < 0 ? '-' : ''
  return sign + formatPesos(Math.abs(n))
}

function syncTotalIngresosBloque(b: EmergenciaCapacidadBloque): void {
  const ing = parsePesosFlexibleAnalisis(b.ingresos)
  const otr = parsePesosFlexibleAnalisis(b.otrosIngresos)
  const noSust = parsePesosFlexibleAnalisis(b.unsustainedIncome)
  const rawTotal = ing + otr - noSust
  const sum = Math.max(0, rawTotal)
  const allBlank = !String(b.ingresos ?? '').trim()
    && !String(b.otrosIngresos ?? '').trim()
    && !String(b.unsustainedIncome ?? '').trim()
  if (sum === 0 && allBlank) {
    b.totalIngresos = ''
  }
  else {
    b.totalIngresos = formatPesos(sum)
  }
}

function syncIngresosDisponiblesBloque(b: EmergenciaCapacidadBloque): void {
  const noTi = !String(b.totalIngresos ?? '').trim()
  const te = totalGastosCapacidadConCuotasFin(b)
  if (noTi && te === 0) {
    b.ingDisponibles = ''
    return
  }
  const ti = parsePesosFlexibleAnalisis(b.totalIngresos)
  b.ingDisponibles = formatPesosDiferencia(ti - te)
}

function syncReservaSobreIngresoBloque(b: EmergenciaCapacidadBloque, pct: number): void {
  const p = Number.isFinite(pct) && pct >= 0 ? pct : 0
  if (!String(b.ingDisponibles ?? '').trim()) {
    b.reservaSobreIngreso = ''
    return
  }
  const id = parsePesosFlexibleAnalisis(b.ingDisponibles)
  const val = Math.abs(id) * (p / 100)
  b.reservaSobreIngreso = formatPesosDiferencia(val)
}

function syncSaldoBloque(b: EmergenciaCapacidadBloque, vrCuotaVar: string): void {
  if (!String(b.ingDisponibles ?? '').trim()) {
    b.saldo = ''
    return
  }
  const id = parsePesosFlexibleAnalisis(b.ingDisponibles)
  const res = parsePesosFlexibleAnalisis(b.reservaSobreIngreso)
  const vc = parsePesosFlexibleAnalisis(vrCuotaVar)
  b.saldo = formatPesosDiferencia(id - res - vc)
}

/**
 * Recalcula total ingresos, ingresos disponibles, reserva ING, valor cuota y saldo
 * a partir de ingresos/gastos/cuotas vigentes. No debe reutilizar cifras de un snapshot anterior.
 */
export function recalcularCapacidadPagoDerivados(
  state: EmergenciaState,
  opts?: { pctReservaDeudor?: number, pctReservaCodeudor?: number },
): void {
  const pd = opts?.pctReservaDeudor ?? 30
  const pc = opts?.pctReservaCodeudor ?? 10
  const bloques: EmergenciaCapacidadBloque[] = [
    state.capacidadBloque1.a,
    state.capacidadBloque1.b,
    state.capacidadBloque2.a,
    state.capacidadBloque2.b,
  ]
  for (const b of bloques) {
    syncTotalIngresosBloque(b)
  }
  for (const b of bloques) {
    syncIngresosDisponiblesBloque(b)
  }
  syncReservaSobreIngresoBloque(state.capacidadBloque1.a, pd)
  syncReservaSobreIngresoBloque(state.capacidadBloque1.b, pc)
  syncReservaSobreIngresoBloque(state.capacidadBloque2.a, pc)
  syncReservaSobreIngresoBloque(state.capacidadBloque2.b, pc)
  const v = state.credito.vrCuotaVar
  for (const b of bloques) {
    b.valorCuota = v
    syncSaldoBloque(b, v)
  }
}
