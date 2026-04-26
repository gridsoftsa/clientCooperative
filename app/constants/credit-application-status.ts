import type { BadgeVariants } from '~/components/ui/badge'

/** Estados de solicitud alineados con `App\Models\CreditApplication` (API). */

export const creditApplicationStatusFilterOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'Draft', label: 'Borrador' },
  { value: 'Submitted', label: 'Enviada' },
  { value: 'In_Analysis', label: 'En análisis' },
  { value: 'Approved', label: 'Aprobada' },
  { value: 'Rejected', label: 'Rechazada' },
] as const

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Borrador',
  Submitted: 'Enviada',
  In_Analysis: 'En análisis',
  Approved: 'Aprobada',
  Rejected: 'Rechazada',
}

const BADGE_VARIANTS: Record<string, string> = {
  Draft: 'secondary',
  Submitted: 'default',
  In_Analysis: 'outline',
  Approved: 'default',
  Rejected: 'destructive',
}

export function getCreditApplicationStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
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
  'In_Analysis',
  'Approved',
  'Rejected',
] as const
