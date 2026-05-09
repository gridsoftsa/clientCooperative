import type { BadgeVariants } from '~/components/ui/badge'

/** Cierre del flujo: sin edición ni desactivación (API y UI alineados). */
export function isCreditApplicationTerminalImmutable(status: string | null | undefined): boolean {
  return status === 'Disbursement' || status === 'Rejected' || status === 'Cancelled'
}

/** Estados de solicitud alineados con `App\Models\CreditApplication` (API). */

export const creditApplicationStatusFilterOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'Draft', label: 'Borrador' },
  { value: 'Submitted', label: 'Enviada' },
  { value: 'In_Analysis', label: 'En análisis' },
  { value: 'Director_Review', label: 'Revisión director de agencia' },
  { value: 'Credit_Director_Review', label: 'Revisión director de crédito' },
  { value: 'Documentation_Review', label: 'Revisión de documentación' },
  /** Un solo estado en API; el matiz director vs documentación sale del backend (`skip_next_director_review`) al mostrar filas. */
  { value: 'Returned', label: 'Devuelta (ajustes pendientes)' },
  { value: 'Approved', label: 'Aprobada' },
  { value: 'Disbursement', label: 'Desembolso' },
  { value: 'Rejected', label: 'Rechazada' },
  { value: 'Cancelled', label: 'Cancelada' },
] as const

/** Estados para reporte indicador (una sola selección; sin «Todos»). */
export const creditApplicationStatusReportIndicatorOptions: Array<{ value: string, label: string }> =
  creditApplicationStatusFilterOptions
    .filter((o): o is Exclude<(typeof creditApplicationStatusFilterOptions)[number], { readonly value: 'all' }> =>
      o.value !== 'all',
    )
    .map(o => ({ value: o.value, label: o.label }))

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Borrador',
  Submitted: 'Enviada',
  In_Analysis: 'En análisis',
  Director_Review: 'Revisión director de agencia',
  Credit_Director_Review: 'Revisión director de crédito',
  Documentation_Review: 'Revisión de documentación',
  Returned: 'Devuelta',
  Approved: 'Aprobada',
  Disbursement: 'Desembolso',
  Rejected: 'Rechazada',
  Cancelled: 'Cancelada',
}

export type CreditApplicationStatusLabelOptions = {
  /** Estado actual: viene del API cuando la solicitud está en `Returned` tras devolución documental. */
  skipNextDirectorReview?: boolean
  /** `true` cuando el analista devolvió la radicación y el asesor debe corregir y reenviar al analista. */
  resubmitToAnalystAfterReturn?: boolean
  /** `event_key` de la fila de trazabilidad para acertar el matiz de `Returned`. */
  timelineEventKey?: string | null
  /** Si el estado etiquetado es el origen o el destino de esa fila. */
  timelineRole?: 'from' | 'to'
}

function returnedLabelFromTimeline(
  role: 'from' | 'to',
  eventKey: string | null | undefined,
): string | null {
  const ek = eventKey ?? ''
  if (role === 'to') {
    if (ek === 'documentation_review_returned') {
      return 'Devuelta por revisión de documentos'
    }
    if (ek === 'director_returned') {
      return 'Devuelta por director de agencia'
    }
    if (ek === 'analyst_returned_review') {
      return 'Devuelta por analista'
    }
    return null
  }
  if (role === 'from') {
    if (ek === 'sent_to_documentation_review_skip_director') {
      return 'Devuelta por revisión de documentos'
    }
    if (ek === 'sent_to_director_review') {
      return 'Devuelta por director de agencia'
    }
    return null
  }
  return null
}

const BADGE_VARIANTS: Record<string, string> = {
  Draft: 'secondary',
  Submitted: 'default',
  In_Analysis: 'outline',
  Director_Review: 'default',
  Credit_Director_Review: 'default',
  Documentation_Review: 'secondary',
  Returned: 'destructive',
  Approved: 'default',
  Disbursement: 'success',
  Rejected: 'destructive',
  Cancelled: 'destructive',
}

export function getCreditApplicationStatusLabel(
  status: string,
  options?: CreditApplicationStatusLabelOptions,
): string {
  if (status !== 'Returned') {
    return STATUS_LABELS[status] ?? status
  }

  if (options?.resubmitToAnalystAfterReturn === true) {
    return 'Devuelta por analista (pendiente asesor)'
  }

  if (options?.timelineEventKey != null && options.timelineRole != null) {
    const fromTimeline = returnedLabelFromTimeline(options.timelineRole, options.timelineEventKey)
    if (fromTimeline != null) {
      return fromTimeline
    }
  }

  if (options?.skipNextDirectorReview === true) {
    return 'Devuelta por revisión de documentos'
  }
  if (options?.skipNextDirectorReview === false) {
    return 'Devuelta por director de agencia'
  }

  return STATUS_LABELS.Returned ?? status
}

export function getCreditApplicationStatusBadgeVariant(
  status: string,
): NonNullable<BadgeVariants['variant']> {
  return (BADGE_VARIANTS[status] ?? 'outline') as NonNullable<BadgeVariants['variant']>
}

/** Orden fijo para mostrar conteos en dashboard u otros resúmenes. */
export const creditApplicationStatusOrder = [
  'Draft',
  'Submitted',
  'Director_Review',
  'Credit_Director_Review',
  'Documentation_Review',
  'Returned',
  'In_Analysis',
  'Approved',
  'Disbursement',
  'Rejected',
  'Cancelled',
] as const
