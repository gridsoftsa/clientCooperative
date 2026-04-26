/**
 * Requisitos mínimos de la hoja EMERGENCIA (paso 2) y tipo de cuota (paso 1)
 * para guardar con el SCORE o avanzar al paso 3.
 */
import type { EmergenciaState } from '~/constants/analisis-score-emergencia'
import { parseMontoCop, parseNumeroFlexible } from '~/utils/analisis-emergencia-cuota'

/**
 * Campos con validación mínima (crédito + cuota) para resaltar y hacer foco en UI.
 * `tipoValorCuota` vive en el paso 1, no en el formulario EMERGENCIA.
 */
export type EmergenciaCreditoCampoValidacion
  = 'tipoValorCuota'
  | 'vrCredito'
  | 'plazoMeses'
  | 'garantia'
  | 'tasaNominal'
  | 'vrCuotaVar'

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
): { ok: true } | { ok: false, errores: string[], campos: EmergenciaCreditoCampoValidacion[] } {
  const errores: string[] = []
  const campos: EmergenciaCreditoCampoValidacion[] = []

  if (!tipoValorCuotaValido(c.tipoValorCuota)) {
    errores.push('Seleccione el tipo de valor de cuota (Corriente o Emergencia) en el paso 1.')
    campos.push('tipoValorCuota')
  }

  const monto = parseMontoCop(c.vrCredito)
  if (monto == null || monto <= 0) {
    errores.push('Indique un valor de crédito (COP) mayor a cero (en la solicitud o en información de crédito).')
    campos.push('vrCredito')
  }

  const plazo = parseNumeroFlexible(String(c.plazoMeses ?? '').trim())
  if (plazo == null || plazo < 1 || !Number.isInteger(plazo)) {
    errores.push('Indique un plazo en meses (entero, mayor o igual a 1).')
    campos.push('plazoMeses')
  }

  if (!String(c.garantia ?? '').trim()) {
    errores.push('Seleccione la garantía (información de crédito).')
    campos.push('garantia')
  }

  const tasa = parseNumeroFlexible(String(c.tasaNominal ?? '').trim())
  if (tasa == null) {
    errores.push('Ingrese la tasa nominal anual (%).')
    campos.push('tasaNominal')
  }
  else if (tasa < 0) {
    errores.push('La tasa nominal no puede ser negativa.')
    campos.push('tasaNominal')
  }

  const cuota = parseMontoCop(c.vrCuotaVar)
  if (cuota == null || cuota <= 0) {
    errores.push('El Vr. cuota var. (COP) debe quedar completo; revise tasa, plazo y monto, o rellene el valor.')
    campos.push('vrCuotaVar')
  }

  if (errores.length) {
    return { ok: false, errores, campos }
  }
  return { ok: true }
}

/** `id` del control enfocable (o contenedor) en el DOM. */
export const EMERGENCIA_CREDITO_CAMPO_AL_ELEMENTO: Record<EmergenciaCreditoCampoValidacion, string> = {
  tipoValorCuota: 'as-tipo-vc',
  vrCredito: 'emg-vc',
  plazoMeses: 'emg-plz',
  garantia: 'emg-gar',
  tasaNominal: 'emg-tn',
  vrCuotaVar: 'emg-vcv',
}

/**
 * Enfoca el control asociado a un campo (input dentro de multiselect o el propio elemento).
 * Devuelve true si pudo poner el foco.
 */
export function enfocarEmergenciaCreditoCampo(campo: EmergenciaCreditoCampoValidacion): boolean {
  const id = EMERGENCIA_CREDITO_CAMPO_AL_ELEMENTO[campo]
  if (!id) {
    return false
  }
  const el = document.getElementById(id)
  if (!el) {
    return false
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    el.focus()
    return true
  }
  const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
  if (input) {
    input.focus()
    return true
  }
  (el as HTMLElement).focus()
  return true
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
