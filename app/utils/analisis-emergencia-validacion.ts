/**
 * Requisitos mínimos de la hoja EMERGENCIA (paso 2) y tipo de cuota (paso 1)
 * para guardar con el SCORE o avanzar al paso 3.
 */
import type { EmergenciaState } from '~/constants/analisis-score-emergencia'
import { parseMontoCop, parseNumeroFlexible } from '~/utils/analisis-emergencia-cuota'

function tipoValorCuotaValido(t: EmergenciaState['credito']['tipoValorCuota']): boolean {
  return t === 'Corriente' || t === 'Emergencia'
}

/**
 * Tipo de valor de cuota (paso 1): obligatorio antes de análisis coherente.
 */
export function validarTipoValorCuotaPaso1(
  tipo: EmergenciaState['credito']['tipoValorCuota'],
): { ok: true } | { ok: false, mensaje: string } {
  if (tipoValorCuotaValido(tipo)) {
    return { ok: true }
  }
  return { ok: false, mensaje: 'Seleccione el tipo de valor de cuota (Corriente o Emergencia) en el paso 1.' }
}

/**
 * Crédito + cuota: obligatorios para guardar EMERGENCIA/SCORE con datos consistentes.
 */
export function validarCreditoEmergenciaCompleto(
  c: EmergenciaState['credito'],
): { ok: true } | { ok: false, errores: string[] } {
  const errores: string[] = []

  if (!tipoValorCuotaValido(c.tipoValorCuota)) {
    errores.push('Seleccione el tipo de valor de cuota (Corriente o Emergencia) en el paso 1.')
  }

  const monto = parseMontoCop(c.vrCredito)
  if (monto == null || monto <= 0) {
    errores.push('Indique un valor de crédito (COP) mayor a cero (en la solicitud o en información de crédito).')
  }

  const plazo = parseNumeroFlexible(String(c.plazoMeses ?? '').trim())
  if (plazo == null || plazo < 1 || !Number.isInteger(plazo)) {
    errores.push('Indique un plazo en meses (entero, mayor o igual a 1).')
  }

  if (!String(c.garantia ?? '').trim()) {
    errores.push('Seleccione la garantía (información de crédito).')
  }

  const tasa = parseNumeroFlexible(String(c.tasaNominal ?? '').trim())
  if (tasa == null) {
    errores.push('Ingrese la tasa nominal anual (%).')
  }
  else if (tasa < 0) {
    errores.push('La tasa nominal no puede ser negativa.')
  }

  const cuota = parseMontoCop(c.vrCuotaVar)
  if (cuota == null || cuota <= 0) {
    errores.push('El Vr. cuota var. (COP) debe quedar completo; revise tasa, plazo y monto, o rellene el valor.')
  }

  if (errores.length) {
    return { ok: false, errores }
  }
  return { ok: true }
}

export function descripcionErroresAdicionales(errores: string[], maxDetalle = 3): string | undefined {
  if (errores.length <= 1) {
    return undefined
  }
  const n = errores.length - 1
  const det = errores.slice(1, 1 + maxDetalle).join(' · ')
  if (n > maxDetalle) {
    return `${det} (${n - maxDetalle} más).`
  }
  return det
}
