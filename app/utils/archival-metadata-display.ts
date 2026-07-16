import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import { formatPesosConSimbolo } from '~/composables/usePesosFormat'

export interface ArchivalMetadataDisplayEntry {
  key: string
  label: string
  value: string
}

export function formatArchivalFileSize(size?: number | null): string {
  if (size == null || size <= 0) {
    return '—'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatMetadataPrimitive(value: unknown, dataType?: string): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  if (dataType === 'currency' || dataType === 'money') {
    const numeric = Number(String(value).replace(/[^\d.-]/g, ''))
    if (Number.isFinite(numeric)) {
      return formatPesosConSimbolo(numeric)
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

export function archivalMetadataDisplayEntries(
  values: Record<string, unknown> | null | undefined,
  fields?: ArchivalMetadataFieldRow[] | Array<{ code: string, name: string, data_type?: string }>,
): ArchivalMetadataDisplayEntry[] {
  if (!values || Object.keys(values).length === 0) {
    return []
  }

  const fieldMap = new Map(
    (fields ?? []).map(field => [field.code, field]),
  )

  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const field = fieldMap.get(key)

      return {
        key,
        label: field?.name ?? key,
        value: formatMetadataPrimitive(value, field?.data_type),
      }
    })
}
