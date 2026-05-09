import type { EmergenciaState } from '~/constants/analisis-score-emergencia'
import {
  defaultEmergenciaState,
  mergeEmergenciaFromSnapshot,
} from '~/constants/analisis-score-emergencia'
import { parseMontoCop } from '~/utils/analisis-emergencia-cuota'
import { sumaValorFilasActivos, totalUnaPersonaActivo } from '~/utils/radicacion-financial-activos'

/**
 * Construye un `financial_info` solo para **vista** en análisis / SCORE: parte de la radicación
 * y aplica ajustes del analista en la hoja EMERGENCIA (activos del deudor, central de riesgos).
 * No persiste en la solicitud; la radicación sigue intacta.
 */
export function mergeFinancialInfoResumenAnalisisDeudor(
  baselineFi: Record<string, unknown>,
  emergencia: EmergenciaState,
): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(baselineFi)) as Record<string, unknown>
  const persona = emergencia.activos.deudor

  const hasFilasActivos
    = persona.bienesGarantia.filas.length > 0 || persona.otrosBienes.filas.length > 0

  if (hasFilasActivos) {
    const rowsAssets = [
      ...persona.bienesGarantia.filas.map((f) => ({
        name: f.nombre,
        description: f.nombre,
        value: parseMontoCop(f.valor) ?? 0,
        garantia: true,
        matricula_inmobiliaria: f.matricula,
      })),
      ...persona.otrosBienes.filas.map((f) => ({
        name: f.nombre,
        description: f.nombre,
        value: parseMontoCop(f.valor) ?? 0,
        garantia: false,
        matricula_inmobiliaria: f.matricula,
      })),
    ]
    out.assets = rowsAssets
  }

  const baseSol
    = typeof out.solvency === 'object' && out.solvency !== null && !Array.isArray(out.solvency)
      ? { ...(out.solvency as Record<string, unknown>) }
      : {}

  if (hasFilasActivos) {
    baseSol.assets = totalUnaPersonaActivo(persona)
  }

  /** Bien raíz (endeudamiento): solo bienes con garantía en la hoja de análisis. */
  if (persona.bienesGarantia.filas.length > 0) {
    baseSol.real_estate = sumaValorFilasActivos(persona.bienesGarantia.filas)
  }

  const tedRaw = emergencia.centralRiesgos.totalEndeudamiento.deudor
  if (typeof tedRaw === 'string' && tedRaw.trim() !== '') {
    const pasivos = parseMontoCop(tedRaw)
    if (pasivos != null && Number.isFinite(pasivos)) {
      baseSol.liabilities = pasivos
    }
  }

  out.solvency = baseSol
  return out
}

/** Métricas planas guardadas en `analisis_score_snapshot` para reportes (además del JSON `emergencia`). */
export type ResumenFinancieroDeudorAnalisisPersistido = {
  activos_total: number
  pasivos: number
  bien_raiz: number
  monto_solicitado: number
  solvencia_porciento: number | null
  endeudamiento_porciento: number | null
  computed_at: string
}

/**
 * Valores alineados con `RadicacionResumenFinancieroDeudor` usando el mismo merge que la vista de análisis.
 */
export function buildResumenFinancieroDeudorAnalisisPersistido(
  baselineFi: Record<string, unknown>,
  emergencia: EmergenciaState,
  amountRequested: number,
): ResumenFinancieroDeudorAnalisisPersistido {
  const merged = mergeFinancialInfoResumenAnalisisDeudor(baselineFi, emergencia)
  const f = merged
  const sol = (f.solvency ?? {}) as Record<string, unknown>
  const assetsArr = f.assets
  const activosSum = Array.isArray(assetsArr)
    ? assetsArr.reduce((s: number, a: { value?: unknown }) => {
      const v = (a as { value?: unknown }).value
      const n = typeof v === 'number' ? v : Number(v)
      return s + (Number.isFinite(n) ? n : 0)
    }, 0)
    : 0
  const pasivos = Number(sol.liabilities) || 0
  const bienRaiz = Number(sol.real_estate) || 0
  const activosTotalDisplay =
    typeof sol.assets === 'number' && Number.isFinite(sol.assets) ? sol.assets : activosSum
  const monto = Number(amountRequested) || 0

  let solvencia_porciento: number | null = null
  if (activosSum > 0 && monto > 0) {
    solvencia_porciento = Math.round(((pasivos + monto) / activosSum) * 100 * 100) / 100
  }

  let endeudamiento_porciento: number | null = null
  if (bienRaiz > 0 && monto > 0) {
    endeudamiento_porciento = Math.round(((pasivos + monto) / bienRaiz) * 100 * 100) / 100
  }

  return {
    activos_total: activosTotalDisplay,
    pasivos,
    bien_raiz: bienRaiz,
    monto_solicitado: monto,
    solvencia_porciento,
    endeudamiento_porciento,
    computed_at: new Date().toISOString(),
  }
}

/** Normaliza `financial_info` del solicitante (objeto o JSON string). */
export function parseFinancialInfoBaselineRecord(val: unknown): Record<string, unknown> {
  if (val == null) {
    return {}
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, unknown>
  }
  if (typeof val === 'string' && val.trim()) {
    try {
      const p = JSON.parse(val)
      return typeof p === 'object' && p !== null && !Array.isArray(p) ? p as Record<string, unknown> : {}
    }
    catch {
      return {}
    }
  }
  return {}
}

/** Métricas solo radicación (sin ajustes EMERGENCIA): mismo criterio que la tarjeta única histórica. */
export function buildResumenFinancieroDeudorSoloRadicacion(
  baselineFi: Record<string, unknown>,
  amountRequested: number,
): ResumenFinancieroDeudorAnalisisPersistido {
  return buildResumenFinancieroDeudorAnalisisPersistido(
    baselineFi,
    defaultEmergenciaState(),
    amountRequested,
  )
}

function numLoose(v: unknown): number {
  if (v == null || v === '') {
    return 0
  }
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizePersistidoApi(raw: Record<string, unknown>): ResumenFinancieroDeudorAnalisisPersistido {
  const sn = raw.solvencia_porciento
  const en = raw.endeudamiento_porciento
  return {
    activos_total: numLoose(raw.activos_total),
    pasivos: numLoose(raw.pasivos),
    bien_raiz: numLoose(raw.bien_raiz),
    monto_solicitado: numLoose(raw.monto_solicitado),
    solvencia_porciento: sn === null || sn === undefined || sn === '' ? null : numLoose(sn),
    endeudamiento_porciento: en === null || en === undefined || en === '' ? null : numLoose(en),
    computed_at: typeof raw.computed_at === 'string' ? raw.computed_at : '',
  }
}

/**
 * `financial_info` mínimo para la tarjeta cuando solo existe el bloque plano persistido (sin JSON emergencia).
 */
export function financialInfoSinteticoDesdePersistido(p: ResumenFinancieroDeudorAnalisisPersistido): Record<string, unknown> {
  const at = p.activos_total
  return {
    assets: [{ value: at, name: 'Total activos (análisis)', garantia: false }],
    solvency: {
      liabilities: p.pasivos,
      real_estate: p.bien_raiz,
      assets: at,
    },
  }
}

/**
 * Métricas del análisis desde snapshot API; prioriza el bloque plano guardado al persistir.
 */
export function resumenFinancieroDeudorMetricsDesdeSnapshot(
  baselineFi: Record<string, unknown>,
  amountRequested: number,
  snapshot: Record<string, unknown> | null | undefined,
): ResumenFinancieroDeudorAnalisisPersistido | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null
  }
  const flat = snapshot.resumen_financiero_deudor_analisis
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) {
    return normalizePersistidoApi(flat as Record<string, unknown>)
  }
  const em = snapshot.emergencia
  if (em && typeof em === 'object') {
    const state = mergeEmergenciaFromSnapshot(em)
    return buildResumenFinancieroDeudorAnalisisPersistido(baselineFi, state, amountRequested)
  }
  return null
}

const EPS = 1e-2

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS
}

function nearNull(a: number | null, b: number | null): boolean {
  if (a == null && b == null) {
    return true
  }
  if (a != null && b != null) {
    return near(a, b)
  }
  return false
}

export function areResumenFinancieroDeudorMetricsEqual(
  a: ResumenFinancieroDeudorAnalisisPersistido,
  b: ResumenFinancieroDeudorAnalisisPersistido,
): boolean {
  return (
    near(a.activos_total, b.activos_total)
    && near(a.pasivos, b.pasivos)
    && near(a.bien_raiz, b.bien_raiz)
    && near(a.monto_solicitado, b.monto_solicitado)
    && nearNull(a.solvencia_porciento, b.solvencia_porciento)
    && nearNull(a.endeudamiento_porciento, b.endeudamiento_porciento)
  )
}
