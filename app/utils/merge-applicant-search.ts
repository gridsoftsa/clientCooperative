import type { ApplicantForm } from '~/types/credit-application'
import { toDateInputFormat } from '~/utils/applicant-dates'

/**
 * Fusiona respuesta de GET /credit-applications/applicants/find en el formulario.
 * Normaliza fechas para input type="date" y mezcla `financial_info` (p. ej. activity_type).
 */
export function mergeApplicantFromApi(target: ApplicantForm, data: ApplicantForm | null | undefined): void {
  if (!data) return
  const d = data as unknown as Record<string, unknown>
  const residenceName = (d.residence_city_name as string) || (d.residence_city as { name?: string } | null)?.name || ''
  const incomingFi = d.financial_info as Record<string, unknown> | undefined
  const mergedFi =
    incomingFi && typeof incomingFi === 'object'
      ? { ...(target.financial_info ?? {}), ...incomingFi }
      : target.financial_info

  const expRaw = d.expedition_date ?? (data as ApplicantForm).expedition_date
  const birthRaw = d.birth_date ?? (data as ApplicantForm).birth_date

  Object.assign(target, {
    ...data,
    expedition_date: toDateInputFormat(expRaw != null ? String(expRaw) : undefined) ?? (data as ApplicantForm).expedition_date ?? '',
    birth_date: toDateInputFormat(birthRaw != null ? String(birthRaw) : undefined) ?? (data as ApplicantForm).birth_date ?? '',
    document_number: data.document_number,
    residence_city_name: residenceName,
    documents: target.documents ?? [],
    financial_info: mergedFi ?? target.financial_info ?? {},
  })
}
