import type { ArchivalTrdCatalogItem, ArchivalTrdPlacement } from '~/types/archival-file'

export interface ArchivalTrdDisplayLevel {
  key: 'series' | 'subseries' | 'document_type' | 'path'
  label: string
  value: string
}

export function formatArchivalTrdCatalogItem(item?: ArchivalTrdCatalogItem | null): string | null {
  if (!item) {
    return null
  }

  const code = item.code?.trim() ?? ''
  const name = item.name?.trim() ?? ''

  if (code && name) {
    return `${code} — ${name}`
  }

  return code || name || null
}

export function archivalTrdLevels(trd?: ArchivalTrdPlacement | null): ArchivalTrdDisplayLevel[] {
  if (!trd) {
    return []
  }

  const levels: ArchivalTrdDisplayLevel[] = []
  const series = formatArchivalTrdCatalogItem(trd.series)
  const subseries = formatArchivalTrdCatalogItem(trd.subseries)
  const documentType = formatArchivalTrdCatalogItem(trd.document_type)

  if (series) {
    levels.push({ key: 'series', label: 'Serie', value: series })
  }
  if (subseries) {
    levels.push({ key: 'subseries', label: 'Subserie', value: subseries })
  }
  if (documentType) {
    levels.push({ key: 'document_type', label: 'Tipo documental', value: documentType })
  }

  if (levels.length === 0 && trd.path?.trim()) {
    levels.push({ key: 'path', label: 'Ubicación TRD', value: trd.path.trim() })
  }

  return levels
}

export function archivalTrdShortLabel(trd?: ArchivalTrdPlacement | null): string {
  return trd?.document_type?.code?.trim()
    || trd?.subseries?.code?.trim()
    || trd?.series?.code?.trim()
    || 'TRD'
}

export function archivalTrdFullPath(trd?: ArchivalTrdPlacement | null): string {
  if (!trd) {
    return ''
  }

  if (trd.path?.trim()) {
    return trd.path.trim()
  }

  return archivalTrdLevels(trd).map(level => level.value).join(' / ')
}
