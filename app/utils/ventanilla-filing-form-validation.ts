import type { VentanillaFilingTypeValue } from '~/types/ventanilla'
import { filterDigitsOnly } from '~/utils/digits-only-input'
import {
  isDigitsOnlyIdentifier,
  validateVentanillaPartyFields,
  type VentanillaPartyFieldValues,
} from '~/utils/ventanilla-party-validation'

export type VentanillaFilingFieldKey =
  | 'functional_type'
  | 'recipient_org_unit'
  | 'producer_org_unit'
  | 'sender_staff'
  | 'recipient_staff'
  | 'sender_name'
  | 'sender_identifier'
  | 'recipient_name'
  | 'recipient_identifier'
  | 'subject'
  | 'trd_document_type'
  | 'metadata'
  | 'file'

export const VENTANILLA_FILING_FIELD_IDS: Record<VentanillaFilingFieldKey, string> = {
  functional_type: 'ventanilla_functional_type',
  recipient_org_unit: 'ventanilla_recipient_org_unit',
  producer_org_unit: 'ventanilla_producer_org_unit',
  sender_staff: 'ventanilla_sender_staff',
  recipient_staff: 'ventanilla_recipient_staff',
  sender_name: 'ventanilla_sender_name',
  sender_identifier: 'ventanilla_sender_identifier',
  recipient_name: 'ventanilla_recipient_name',
  recipient_identifier: 'ventanilla_recipient_identifier',
  subject: 'ventanilla_subject',
  trd_document_type: 'ventanilla_trd_document_type',
  metadata: 'ventanilla_metadata',
  file: 'ventanilla_file_0',
}

export interface VentanillaFilingValidationIssue {
  field: VentanillaFilingFieldKey
  message: string
  metadataFieldCode?: string
  metadataFieldIndex?: number
}

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

export interface ResolveVentanillaFilingValidationInput extends VentanillaCoreFilingFormValues {
  senderStaffId?: number | null
  recipientStaffId?: number | null
  senderStaffHasDocument?: boolean
  recipientStaffHasDocument?: boolean
  metadataFieldCode?: string
  metadataFieldIndex?: number
}

function resolvePartyValidationIssue(
  filingType: VentanillaFilingTypeValue,
  parties: VentanillaPartyFieldValues,
): VentanillaFilingValidationIssue | null {
  const senderName = parties.senderName?.trim() ?? ''
  const senderId = filterDigitsOnly(parties.senderIdentifier?.trim() ?? '')
  const recipientName = parties.recipientName?.trim() ?? ''
  const recipientId = filterDigitsOnly(parties.recipientIdentifier?.trim() ?? '')
  const needsRecipient = filingType === 'outgoing' || filingType === 'internal'

  if (!senderName) {
    return {
      field: filingType === 'incoming' ? 'sender_name' : 'sender_staff',
      message: 'El nombre del remitente es obligatorio',
    }
  }
  if (!senderId) {
    return {
      field: filingType === 'incoming' ? 'sender_identifier' : 'sender_staff',
      message: 'La identificación del remitente es obligatoria',
    }
  }
  if (!isDigitsOnlyIdentifier(senderId)) {
    return {
      field: filingType === 'incoming' ? 'sender_identifier' : 'sender_staff',
      message: 'La identificación del remitente debe contener solo números',
    }
  }

  if (!needsRecipient) {
    return null
  }

  if (!recipientName) {
    return {
      field: filingType === 'outgoing' ? 'recipient_name' : 'recipient_staff',
      message: 'El nombre del destinatario es obligatorio',
    }
  }
  if (!recipientId) {
    return {
      field: filingType === 'outgoing' ? 'recipient_identifier' : 'recipient_staff',
      message: 'La identificación del destinatario es obligatoria',
    }
  }
  if (!isDigitsOnlyIdentifier(recipientId)) {
    return {
      field: filingType === 'outgoing' ? 'recipient_identifier' : 'recipient_staff',
      message: 'La identificación del destinatario debe contener solo números',
    }
  }

  return null
}

/**
 * Devuelve el primer campo obligatorio faltante en orden de lectura del formulario.
 */
export function resolveFirstVentanillaFilingValidationIssue(
  values: ResolveVentanillaFilingValidationInput,
): VentanillaFilingValidationIssue | null {
  if (!values.functionalTypeKey?.trim()) {
    return { field: 'functional_type', message: 'Seleccione el tipo funcional' }
  }

  if (values.filingType === 'incoming' && !values.recipientOrgUnitId) {
    return { field: 'recipient_org_unit', message: 'Seleccione el área destinataria' }
  }

  if (values.filingType !== 'incoming' && !values.producerOrgUnitId) {
    return { field: 'producer_org_unit', message: 'Seleccione el área productora' }
  }

  if (values.filingType === 'internal' && !values.recipientOrgUnitId) {
    return { field: 'recipient_org_unit', message: 'Seleccione el área destinataria para radicado interno' }
  }

  if (values.filingType === 'incoming' && !values.recipientStaffId) {
    return { field: 'recipient_staff', message: 'Seleccione destinatario del área' }
  }

  if (values.filingType === 'outgoing' && !values.senderStaffId) {
    return { field: 'sender_staff', message: 'Seleccione remitente del área' }
  }

  if (values.filingType === 'internal') {
    if (!values.senderStaffId) {
      return { field: 'sender_staff', message: 'Seleccione remitente del área' }
    }
    if (!values.recipientStaffId) {
      return { field: 'recipient_staff', message: 'Seleccione destinatario del área' }
    }
  }

  if (values.filingType !== 'incoming' && values.senderStaffId && values.senderStaffHasDocument === false) {
    return {
      field: 'sender_staff',
      message: 'El remitente seleccionado no tiene número de documento registrado en nómina',
    }
  }

  if (
    (values.filingType === 'incoming' || values.filingType === 'internal')
    && values.recipientStaffId
    && values.recipientStaffHasDocument === false
  ) {
    return {
      field: 'recipient_staff',
      message: 'El destinatario seleccionado no tiene número de documento registrado en nómina',
    }
  }

  const partyIssue = resolvePartyValidationIssue(values.filingType, values.parties)
  if (partyIssue) {
    return partyIssue
  }

  if (!values.subject.trim()) {
    return { field: 'subject', message: 'El asunto es obligatorio' }
  }

  if (!values.docDocumentTypeId) {
    return { field: 'trd_document_type', message: 'Complete la clasificación TRD (tipo documental)' }
  }

  if (values.metadataError) {
    return {
      field: 'metadata',
      message: values.metadataError,
      metadataFieldCode: values.metadataFieldCode,
      metadataFieldIndex: values.metadataFieldIndex,
    }
  }

  if (values.minFileCount != null && values.minFileCount < 1) {
    return { field: 'file', message: 'Adjunte al menos un archivo' }
  }

  return null
}

export function isVentanillaFilingFieldMissing(
  field: VentanillaFilingFieldKey,
  values: ResolveVentanillaFilingValidationInput,
): boolean {
  const parties = {
    senderName: values.parties.senderName?.trim() ?? '',
    senderIdentifier: filterDigitsOnly(values.parties.senderIdentifier?.trim() ?? ''),
    recipientName: values.parties.recipientName?.trim() ?? '',
    recipientIdentifier: filterDigitsOnly(values.parties.recipientIdentifier?.trim() ?? ''),
  }

  switch (field) {
    case 'functional_type':
      return !values.functionalTypeKey?.trim()
    case 'recipient_org_unit':
      return (values.filingType === 'incoming' || values.filingType === 'internal') && !values.recipientOrgUnitId
    case 'producer_org_unit':
      return values.filingType !== 'incoming' && !values.producerOrgUnitId
    case 'sender_staff':
      if (values.filingType === 'incoming') {
        return false
      }
      if (!values.senderStaffId) {
        return true
      }

      return values.senderStaffHasDocument === false
    case 'recipient_staff':
      if (values.filingType === 'outgoing') {
        return false
      }
      if (!values.recipientStaffId) {
        return true
      }

      return values.recipientStaffHasDocument === false
    case 'sender_name':
      return values.filingType === 'incoming' && !parties.senderName
    case 'sender_identifier':
      return values.filingType === 'incoming'
        && (!parties.senderIdentifier || !isDigitsOnlyIdentifier(parties.senderIdentifier))
    case 'recipient_name':
      return values.filingType === 'outgoing' && !parties.recipientName
    case 'recipient_identifier':
      return values.filingType === 'outgoing'
        && (!parties.recipientIdentifier || !isDigitsOnlyIdentifier(parties.recipientIdentifier))
    case 'subject':
      return !values.subject.trim()
    case 'trd_document_type':
      return !values.docDocumentTypeId
    case 'metadata':
      return Boolean(values.metadataError)
    case 'file':
      return values.minFileCount != null && values.minFileCount < 1
    default:
      return false
  }
}

/**
 * Validación de campos obligatorios alineada con StoreVentanillaFilingRequest / ClassifyVentanillaIntakeRequest (API).
 */
export function validateVentanillaCoreFilingForm(values: VentanillaCoreFilingFormValues): string | null {
  if (!values.functionalTypeKey?.trim()) {
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
