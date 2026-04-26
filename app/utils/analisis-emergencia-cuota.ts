/**
 * Cálculo de Vr. cuota var. (hoja EMERGENCIA) según tipo de valor de cuota.
 * `tasaNominal` y `tasaEfectiva` en **porcentaje** (pantalla). El cálculo de cuota usa siempre
 * `i = (tasa nominal % / 12) / 100` con precisión de número (no el texto mostrado de tasa/efectivo).
 */

/** Meses del año (denominador para pasar tasa nominal anual a periodo mensual). */
export const MESES_ANO = 12

export type TipoValorCuota = '' | 'Corriente' | 'Emergencia'

/** Valores en UI y en snapshot (Paso 1). */
export const TIPO_VALOR_CUOTA_OPCIONES: Array<'Corriente' | 'Emergencia'> = ['Corriente', 'Emergencia']

/**
 * Acepta formato es-CO (p. ej. 200.000.000) y decimales con coma o con punto (0,02 / 0.02).
 */
/**
 * Formato colombiano con punto como **separador de miles** (p. ej. 700.000, 50.000.000).
 * Debe resolverse antes de tomar un único «p.000» por decimal, porque
 * `Number("700.000")` en JS devuelve 700 y al sumar con 50.000.000 da 50.000.700.
 */
const NUMERO_SOLO_MILES_PUNTOS_ES_CO = /^\d{1,3}(\.\d{3})+$/u

export function parseNumeroFlexible(s: string): number | null {
  const t = s.trim().replace(/%+\s*$/u, '').trim()
  if (!t) {
    return null
  }
  if (NUMERO_SOLO_MILES_PUNTOS_ES_CO.test(t)) {
    const n = Number(t.replace(/\./g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (!t.includes(',') && /^\d+\.\d+$/.test(t)) {
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  const sinMiles = t.replace(/\./g, '')
  const conPunto = sinMiles.replace(',', '.')
  const n = Number(conPunto)
  return Number.isFinite(n) ? n : null
}

/**
 * Interpreta cadenas con símbolo $ y/o «COP» (monto en pesos) además de miles con punto.
 */
export function parseMontoCop(s: string): number | null {
  const t0 = s.trim()
  if (!t0) {
    return null
  }
  const t = t0
    .replace(/^\$?\s*/u, '')
    .replace(/COP/ig, '')
    .replace(/[\s\u00a0\u202f]+/g, '')
    .trim()
  return parseNumeroFlexible(t)
}

/** Muestra monto en COP **sin centavos** (peso entero, redondeado). */
export function formatMontoCopVista(n: number): string {
  const r = Math.round(n)
  return r.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
}

/**
 * Texto de **pantalla** de tasa/periodo: nominal/12, máx. 2 decimales. No se usa en fórmulas.
 */
export function tasaEfectivaPorcentajeDesdeNominal(nominalAnualPorc: string): string {
  const p = parseNumeroFlexible(nominalAnualPorc)
  if (p == null) {
    return ''
  }
  return (p / MESES_ANO).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

/** tasa mensual en tanto por uno, precisión plena, desde nominal anual (%) sin redondeo previo. */
export function tasaMensualTantoPorUnoDesdeNominal(nominalAnualPorc: string): number | null {
  const p = parseNumeroFlexible(nominalAnualPorc)
  if (p == null) {
    return null
  }
  return (p / MESES_ANO) / 100
}

/**
 * Corriente: (P * i) / (1 - (1/(1+i))^n)
 */
export function vrCuotaCorriente(P: number, i: number, nMeses: number): number | null {
  if (!Number.isFinite(P) || !Number.isFinite(i) || !Number.isFinite(nMeses)) {
    return null
  }
  if (P < 0 || nMeses <= 0) {
    return null
  }
  if (i < 0) {
    return null
  }
  if (i === 0) {
    return nMeses > 0 ? P / nMeses : null
  }
  const denom = 1 - (1 / (1 + i)) ** nMeses
  if (denom === 0 || !Number.isFinite(denom)) {
    return null
  }
  return (P * i) / denom
}

/**
 * Emergencia: P * i
 */
export function vrCuotaEmergencia(P: number, i: number): number | null {
  if (!Number.isFinite(P) || !Number.isFinite(i)) {
    return null
  }
  if (P < 0 || i < 0) {
    return null
  }
  return P * i
}

/**
 * Asigna `vrCuotaVar` formateado en COP (sin centavos en pantalla). `i` sale de la nominal, no de la
 * tasa/efectivo mostrada a 2 decimales.
 */
export function actualizarVrCuotaVarDesdeInputs(input: {
  tipoValorCuota: TipoValorCuota
  vrCredito: string
  plazoMeses: string
  tasaNominal: string
}): string {
  const { tipoValorCuota, vrCredito, plazoMeses, tasaNominal } = input
  if (tipoValorCuota !== 'Corriente' && tipoValorCuota !== 'Emergencia') {
    return ''
  }
  const P = parseMontoCop(vrCredito)
  const i = tasaMensualTantoPorUnoDesdeNominal(tasaNominal)
  if (P == null || i == null) {
    return ''
  }
  if (tipoValorCuota === 'Emergencia') {
    const v = vrCuotaEmergencia(P, i)
    return v == null ? '' : formatMontoCopVista(v)
  }
  const n = parseNumeroFlexible(plazoMeses)
  if (n == null || n <= 0) {
    return ''
  }
  const v = vrCuotaCorriente(P, i, n)
  return v == null ? '' : formatMontoCopVista(v)
}
