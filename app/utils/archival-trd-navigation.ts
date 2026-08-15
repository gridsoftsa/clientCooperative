export const TRD_VERSION_TABS = ['general', 'catalog', 'rules', 'preview'] as const

export type TrdVersionTab = (typeof TRD_VERSION_TABS)[number]

export function isTrdVersionTab(value: unknown): value is TrdVersionTab {
  return typeof value === 'string' && (TRD_VERSION_TABS as readonly string[]).includes(value)
}

export function trdVersionPathWithTab(
  tableId: number,
  versionId: number,
  tab: TrdVersionTab = 'general',
): string {
  const base = `/settings/archival/trd/${tableId}/versions/${versionId}`

  if (tab === 'general') {
    return base
  }

  return `${base}?tab=${tab}`
}

export function isTrdVersionReturnPath(path: string): boolean {
  return path.startsWith('/settings/archival/trd/') && path.includes('/versions/')
}
