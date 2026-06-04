import type { DocDocumentTypeRow } from '~/types/archival-catalog'
import type {
  EffectiveRetentionPayload,
  TrdRetentionRuleRow,
  TrdVersionRow,
  TrdVersionShowResponse,
} from '~/types/archival-trd'

type VersionApiPayload = TrdVersionRow & {
  documentTypes?: DocDocumentTypeRow[]
  retentionRules?: TrdRetentionRuleRow[]
}

export function normalizeTrdVersionRow(raw: VersionApiPayload): TrdVersionRow {
  return {
    ...raw,
    document_types: raw.document_types ?? raw.documentTypes ?? [],
    retention_rules: raw.retention_rules ?? raw.retentionRules ?? [],
  }
}

export function normalizeEffectiveRetentionPreview(
  raw: Record<string, EffectiveRetentionPayload | null> | undefined,
): Record<number, EffectiveRetentionPayload | null> {
  const preview: Record<number, EffectiveRetentionPayload | null> = {}

  if (!raw) {
    return preview
  }

  for (const [key, value] of Object.entries(raw)) {
    preview[Number(key)] = value
  }

  return preview
}

type CatalogTreeLike = Array<{
  id: number
  subseries: Array<{
    id: number
    doc_series_id: number
    document_types: Array<{ id: number }>
  }>
}>

function findCatalogContext(
  typeId: number,
  catalogTree: CatalogTreeLike,
): { seriesId: number, subseriesId: number } | null {
  for (const serie of catalogTree) {
    for (const sub of serie.subseries) {
      if (sub.document_types.some(t => t.id === typeId)) {
        return { seriesId: serie.id, subseriesId: sub.id }
      }
    }
  }

  return null
}

function ruleToEffectivePayload(
  rule: TrdRetentionRuleRow,
  inheritedFrom: EffectiveRetentionPayload['inherited_from'],
): EffectiveRetentionPayload {
  return {
    rule_id: rule.id,
    years_management: rule.years_management,
    years_central: rule.years_central,
    years_historical: rule.years_historical ?? null,
    final_disposition: rule.final_disposition,
    procedure_text: rule.procedure_text ?? null,
    notes: rule.notes ?? null,
    inherited_from: inheritedFrom,
  }
}

/**
 * Misma prioridad que HU-TRD-11: tipo documental → subserie → serie.
 */
export function resolveEffectiveRetentionFromRules(
  typeId: number,
  docSubseriesId: number | undefined,
  rules: TrdRetentionRuleRow[],
  catalogTree: CatalogTreeLike = [],
): EffectiveRetentionPayload | null {
  const context = findCatalogContext(typeId, catalogTree)
    ?? (docSubseriesId != null
      ? (() => {
          for (const serie of catalogTree) {
            const sub = serie.subseries.find(s => s.id === docSubseriesId)
            if (sub) {
              return { seriesId: serie.id, subseriesId: sub.id }
            }
          }

          return null
        })()
      : null)

  if (!context) {
    return null
  }

  const typeRule = rules.find(
    rule => rule.scope_level === 'document_type' && rule.doc_document_type_id === typeId,
  )
  if (typeRule) {
    return ruleToEffectivePayload(typeRule, 'document_type')
  }

  const subseriesRule = rules.find(
    rule => rule.scope_level === 'subseries' && rule.doc_subseries_id === context.subseriesId,
  )
  if (subseriesRule) {
    return ruleToEffectivePayload(subseriesRule, 'subseries')
  }

  const seriesRule = rules.find(
    rule => rule.scope_level === 'series' && rule.doc_series_id === context.seriesId,
  )
  if (seriesRule) {
    return ruleToEffectivePayload(seriesRule, 'series')
  }

  return null
}

export function normalizeTrdVersionShowResponse(
  res: TrdVersionShowResponse & {
    effective_retention_preview?: Record<string, EffectiveRetentionPayload | null>
  },
): TrdVersionShowResponse {
  const nestedPreview = (res.data as VersionApiPayload & {
    effective_retention_preview?: Record<string, EffectiveRetentionPayload | null>
  })?.effective_retention_preview

  return {
    data: normalizeTrdVersionRow(res.data as VersionApiPayload),
    effective_retention_preview: normalizeEffectiveRetentionPreview(
      res.effective_retention_preview ?? nestedPreview,
    ),
  }
}
