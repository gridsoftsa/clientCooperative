/**
 * FNG guarantee flag as single-select options (`value` in English for payloads mapping).
 */
export const RADICACION_CREDITO_GARANTIA_FNG_OPTIONS = [
  { value: 'no' as const, label: 'No' },
  { value: 'yes' as const, label: 'Sí' },
] as const

export type RadicacionCreditoGarantiaFngSelectValue = (typeof RADICACION_CREDITO_GARANTIA_FNG_OPTIONS)[number]['value']

export function creditoGarantiaFngBooleanToSelectValue(
  v: boolean | null | undefined,
): RadicacionCreditoGarantiaFngSelectValue {
  return v === true ? 'yes' : 'no'
}

export function selectValueToCreditoGarantiaFngBoolean(v: unknown): boolean {
  return v === 'yes'
}
