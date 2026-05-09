import type { ApplicantForm } from '~/types/credit-application'
import { validateColombianDocumentNumber } from '~/utils/colombian-document-number'

export type ApplicantMinimalDraftRole = 'debtor' | 'co_debtor'

/**
 * Validación única para «Guardar borrador»: documento (tipo + número) y primer nombre/apellido del aplicante.
 *
 * @returns Mensaje de error en español o null si cumple.
 */
export function validateApplicantMinimalIdentityForDraftSave(
  applicant: ApplicantForm,
  role: ApplicantMinimalDraftRole = 'debtor',
): string | null {
  const typeOk = !!applicant.document_type?.trim()
  const numOk = !!applicant.document_number?.trim()
  const namesOk = !!applicant.first_name?.trim() && !!applicant.first_last_name?.trim()
  if (!typeOk || !numOk || !namesOk) {
    const who =
      role === 'co_debtor'
        ? 'del codeudor'
        : 'del solicitante'
    return `Para guardar el borrador, indique tipo y número de documento y el primer nombre y primer apellido ${who}.`
  }
  return validateColombianDocumentNumber(applicant.document_type ?? '', applicant.document_number ?? '')
}

/**
 * @deprecated Prefer {@link validateApplicantMinimalIdentityForDraftSave} with role `debtor`; kept for call sites that only refer to the debtor.
 */
export function validateDebtorMinimalIdentityForDraftSave(debtor: ApplicantForm): string | null {
  return validateApplicantMinimalIdentityForDraftSave(debtor, 'debtor')
}
