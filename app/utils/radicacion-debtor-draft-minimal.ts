import type { ApplicantForm } from '~/types/credit-application'
import { validateColombianDocumentNumber } from '~/utils/colombian-document-number'

/**
 * Validación única para «Guardar borrador»: documento (tipo + número) y primer nombre/apellido del deudor.
 *
 * @returns Mensaje de error en español o null si cumple.
 */
export function validateDebtorMinimalIdentityForDraftSave(debtor: ApplicantForm): string | null {
  const typeOk = !!debtor.document_type?.trim()
  const numOk = !!debtor.document_number?.trim()
  const namesOk = !!debtor.first_name?.trim() && !!debtor.first_last_name?.trim()
  if (!typeOk || !numOk || !namesOk) {
    return 'Para guardar el borrador, indique tipo y número de documento y el primer nombre y primer apellido del solicitante.'
  }
  return validateColombianDocumentNumber(debtor.document_type ?? '', debtor.document_number ?? '')
}
