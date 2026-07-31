import {
  type AuxiliaryChecklistItem,
  type EconomicActivityCatalogOption,
  extractItemsByActivityFromCatalogResponse,
  normalizeStoredActivityType,
  resolveAuxiliaryChecklistRows,
  titleForAuxiliaryDocumentUpload,
} from '~/constants/auxiliary-documents-checklist'
import { creditApplicationDocumentIdEquals, parseFinancialChecklistDocumentIdMap } from '~/utils/financial-checklist-document-id-map'
import { findDocumentIdByTitle } from '~/utils/radicacion-document-upload'

export type AuxiliaryApplicationDocumentRef = {
  id: number
  applicant_id?: number | null
  title?: string | null
  original_name?: string | null
}

function findDocMeta(
  docId: number,
  documents: AuxiliaryApplicationDocumentRef[],
  applicantId?: number | null,
): AuxiliaryApplicationDocumentRef | null {
  const list = documents ?? []
  const byIdAndApplicant = list.find(d =>
    creditApplicationDocumentIdEquals(d.id, docId)
    && (applicantId == null || d.applicant_id == null || Number(d.applicant_id) === Number(applicantId)),
  )
  if (byIdAndApplicant) {
    return byIdAndApplicant
  }
  return list.find(d => creditApplicationDocumentIdEquals(d.id, docId)) ?? null
}

/**
 * True if the checklist key has a local pending File, a linked document in the map,
 * or a recoverable server document by the standard «Auxiliar — …» title.
 */
export function isAuxiliaryChecklistKeySatisfied(options: {
  key: string
  label: string
  financialInfo: unknown
  pendingFiles?: Record<string, File | undefined> | null
  applicationDocuments: AuxiliaryApplicationDocumentRef[]
  applicantId?: number | null
}): boolean {
  const pending = options.pendingFiles?.[options.key]
  if (pending instanceof File) {
    return true
  }

  const map = parseFinancialChecklistDocumentIdMap(
    options.financialInfo
    && typeof options.financialInfo === 'object'
    && !Array.isArray(options.financialInfo)
      ? (options.financialInfo as Record<string, unknown>).auxiliaryDocuments
      : null,
  )
  const mappedId = map[options.key]
  if (typeof mappedId === 'number' && mappedId >= 1) {
    if (findDocMeta(mappedId, options.applicationDocuments, options.applicantId)) {
      return true
    }
  }

  const uploadTitle = titleForAuxiliaryDocumentUpload(options.label)
  const byTitle = findDocumentIdByTitle(
    options.applicationDocuments,
    uploadTitle,
    options.applicantId,
  )
  return byTitle != null
}

export function missingRequiredAuxiliaryLabels(options: {
  itemsByActivity: Record<string, AuxiliaryChecklistItem[]>
  activityType: unknown
  financialInfo: unknown
  pendingFiles?: Record<string, File | undefined> | null
  applicationDocuments: AuxiliaryApplicationDocumentRef[]
  applicantId?: number | null
  economicActivityOptions?: ReadonlyArray<EconomicActivityCatalogOption>
}): string[] {
  const activityType = normalizeStoredActivityType(options.activityType)
  const rows = resolveAuxiliaryChecklistRows(
    options.itemsByActivity,
    activityType,
    options.economicActivityOptions,
  )
  if (!activityType || rows.length === 0) {
    return []
  }
  return rows
    .filter(r => r.required)
    .filter(r => !isAuxiliaryChecklistKeySatisfied({
      key: r.key,
      label: r.label,
      financialInfo: options.financialInfo,
      pendingFiles: options.pendingFiles,
      applicationDocuments: options.applicationDocuments,
      applicantId: options.applicantId,
    }))
    .map(r => r.label)
}

export function extractActivityTypeFromFinancialInfo(financialInfo: unknown): string {
  if (!financialInfo || typeof financialInfo !== 'object' || Array.isArray(financialInfo)) {
    return ''
  }
  return normalizeStoredActivityType((financialInfo as Record<string, unknown>).activity_type)
}

/** Parse itemsByActivity from GET `/catalogs/template-flat-data/auxiliary-documents`. */
export function itemsByActivityFromCatalogResponse(body: unknown): Record<string, AuxiliaryChecklistItem[]> {
  return extractItemsByActivityFromCatalogResponse(body)
}
