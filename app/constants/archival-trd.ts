export const TRD_VERSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Vigente',
  inactive: 'Inactiva',
  superseded: 'Reemplazada',
}

export const TRD_RETENTION_LEVEL_LABELS: Record<string, string> = {
  series: 'Por serie',
  subseries: 'Por subserie',
  document_type: 'Por tipo documental',
}

export const TRD_RETENTION_LEVEL_HELP: Record<string, string> = {
  series: 'Los tiempos definidos en la serie se heredan a subseries y tipos en esta TRD.',
  subseries: 'Los tiempos por subserie se heredan a sus tipos documentales.',
  document_type: 'Cada tipo documental puede tener tiempos propios (máximo detalle).',
}

export const TRD_FINAL_DISPOSITION_LABELS: Record<string, string> = {
  elimination: 'Eliminación',
  full_conservation: 'Conservación total',
  selection: 'Selección',
  digitization: 'Digitalización',
}

export const TRD_DISPOSITION_OPTIONS = [
  { value: 'elimination', label: 'Eliminación' },
  { value: 'full_conservation', label: 'Conservación total' },
  { value: 'selection', label: 'Selección' },
  { value: 'digitization', label: 'Digitalización' },
] as const

export type TrdFinalDispositionValue = (typeof TRD_DISPOSITION_OPTIONS)[number]['value']

export function parseFinalDisposition(raw: string | null | undefined): TrdFinalDispositionValue[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split('|')
    .map(part => part.trim())
    .filter((part): part is TrdFinalDispositionValue =>
      part === 'elimination'
      || part === 'full_conservation'
      || part === 'selection'
      || part === 'digitization',
    )
}

export function serializeFinalDisposition(values: string[]): string | undefined {
  const unique = [...new Set(parseFinalDisposition(values.join('|')))]

  return unique.length > 0 ? unique.join('|') : undefined
}

export function formatFinalDispositionLabels(raw: string | null | undefined): string {
  const labels = parseFinalDisposition(raw).map(value => TRD_FINAL_DISPOSITION_LABELS[value])

  return labels.length > 0 ? labels.join(', ') : '—'
}

export const TRD_INHERITED_FROM_LABELS: Record<string, string> = {
  document_type: 'Tipo documental',
  subseries: 'Subserie',
  series: 'Serie',
}

export const TRD_SCOPE_LEVEL_OPTIONS = [
  { value: 'series', label: 'Serie' },
  { value: 'subseries', label: 'Subserie' },
  { value: 'document_type', label: 'Tipo documental' },
] as const

export const TRD_RETENTION_APPLICATION_OPTIONS = [
  { value: 'series', label: 'Por serie' },
  { value: 'subseries', label: 'Por subserie' },
  { value: 'document_type', label: 'Por tipo documental' },
] as const
