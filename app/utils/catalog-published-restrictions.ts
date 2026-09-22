import type { CatalogConfidentialityPayload } from '~/types/archival-catalog'

export function catalogRestrictionsButtonLabel(
  confidentiality?: CatalogConfidentialityPayload | null,
): string {
  return confidentiality?.effective_level === 'restricted'
    ? 'Cambiar restricciones'
    : 'Añadir restricciones'
}

export function withCatalogRestrictionsQuery(href: string): string {
  const hashIndex = href.indexOf('#')
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : ''
  const params = new URLSearchParams(search)
  params.set('restrictions', '1')

  return `${path}?${params.toString()}${hash}`
}

export function isCatalogRestrictionsOnlyQuery(query: { restrictions?: unknown }): boolean {
  const value = query.restrictions

  return value === '1' || value === 'true'
}
