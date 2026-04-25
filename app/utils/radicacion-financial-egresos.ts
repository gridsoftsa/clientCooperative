import { formatPesos } from '~/composables/usePesosFormat'
import type { EmergenciaCapacidadBloque } from '~/constants/analisis-score-emergencia'
import { parseApplicantFinancialInfo } from '~/utils/radicacion-financial-totals'

function num(v: unknown): number {
  if (v == null || v === '') {
    return 0
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  const t = String(v).trim()
  if (!t) {
    return 0
  }
  const parsed = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Formato COP como en el paso 3 (Datos financieros) de radicación. */
function formatGastoPesos(val: unknown): string {
  const n = num(val)
  if (n === 0 && (val == null || val === '')) {
    return ''
  }
  return formatPesos(n)
}

/**
 * Misma suma de gastos que el total mostrado en `ApplicantFormFields` (tabla de gastos).
 */
function totalGastosDesdeLineas(
  e: {
    personal?: unknown
    food?: unknown
    rent?: unknown
    health?: unknown
    pension?: unknown
    arl?: unknown
    other?: unknown
  },
): number {
  return (
    num(e.personal)
    + num(e.food)
    + num(e.rent)
    + num(e.health)
    + num(e.pension)
    + num(e.arl)
    + num(e.other)
  )
}

/**
 * Rellena los campos de gastos del bloque de capacidad EMERGENCIA
 * a partir de `financial_info` del solicitante (paso 3 radicación). Solo lectura en análisis.
 */
export function aplicarEgresosCapacidadBloqueDesdeFinancialInfo(
  b: EmergenciaCapacidadBloque,
  fi: unknown,
): void {
  const f = parseApplicantFinancialInfo(fi) ?? (typeof fi === 'object' && fi !== null && !Array.isArray(fi) ? (fi as Record<string, unknown>) : null)
  if (f == null) {
    b.gastoPersonal = ''
    b.alimentacion = ''
    b.gastosServiciosArriendo = ''
    b.arriendo = ''
    b.serviciosPublicos = ''
    b.gastoSalud = ''
    b.gastoPension = ''
    b.gastoArl = ''
    b.otrosGastos = ''
    b.totalEgresos = ''
    b.egresosDescripcion = ''
    return
  }
  const ex = f.expenses
  if (ex == null || typeof ex !== 'object' || Array.isArray(ex)) {
    b.gastoPersonal = ''
    b.alimentacion = ''
    b.gastosServiciosArriendo = ''
    b.arriendo = ''
    b.serviciosPublicos = ''
    b.gastoSalud = ''
    b.gastoPension = ''
    b.gastoArl = ''
    b.otrosGastos = ''
    b.totalEgresos = ''
    b.egresosDescripcion = ''
    return
  }
  const e = ex as Record<string, unknown>
  b.gastoPersonal = formatGastoPesos(e.personal)
  b.alimentacion = formatGastoPesos(e.food)
  b.gastosServiciosArriendo = formatGastoPesos(e.rent)
  b.arriendo = ''
  b.serviciosPublicos = ''
  b.gastoSalud = formatGastoPesos(e.health)
  b.gastoPension = formatGastoPesos(e.pension)
  b.gastoArl = formatGastoPesos(e.arl)
  b.otrosGastos = formatGastoPesos(e.other)
  if (e.total != null && e.total !== '' && (typeof e.total === 'number' || typeof e.total === 'string')) {
    b.totalEgresos = formatGastoPesos(e.total)
  }
  else {
    b.totalEgresos = formatPesos(totalGastosDesdeLineas(e))
  }
  b.egresosDescripcion = typeof e.description === 'string' ? e.description : ''
}
