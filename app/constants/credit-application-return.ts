/** Destino de la devolución: etapa anterior. Al completar, vuelve a quien devolvió. Alineado con `CreditApplicationReturnRouting`. */

export const RETURN_RESUBMIT_TO = {
  advisor: 'advisor',
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
  { value: 'advisor', label: 'Asesor' },
  { value: 'agency_director', label: 'Director de agencia' },
]

export const analystReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'advisor', label: 'Asesor' },
  { value: 'agency_director', label: 'Director de agencia' },
  { value: 'documentation', label: 'Revisión de documentación' },
]

export const agencyDirectorReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'advisor', label: 'Asesor' },
]

export const creditDirectorReturnResubmitOptions: Array<{ value: ReturnResubmitTo, label: string }> = [
  { value: 'advisor', label: 'Asesor' },
  { value: 'agency_director', label: 'Director de agencia' },
  { value: 'documentation', label: 'Revisión de documentación' },
  { value: 'analysis', label: 'Análisis' },
]

export function resubmitToLabel(to: string | null | undefined): string {
  switch (to) {
    case 'advisor':
      return 'el asesor'
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

export function parseReturnToSelection(v: unknown): ReturnResubmitTo | null {
  let raw: string | null = null
  if (typeof v === 'string') {
    raw = v
  } else if (v && typeof v === 'object' && 'value' in v) {
    const inner = (v as { value: unknown }).value
    raw = typeof inner === 'string' ? inner : null
  }
  if (raw == null) {
    return null
  }
  const t = raw.trim()
  if (t === 'advisor' || t.toLowerCase() === 'asesor') {
    return 'advisor'
  }
  if (t === 'documentation' || t === 'analysis' || t === 'agency_director' || t === 'credit_director') {
    return t
  }
  return null
}

/** Si el destino es el asesor, no se envía: el API usa el valor por defecto (inicio del flujo). */
export function serializeReturnToForApi(value: unknown): string | undefined {
  const parsed = parseReturnToSelection(value)
  if (parsed == null || parsed === 'advisor') {
    return undefined
  }
  return parsed
}

export function returnFlowConfirmDescription(returnTo: string, resumeTo: string): string {
  const dest = resubmitToLabel(returnTo) || returnTo
  const resume = resubmitToLabel(resumeTo) || resumeTo
  if (returnTo === 'advisor') {
    return `La radicación vuelve al asesor. Al corregir, entra a ${resume}.`
  }
  return `La radicación pasa a ${dest}. Al completar esa etapa, vuelve a ${resume}.`
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

export function returnedByResumeLabel(by: string | null | undefined): string {
  switch (by) {
    case 'documentation':
      return 'revisión de documentación'
    case 'analyst':
      return 'análisis'
    case 'agency_director':
      return 'revisión del director de agencia'
    case 'credit_director':
      return 'revisión del director de crédito'
    default:
      return ''
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
