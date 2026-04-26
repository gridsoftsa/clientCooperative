import type { EmergenciaFilaActivo, EmergenciaPersonaActivo, EmergenciaState } from '~/constants/analisis-score-emergencia'
import { formatMontoCopVista, parseMontoCop } from '~/utils/analisis-emergencia-cuota'
import { parseApplicantFinancialInfo } from '~/utils/radicacion-financial-totals'

export type ActivoPersonaKey = 'deudor' | 'codeudor1' | 'codeudor2' | 'codeudor3'

type FilaOrigen = {
  name?: string
  description?: string
  value?: number
  matricula_inmobiliaria?: string
  garantia?: boolean
}

function filasOrigen(fi: unknown, conGarantia: boolean): FilaOrigen[] {
  const f = parseApplicantFinancialInfo(fi) ?? (typeof fi === 'object' && fi !== null && !Array.isArray(fi) ? (fi as Record<string, unknown>) : null)
  if (f == null) {
    return []
  }
  const raw = f.assets
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((a): a is FilaOrigen => {
    if (a == null || typeof a !== 'object' || Array.isArray(a)) {
      return false
    }
    const g = (a as FilaOrigen).garantia
    return conGarantia ? g === true : g !== true
  }) as FilaOrigen[]
}

function numValorOrigen(v: unknown): number | null {
  if (v == null || v === '') {
    return null
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  if (typeof v === 'string' && v.trim()) {
    const p = parseMontoCop(v) ?? parseMontoCop(v.replace(/\./g, ''))
    return p
  }
  return null
}

function filaEmergenciaDesdeOrigen(a: FilaOrigen): EmergenciaFilaActivo {
  const n = numValorOrigen(a.value)
  const valor = n == null || n === 0 ? '' : formatMontoCopVista(n)
  return {
    nombre: a.name?.trim() || a.description?.trim() || '',
    valor,
    matricula: (a.matricula_inmobiliaria ?? '').trim(),
  }
}

/**
 * Rellena tablas Bienes raíces (Garantía) y Otros bienes (sin Garantía) desde el paso 3
 * (Datos financieros) de la radicación. No modifica `observaciones` en cada tabla.
 */
export function aplicarFilasActivosPersonaDesdeFinancialInfo(
  persona: EmergenciaPersonaActivo,
  fi: unknown,
): void {
  persona.bienesGarantia.filas = filasOrigen(fi, true).map(filaEmergenciaDesdeOrigen)
  persona.otrosBienes.filas = filasOrigen(fi, false).map(filaEmergenciaDesdeOrigen)
}

/**
 * Sincroniza filas de activos (no observaciones) para deudor y codeudores según `financial_info` en solicitud.
 */
export function aplicarActivosEmergenciaDesdeSolicitud(
  e: EmergenciaState,
  data: { debtor: unknown, coDebtors: Record<string, unknown>[] },
): void {
  const d = data.debtor as Record<string, unknown> | null | undefined
  aplicarFilasActivosPersonaDesdeFinancialInfo(e.activos.deudor, d?.financial_info ?? null)
  const co = data.coDebtors
  aplicarFilasActivosPersonaDesdeFinancialInfo(e.activos.codeudor1, co[0]?.financial_info ?? null)
  aplicarFilasActivosPersonaDesdeFinancialInfo(e.activos.codeudor2, co[1]?.financial_info ?? null)
  aplicarFilasActivosPersonaDesdeFinancialInfo(e.activos.codeudor3, co[2]?.financial_info ?? null)
}

/**
 * Suma unidades COP interpretando `parseMontoCop` (incl. miles de `formatMontoCopVista`).
 */
export function sumaValorFilasActivos(filas: { valor: string }[]): number {
  return filas.reduce((s, f) => s + (parseMontoCop(f.valor) ?? 0), 0)
}

export function totalUnaPersonaActivo(p: EmergenciaPersonaActivo): number {
  return sumaValorFilasActivos(p.bienesGarantia.filas) + sumaValorFilasActivos(p.otrosBienes.filas)
}

/**
 * Suma de totales parciales (Bienes raíces + Otros bienes) de cada persona listada
 * (deudor + codeudores visibles) para el campo «Total activos» global.
 */
export function totalActivosGlobalDesdeBloque(
  activos: EmergenciaState['activos'],
  personasVisibles: ActivoPersonaKey[],
): number {
  return personasVisibles.reduce((s, k) => s + totalUnaPersonaActivo(activos[k]), 0)
}

export function formatTotalActivosGlobalVista(n: number): string {
  if (!Number.isFinite(n) || n === 0) {
    return ''
  }
  return formatMontoCopVista(n)
}
