import { toRaw } from 'vue'
import type { ApplicantDocumentForm, ApplicantForm } from '~/types/credit-application'

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function clonePendingFiles(
  files: Record<string, File | undefined> | undefined,
): Record<string, File | undefined> | undefined {
  if (!files) {
    return undefined
  }
  return { ...toRaw(files) }
}

/**
 * Copia profunda de un deudor/codeudor. Conserva `File` locales; el resto se clona
 * para que dos filas no compartan `financial_info`, referencias ni documentos.
 */
export function cloneApplicantForm(source: ApplicantForm): ApplicantForm {
  const raw = toRaw(source) as ApplicantForm
  const documents = raw.documents
  const auxiliaryDocumentFiles = raw.auxiliaryDocumentFiles
  const insurabilityDocumentFiles = raw.insurabilityDocumentFiles
  const fngDocumentFiles = raw.fngDocumentFiles
  const approverEntityDocumentFiles = raw.approverEntityDocumentFiles

  const serializable: Record<string, unknown> = { ...raw }
  delete serializable.documents
  delete serializable.auxiliaryDocumentFiles
  delete serializable.insurabilityDocumentFiles
  delete serializable.fngDocumentFiles
  delete serializable.approverEntityDocumentFiles

  const cloned = cloneJsonValue(serializable) as ApplicantForm

  cloned.documents = (documents ?? []).map((doc) => {
    const item = toRaw(doc) as ApplicantDocumentForm
    const next: ApplicantDocumentForm = {
      title: item.title,
      id: item.id,
      original_name: item.original_name,
      is_reviewed: item.is_reviewed,
      review_comment: item.review_comment,
      reviewed_at: item.reviewed_at,
    }
    if (item.file instanceof File) {
      next.file = item.file
    }
    return next
  })

  cloned.auxiliaryDocumentFiles = clonePendingFiles(auxiliaryDocumentFiles)
  cloned.insurabilityDocumentFiles = clonePendingFiles(insurabilityDocumentFiles)
  cloned.fngDocumentFiles = clonePendingFiles(fngDocumentFiles)
  cloned.approverEntityDocumentFiles = clonePendingFiles(approverEntityDocumentFiles)

  return cloned
}
