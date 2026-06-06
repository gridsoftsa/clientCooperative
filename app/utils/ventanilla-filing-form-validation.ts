import type { VentanillaFilingTypeValue } from '~/types/ventanilla'
import { filterDigitsOnly } from '~/utils/digits-only-input'
import {
  validateVentanillaPartyFields,
  type VentanillaPartyFieldValues,
} from '~/utils/ventanilla-party-validation'

export interface VentanillaCoreFilingFormValues {
  filingType: VentanillaFilingTypeValue
  functionalTypeKey: string
  subject: string
  producerOrgUnitId: number | null
  recipientOrgUnitId: number | null
  docDocumentTypeId: number | null
  parties: VentanillaPartyFieldValues
  metadataError?: string | null
  /** Si se indica, exige al menos un archivo adjunto (radicación manual). */
  minFileCount?: number
}

/**
 * Validación de campos obligatorios alineada con StoreVentanillaFilingRequest / ClassifyVentanillaIntakeRequest (API).
 */
export function validateVentanillaCoreFilingForm(values: VentanillaCoreFilingFormValues): string | null {
  if (!values.functionalTypeKey.trim()) {
    return 'Seleccione el tipo funcional'
  }
  if (!values.subject.trim()) {
    return 'El asunto es obligatorio'
  }
  if (values.filingType === 'incoming' && !values.recipientOrgUnitId) {
    return 'Seleccione el área destinataria'
  }
  if (values.filingType !== 'incoming' && !values.producerOrgUnitId) {
    return 'Seleccione el área productora'
  }
  if (values.filingType === 'internal' && !values.recipientOrgUnitId) {
    return 'Seleccione el área destinataria para radicado interno'
  }
  if (!values.docDocumentTypeId) {
    return 'Complete la clasificación TRD (tipo documental)'
  }
  if (values.minFileCount != null && values.minFileCount < 1) {
    return 'Adjunte al menos un archivo'
  }

  const partyError = validateVentanillaPartyFields(values.filingType, {
    senderName: values.parties.senderName?.trim() ?? '',
    senderIdentifier: filterDigitsOnly(values.parties.senderIdentifier?.trim() ?? ''),
    recipientName: values.parties.recipientName?.trim() ?? '',
    recipientIdentifier: filterDigitsOnly(values.parties.recipientIdentifier?.trim() ?? ''),
  })
  if (partyError) {
    return partyError
  }

  if (values.metadataError) {
    return values.metadataError
  }

  return null
}
