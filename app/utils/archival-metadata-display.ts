import { formatPesosConSimbolo } from '~/composables/usePesosFormat'

export function formatArchivalMetadataValue(dataType: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (dataType === 'currency' && (typeof value === 'number' || typeof value === 'string')) {
    const num = typeof value === 'number' ? value : Number(String(value).replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(num) ? formatPesosConSimbolo(num) : String(value)
  }

  if (dataType === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1' ? 'Sí' : 'No'
  }

  return String(value)
}
