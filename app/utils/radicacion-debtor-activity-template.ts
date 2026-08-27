import type { ApplicantForm } from '~/types/credit-application'

/** Deudor marcó «Sin plantilla de actividad» en paso 2 (persistido en `financial_info`). */
export function isDebtorWithoutActivityTemplate(debtor: ApplicantForm): boolean {
  const fi = debtor.financial_info as Record<string, unknown> | undefined
  const flag = fi?.withoutActivityTemplate

  return flag === true || flag === 'true' || flag === 1
}

export function ensureDebtorFinancialInfo(debtor: ApplicantForm): Record<string, unknown> {
  if (!debtor.financial_info || typeof debtor.financial_info !== 'object') {
    debtor.financial_info = {}
  }

  return debtor.financial_info as Record<string, unknown>
}

/** Actualiza el flag; si se activa, el llamador debe vaciar plantillas (p. ej. `setActivityTemplates([])`). */
export function setDebtorWithoutActivityTemplateFlag(debtor: ApplicantForm, checked: boolean): void {
  const fi = ensureDebtorFinancialInfo(debtor)
  fi.withoutActivityTemplate = checked
}
