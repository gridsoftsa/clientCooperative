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

/** True si el `label` aparece una sola vez en el checklist (seguro recuperar por título). */
export function isAuxiliaryChecklistLabelUnique(
  rows: ReadonlyArray<{ key: string, label: string }>,
  label: string,
): boolean {
  const needle = label.trim().toLowerCase()
  if (!needle) {
    return false
  }
  let count = 0
  for (const row of rows) {
    if (row.label.trim().toLowerCase() === needle) {
      count++
      if (count > 1) {
        return false
      }
    }
  }
  return count === 1
}

function findAuxiliaryDocIdByUniqueLabelTitle(options: {
  label: string
  rows: ReadonlyArray<{ key: string, label: string }>
  applicationDocuments: AuxiliaryApplicationDocumentRef[]
  applicantId?: number | null
}): number | null {
  if (!isAuxiliaryChecklistLabelUnique(options.rows, options.label)) {
    // Varias filas con el mismo texto (p. ej. 4× «Otros soportes de ingreso»):
    // el título «Auxiliar — …» es idéntico y no puede distinguirlas.
    return null
  }
  const uploadTitle = titleForAuxiliaryDocumentUpload(options.label)
  return findDocumentIdByTitle(
    options.applicationDocuments,
    uploadTitle,
    options.applicantId,
  ) ?? findDocumentIdByTitle(
    options.applicationDocuments,
    uploadTitle,
    null,
  )
}

/**
 * True if the checklist key has a local pending File or a linked document in the map.
 * Solo recupera por título si el label es único en el checklist.
 */
export function isAuxiliaryChecklistKeySatisfied(options: {
  key: string
  label: string
  financialInfo: unknown
  pendingFiles?: Record<string, File | undefined> | null
  applicationDocuments: AuxiliaryApplicationDocumentRef[]
  applicantId?: number | null
  /** Filas del checklist actual; necesarias para no cruzar labels duplicados. */
  checklistRows?: ReadonlyArray<{ key: string, label: string }>
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

  const rows = options.checklistRows ?? [{ key: options.key, label: options.label }]
  return findAuxiliaryDocIdByUniqueLabelTitle({
    label: options.label,
    rows,
    applicationDocuments: options.applicationDocuments,
    applicantId: options.applicantId,
  }) != null
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
      checklistRows: rows,
    }))
    .map(r => r.label)
}

export function extractActivityTypeFromFinancialInfo(financialInfo: unknown): string {
  if (!financialInfo || typeof financialInfo !== 'object' || Array.isArray(financialInfo)) {
    return ''
  }
  return normalizeStoredActivityType((financialInfo as Record<string, unknown>).activity_type)
}

/**
 * Reconstruye `financial_info.auxiliaryDocuments` enlazando IDs de documentos ya subidos
 * (por título «Auxiliar — …») cuando el mapa está vacío o apunta a IDs huérfanos.
 * No reutiliza el mismo documento en varias filas con el mismo label.
 */
export function repairAuxiliaryDocumentsMapFromExisting(options: {
  itemsByActivity: Record<string, AuxiliaryChecklistItem[]>
  financialInfo: unknown
  applicationDocuments: AuxiliaryApplicationDocumentRef[]
  applicantId?: number | null
  economicActivityOptions?: ReadonlyArray<EconomicActivityCatalogOption>
}): Record<string, number | null> | null {
  const activityType = extractActivityTypeFromFinancialInfo(options.financialInfo)
  const rows = resolveAuxiliaryChecklistRows(
    options.itemsByActivity,
    activityType,
    options.economicActivityOptions,
  )
  if (!activityType || rows.length === 0) {
    return null
  }

  const fi = (
    options.financialInfo
    && typeof options.financialInfo === 'object'
    && !Array.isArray(options.financialInfo)
  )
    ? { ...(options.financialInfo as Record<string, unknown>) }
    : {}
  const map = parseFinancialChecklistDocumentIdMap(fi.auxiliaryDocuments)
  let changed = false

  // Un mismo document id no puede servir a varias claves del checklist.
  const claimedIds = new Set<number>()
  for (const row of rows) {
    const currentId = map[row.key]
    if (typeof currentId === 'number' && currentId >= 1) {
      if (claimedIds.has(currentId)) {
        map[row.key] = null
        changed = true
        continue
      }
      if (findDocMeta(currentId, options.applicationDocuments, options.applicantId)) {
        claimedIds.add(currentId)
        continue
      }
    }

    const recovered = findAuxiliaryDocIdByUniqueLabelTitle({
      label: row.label,
      rows,
      applicationDocuments: options.applicationDocuments,
      applicantId: options.applicantId,
    })
    if (recovered != null && !claimedIds.has(recovered) && recovered !== currentId) {
      map[row.key] = recovered
      claimedIds.add(recovered)
      changed = true
    } else if (typeof currentId === 'number' && currentId >= 1 && !findDocMeta(currentId, options.applicationDocuments, options.applicantId)) {
      map[row.key] = null
      changed = true
    }
  }

  return changed ? map : null
}

/** Parse itemsByActivity from GET `/catalogs/template-flat-data/auxiliary-documents`. */
export function itemsByActivityFromCatalogResponse(body: unknown): Record<string, AuxiliaryChecklistItem[]> {
  return extractItemsByActivityFromCatalogResponse(body)
}
