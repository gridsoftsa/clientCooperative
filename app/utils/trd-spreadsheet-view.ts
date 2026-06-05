import { parseFinalDisposition } from '~/constants/archival-trd'
import type { EffectiveRetentionPayload, TrdActiveVersionConsultData } from '~/types/archival-trd'

export interface TrdSpreadsheetDispositionMarks {
  c: string
  s: string
  e: string
  d: string
}

export interface TrdSpreadsheetRow {
  rowNumber: number
  seriesCode: string
  seriesName: string
  subseriesCode: string
  subseriesName: string
  documentTypeCode: string
  documentTypeName: string
  allowedSupport: string
  yearsManagement: number | null
  yearsCentral: number | null
  yearsHistorical: number | null
  dispositionMarks: TrdSpreadsheetDispositionMarks
  procedureText: string
  hasEffectiveRule: boolean
}

const SUPPORT_LABELS: Record<string, string> = {
  paper: 'Papel',
  digital: 'Digital',
}

export function formatTrdAllowedSupport(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return '—'
  }

  const parts = raw.split('|').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) {
    return '—'
  }

  return parts.map(part => SUPPORT_LABELS[part] ?? part).join(' / ')
}

export function formatTrdDispositionMarks(
  finalDisposition: string | null | undefined,
): TrdSpreadsheetDispositionMarks {
  const values = parseFinalDisposition(finalDisposition)

  return {
    c: values.includes('full_conservation') ? 'X' : '',
    s: values.includes('selection') ? 'X' : '',
    e: values.includes('elimination') ? 'X' : '',
    d: values.includes('digitization') ? 'X' : '',
  }
}

function formatRetentionYears(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }

  return String(value)
}

export function formatTrdSpreadsheetRetentionCell(
  retention: EffectiveRetentionPayload | null,
  field: 'years_management' | 'years_central' | 'years_historical',
): string {
  if (!retention) {
    return '—'
  }

  return formatRetentionYears(retention[field])
}

export function buildTrdSpreadsheetRows(data: TrdActiveVersionConsultData): TrdSpreadsheetRow[] {
  const rows: TrdSpreadsheetRow[] = []
  let rowNumber = 0

  for (const serie of data.catalog_tree) {
    for (const sub of serie.subseries) {
      for (const tipo of sub.document_types) {
        rowNumber += 1
        const retention = tipo.effective_retention

        rows.push({
          rowNumber,
          seriesCode: serie.code,
          seriesName: serie.name,
          subseriesCode: sub.code,
          subseriesName: sub.name,
          documentTypeCode: tipo.code,
          documentTypeName: tipo.name,
          allowedSupport: formatTrdAllowedSupport(tipo.allowed_support),
          yearsManagement: retention?.years_management ?? null,
          yearsCentral: retention?.years_central ?? null,
          yearsHistorical: retention?.years_historical ?? null,
          dispositionMarks: formatTrdDispositionMarks(retention?.final_disposition),
          procedureText: retention?.procedure_text?.trim() || '—',
          hasEffectiveRule: retention != null,
        })
      }
    }
  }

  return rows
}

export function buildTrdSpreadsheetFilename(data: TrdActiveVersionConsultData): string {
  const officeCode = data.version.producer_office_code.trim() || 'oficina'
  const versionNumber = data.version.version_number

  return `trd-${officeCode}-v${versionNumber}.xlsx`
}
