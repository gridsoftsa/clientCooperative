/** Rules aligned with backend `ColombianDocumentNumberValidation` (CC, CE, NIT). */

export function digitsOnlyDocument(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * @returns Error message in Spanish, or null if valid (or document type is not CC/CE/NIT).
 */
export function validateColombianDocumentNumber(documentType: string, documentNumber: string): string | null {
  const type = documentType.trim().toUpperCase()
  const digits = digitsOnlyDocument(documentNumber)
  if (!digits) {
    return 'El número de documento debe contener dígitos.'
  }
  const len = digits.length
  if (type === 'CC') {
    if (len < 5 || len > 10) {
      return 'La cédula de ciudadanía debe tener entre 5 y 10 dígitos.'
    }
    return null
  }
  if (type === 'CE') {
    if (len < 5 || len > 15) {
      return 'La cédula de extranjería debe tener entre 5 y 15 dígitos.'
    }
    return null
  }
  if (type === 'NIT') {
    if (len < 9 || len > 10) {
      return 'El NIT debe tener 9 o 10 dígitos (incluya el dígito de verificación si aplica).'
    }
    return null
  }
  return null
}

/** Helper copy for inputs (Spanish UI). */
export function documentNumberLengthHint(documentType: string): string {
  const type = documentType.trim().toUpperCase()
  if (type === 'CC') {
    return 'Entre 5 y 10 dígitos.'
  }
  if (type === 'CE') {
    return 'Entre 5 y 15 dígitos.'
  }
  if (type === 'NIT') {
    return '9 o 10 dígitos (con dígito de verificación si aplica).'
  }
  return ''
}
