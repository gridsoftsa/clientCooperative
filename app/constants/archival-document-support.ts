export const DOCUMENT_SUPPORT_OPTIONS = [
  { value: 'paper', label: 'Papel' },
  { value: 'digital', label: 'Digital' },
] as const

export type DocumentSupportValue = (typeof DOCUMENT_SUPPORT_OPTIONS)[number]['value']

const LABEL_BY_VALUE = Object.fromEntries(
  DOCUMENT_SUPPORT_OPTIONS.map(option => [option.value, option.label]),
) as Record<DocumentSupportValue, string>

export function parseAllowedSupport(raw: string | null | undefined): DocumentSupportValue[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split('|')
    .map(part => part.trim())
    .filter((part): part is DocumentSupportValue => part === 'paper' || part === 'digital')
}

export function serializeAllowedSupport(values: string[]): string | undefined {
  const unique = [...new Set(values.filter(v => v === 'paper' || v === 'digital'))]

  return unique.length > 0 ? unique.join('|') : undefined
}

export function formatAllowedSupportLabels(raw: string | null | undefined): string {
  const labels = parseAllowedSupport(raw).map(value => LABEL_BY_VALUE[value])

  return labels.length > 0 ? labels.join(', ') : '—'
}
