import type { CatalogConfidentialityPayload } from '~/types/archival-catalog'

export function catalogConfidentialityParenthetical(
  payload?: CatalogConfidentialityPayload | null,
): string {
  const level = payload?.effective_level
  if (!level || level === 'public') {
    return ''
  }

  let label = level === 'restricted' ? 'Restringido' : 'Uso interno por área'
  if (payload?.inherited) {
    if (payload.effective_source === 'series') {
      label += ', hereda de serie'
    }
    else if (payload.effective_source === 'subseries') {
      label += ', hereda de subserie'
    }
  }

  return `(${label})`
}
