/** Destino del reenvío tras devolver al asesor. Alineado con `CreditApplicationReturnRouting` (API). */

export const RETURN_RESUBMIT_TO = {
  documentation: 'documentation',
  analysis: 'analysis',
  agencyDirector: 'agency_director',
  creditDirector: 'credit_director',
} as const

export type ReturnResubmitTo = (typeof RETURN_RESUBMIT_TO)[keyof typeof RETURN_RESUBMIT_TO]

export const RETURNED_BY = {
  documentation: 'documentation',
  analyst: 'analyst',
  agencyDirector: 'agency_director',
  creditDirector: 'credit_director',
} as const

export type ReturnedBy = (typeof RETURNED_BY)[keyof typeof RETURNED_BY]

export const documentationReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'documentation', label: 'Revisión de documentación' },
  { value: 'analysis', label: 'Análisis' },
  { value: 'agency_director', label: 'Director de agencia' },
]

export const analystReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'analysis', label: 'Análisis' },
  { value: 'documentation', label: 'Revisión de documentación' },
]

export const agencyDirectorReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'agency_director', label: 'Director de agencia' },
  { value: 'documentation', label: 'Revisión de documentación' },
]

export function resubmitToLabel(to: string | null | undefined): string {
  switch (to) {
    case 'documentation':
      return 'revisión de documentación'
    case 'analysis':
      return 'análisis'
    case 'agency_director':
      return 'revisión del director de agencia'
    case 'credit_director':
      return 'revisión del director de crédito'
    default:
      return ''
  }
}

export function returnedByStatusLabel(by: string | null | undefined): string | null {
  switch (by) {
    case 'documentation':
      return 'Devuelta por revisión de documentos'
    case 'analyst':
      return 'Devuelta por analista (pendiente asesor)'
    case 'agency_director':
      return 'Devuelta por director de agencia'
    case 'credit_director':
      return 'Devolución'
    default:
      return null
  }
}

/** Destino de reenvío inferido de las banderas de la solicitud (sin columna extra). */
export function inferResubmitToFromFlags(flags: {
  skipNextDirectorReview?: boolean
  resubmitToAnalystAfterReturn?: boolean
  resubmitToCreditDirectorAfterReturn?: boolean
}): ReturnResubmitTo | null {
  if (flags.skipNextDirectorReview) {
    return 'documentation'
  }
  if (flags.resubmitToAnalystAfterReturn) {
    return 'analysis'
  }
  if (flags.resubmitToCreditDirectorAfterReturn) {
    return 'credit_director'
  }
  return null
}
