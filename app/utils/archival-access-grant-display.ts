import type { ArchivalFileAccessGrant } from '~/types/archival-file'

export type ArchivalFileAccessGrantEffectiveStatus =
  | 'active'
  | 'inactive'
  | 'expired'
  | 'scheduled'

export const ARCHIVAL_FILE_ACCESS_GRANT_EFFECTIVE_STATUS_LABELS: Record<
  ArchivalFileAccessGrantEffectiveStatus,
  string
> = {
  active: 'Vigente',
  inactive: 'Inactivo',
  expired: 'Vencido',
  scheduled: 'Programado',
}

export function archivalAccessGrantEffectiveStatus(
  grant: Pick<ArchivalFileAccessGrant, 'status' | 'effective_status' | 'starts_at' | 'ends_at'>,
): ArchivalFileAccessGrantEffectiveStatus {
  if (grant.effective_status === 'inactive' || grant.effective_status === 'expired' || grant.effective_status === 'scheduled') {
    return grant.effective_status
  }

  if (grant.status === 'inactive') {
    return 'inactive'
  }

  if (grant.ends_at && new Date(grant.ends_at).getTime() < Date.now()) {
    return 'expired'
  }

  if (grant.starts_at && new Date(grant.starts_at).getTime() > Date.now()) {
    return 'scheduled'
  }

  return 'active'
}

export function archivalAccessGrantEffectiveStatusLabel(
  grant: Pick<ArchivalFileAccessGrant, 'status' | 'effective_status' | 'starts_at' | 'ends_at'>,
): string {
  return ARCHIVAL_FILE_ACCESS_GRANT_EFFECTIVE_STATUS_LABELS[archivalAccessGrantEffectiveStatus(grant)]
}

export function archivalAccessGrantScopeLabel(
  grant: Pick<
    ArchivalFileAccessGrant,
    | 'scope_label'
    | 'file_number'
    | 'file_type'
    | 'doc_series_label'
    | 'doc_subseries_label'
    | 'doc_document_type_label'
  >,
): string {
  if (grant.scope_label) {
    return grant.scope_label
  }

  const parts: string[] = []

  if (grant.file_number) {
    parts.push(`Expediente ${grant.file_number}`)
  }

  if (grant.file_type) {
    parts.push(grant.file_type)
  }

  if (grant.doc_series_label) {
    parts.push(grant.doc_series_label)
  }

  if (grant.doc_subseries_label) {
    parts.push(grant.doc_subseries_label)
  }

  if (grant.doc_document_type_label) {
    parts.push(grant.doc_document_type_label)
  }

  return parts.length > 0 ? parts.join(' · ') : 'Global'
}

export function archivalAccessGrantValidityLabel(
  grant: Pick<ArchivalFileAccessGrant, 'starts_at' | 'ends_at'>,
): string {
  if (!grant.starts_at && !grant.ends_at) {
    return 'Sin vigencia definida'
  }

  const start = grant.starts_at ? formatGrantDate(grant.starts_at) : '—'
  const end = grant.ends_at ? formatGrantDate(grant.ends_at) : '—'

  return `${start} → ${end}`
}

function formatGrantDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('es-CO')
}

export function archivalAccessGrantEffectiveBadgeVariant(
  grant: Pick<ArchivalFileAccessGrant, 'status' | 'effective_status' | 'starts_at' | 'ends_at'>,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  const status = archivalAccessGrantEffectiveStatus(grant)

  switch (status) {
    case 'active':
      return 'default'
    case 'scheduled':
      return 'secondary'
    case 'expired':
      return 'destructive'
    default:
      return 'outline'
  }
}
