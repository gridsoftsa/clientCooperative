import { messageFromFetchError } from '~/utils/http-error-message'

export function formatUploadFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function describeUploadFile(file: File): string {
  const type = file.type?.trim() ? `, ${file.type}` : ''
  return `${file.name} (${formatUploadFileSize(file.size)}${type})`
}

export function messageFromDocumentUploadError(
  context: string,
  file: File | null,
  error: unknown,
): string {
  const filePart = file ? describeUploadFile(file) : 'archivo no identificado'
  return `«${context}» — ${filePart}. ${messageFromFetchError(error, 'Error al subir el archivo')}`
}

/** Ejecuta una subida y registra en consola cuál archivo falló. */
export async function runDocumentUpload<T>(
  context: string,
  file: File | null,
  action: () => Promise<T>,
): Promise<T> {
  console.info('[radicacion-upload] Iniciando:', context, file ? describeUploadFile(file) : '')
  try {
    const result = await action()
    console.info('[radicacion-upload] OK:', context)
    return result
  } catch (error) {
    console.error('[radicacion-upload] Falló:', context, file ? describeUploadFile(file) : '', error)
    throw new Error(messageFromDocumentUploadError(context, file, error))
  }
}

const CHECKLIST_MAP_KEYS = [
  'auxiliaryDocuments',
  'fngDocuments',
  'insurabilityDocuments',
  'approverEntityDocuments',
] as const

/** IDs referenciados por mapas de checklist en financial_info. */
export function collectChecklistDocumentIds(financialInfo: unknown): Set<number> {
  const ids = new Set<number>()
  if (!financialInfo || typeof financialInfo !== 'object' || Array.isArray(financialInfo)) {
    return ids
  }
  const fi = financialInfo as Record<string, unknown>
  for (const mapKey of CHECKLIST_MAP_KEYS) {
    const map = fi[mapKey]
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      continue
    }
    for (const value of Object.values(map as Record<string, unknown>)) {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isInteger(n) && n > 0) {
        ids.add(n)
      }
    }
  }
  return ids
}

/** Títulos generados por checklists (auxiliar / FNG / asegurabilidad / ente). */
export function isChecklistManagedDocumentTitle(title: string | null | undefined): boolean {
  const t = (title ?? '').trim()
  return (
    t.startsWith('Auxiliar —')
    || t.startsWith('FNG —')
    || t.startsWith('Asegurabilidad —')
    || t.startsWith('Ente aprobador —')
  )
}

/**
 * Documentos “libres” (no checklist): excluye IDs mapeados y títulos de checklist
 * para no re-subir ni listar como adjuntos planos lo que ya gestiona el checklist.
 */
export function filterFreeAttachmentDocuments<T extends { id?: number | null; title?: string | null }>(
  documents: T[],
  financialInfo: unknown,
): T[] {
  const mappedIds = collectChecklistDocumentIds(financialInfo)
  return documents.filter((doc) => {
    const id = typeof doc.id === 'number' ? doc.id : Number(doc.id)
    if (Number.isInteger(id) && id > 0 && mappedIds.has(id)) {
      return false
    }
    if (isChecklistManagedDocumentTitle(doc.title)) {
      return false
    }
    return true
  })
}

export function pendingFilesFromMap(files: Record<string, File | undefined> | null | undefined): File[] {
  if (!files) {
    return []
  }
  return Object.values(files).filter((f): f is File => f instanceof File)
}

type ApplicantLikeForPending = {
  documents?: Array<{ file?: File | undefined; title?: string }>
  auxiliaryDocumentFiles?: Record<string, File | undefined>
  fngDocumentFiles?: Record<string, File | undefined>
}

/** True si hay al menos un File pendiente de subir (adjuntos libres o checklists). */
export function hasPendingRadicacionDocumentUploads(form: {
  debtor?: ApplicantLikeForPending
  co_debtors?: ApplicantLikeForPending[]
  credito_garantia_fng?: boolean
}): boolean {
  const debtor = form.debtor
  if (debtor) {
    if ((debtor.documents ?? []).some(d => d.file instanceof File && Boolean(d.title?.trim()))) {
      return true
    }
    if (pendingFilesFromMap(debtor.auxiliaryDocumentFiles).length > 0) {
      return true
    }
    if (form.credito_garantia_fng && pendingFilesFromMap(debtor.fngDocumentFiles).length > 0) {
      return true
    }
  }
  for (const co of form.co_debtors ?? []) {
    if ((co.documents ?? []).some(d => d.file instanceof File && Boolean(d.title?.trim()))) {
      return true
    }
    if (pendingFilesFromMap(co.auxiliaryDocumentFiles).length > 0) {
      return true
    }
  }
  return false
}

/** Normaliza mapa id checklist desde financial_info (solo enteros > 0 / null). */
export function readDocumentIdMap(
  financialInfo: unknown,
  mapKey: (typeof CHECKLIST_MAP_KEYS)[number],
): Record<string, number | null> {
  if (!financialInfo || typeof financialInfo !== 'object' || Array.isArray(financialInfo)) {
    return {}
  }
  const raw = (financialInfo as Record<string, unknown>)[mapKey]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const out: Record<string, number | null> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null || value === '') {
      out[key] = null
      continue
    }
    const n = typeof value === 'number' ? value : Number(value)
    out[key] = Number.isInteger(n) && n > 0 ? n : null
  }
  return out
}

/**
 * Busca un documento existente por título (p. ej. al reemplazar checklist sin id en el mapa).
 * Prefiere el id más alto si hay varios (el más reciente).
 */
export function findDocumentIdByTitle(
  documents: Array<{ id?: number; title?: string | null; applicant_id?: number | null }>,
  title: string,
  applicantId?: number | null,
): number | null {
  const needle = title.trim()
  if (!needle) {
    return null
  }
  let best: number | null = null
  for (const doc of documents) {
    if ((doc.title ?? '').trim() !== needle) {
      continue
    }
    if (applicantId != null && doc.applicant_id != null && Number(doc.applicant_id) !== Number(applicantId)) {
      continue
    }
    const id = typeof doc.id === 'number' ? doc.id : Number(doc.id)
    if (!Number.isInteger(id) || id < 1) {
      continue
    }
    if (best == null || id > best) {
      best = id
    }
  }
  return best
}
