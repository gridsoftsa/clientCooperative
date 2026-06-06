import type { VentanillaFilingTypeValue } from '~/types/ventanilla'

export function isDigitsOnlyIdentifier(value: string): boolean {
  return /^\d+$/.test(value)
}

export interface VentanillaPartyFieldValues {
  senderName?: string
  senderIdentifier?: string
  recipientName?: string
  recipientIdentifier?: string
}

/**
 * Validación alineada con VentanillaPartyFieldRules (API).
 */
export function validateVentanillaPartyFields(
  filingType: VentanillaFilingTypeValue,
  parties: VentanillaPartyFieldValues,
): string | null {
  const senderName = parties.senderName?.trim() ?? ''
  const senderId = parties.senderIdentifier?.trim() ?? ''
  const recipientName = parties.recipientName?.trim() ?? ''
  const recipientId = parties.recipientIdentifier?.trim() ?? ''
  const needsRecipient = filingType === 'outgoing' || filingType === 'internal'

  if (!senderName) {
    return 'El nombre del remitente es obligatorio'
  }
  if (!senderId) {
    return 'La identificación del remitente es obligatoria'
  }
  if (!isDigitsOnlyIdentifier(senderId)) {
    return 'La identificación del remitente debe contener solo números'
  }

  if (needsRecipient) {
    if (!recipientName) {
      return 'El nombre del destinatario es obligatorio'
    }
    if (!recipientId) {
      return 'La identificación del destinatario es obligatoria'
    }
    if (!isDigitsOnlyIdentifier(recipientId)) {
      return 'La identificación del destinatario debe contener solo números'
    }
  }

  return null
}
