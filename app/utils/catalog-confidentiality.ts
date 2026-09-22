import type { CatalogConfidentialityPayload } from '~/types/archival-catalog'

export function catalogConfidentialityParenthetical(
  payload?: CatalogConfidentialityPayload | null,
): string {
  const status = catalogConfidentialityStatus(payload)
  if (status.level === 'public') {
    return ''
  }

  if (status.inheritNote) {
    return `(${status.shortLabel}, ${status.inheritNote})`
  }

  return `(${status.shortLabel})`
}

export function catalogConfidentialityStatus(
  payload?: CatalogConfidentialityPayload | null,
): {
  level: NonNullable<CatalogConfidentialityPayload['effective_level']>
  shortLabel: string
  inheritNote: string
  label: string
} {
  const level = payload?.effective_level ?? 'public'
  let shortLabel = 'Público'
  if (level === 'restricted') {
    shortLabel = 'Restringido'
  }
  else if (level === 'internal_by_area') {
    shortLabel = 'Uso interno'
  }

  let inheritNote = ''
  if (level !== 'public' && payload?.inherited) {
    if (payload.effective_source === 'series') {
      inheritNote = 'Hereda de serie'
    }
    else if (payload.effective_source === 'subseries') {
      inheritNote = 'Hereda de subserie'
    }
  }

  const label = inheritNote ? `${shortLabel}, ${inheritNote.toLowerCase()}` : shortLabel

  return { level, shortLabel, inheritNote, label }
}
