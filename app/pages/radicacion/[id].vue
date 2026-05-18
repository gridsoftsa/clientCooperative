<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import RadicacionResumenFinancieroDeudor from '~/components/radicacion/RadicacionResumenFinancieroDeudor.vue'
import RadicacionResumenFinancieroDeudorComparacion from '~/components/radicacion/RadicacionResumenFinancieroDeudorComparacion.vue'
import CreditsFinancialActivityFormList from '~/components/credits/FinancialActivityFormList.vue'
import { getCreditApplicationStatusLabel, isCreditApplicationTerminalImmutable } from '~/constants/credit-application-status'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { parseActivityTemplateList } from '~/types/credit-application'
import { normalizeFinancialInfoAliases } from '~/utils/merge-applicant-search'
import { RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK } from '~/constants/radicacion-form-catalog-fallbacks'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_ver',
})

const route = useRoute()
const router = useRouter()
const { $api, $csrf } = useNuxtApp()
const { hasPermission, hasAnyPermission } = usePermissions()
const id = computed(() => route.params.id as string)
const application = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/** Revisión documental: checklist auxiliar y tipo de actividad con permiso de subida, sin edición completa. */
const documentationUploadMode = computed(
  () =>
    application.value?.status === 'Documentation_Review'
    && hasPermission('radicacion_documentos_subir'),
)
const skipDocumentationFinancialPatch = ref(true)

/** Borrador editable: redirige a /editar. Las devoluciones (`Returned`) se quedan aquí para ver trazabilidad y motivo antes de corregir. */
const shouldRedirectDraftToEdit = computed(() =>
  Boolean(
    !loading.value
      && String(application.value?.status ?? '') === 'Draft'
      && hasAnyPermission(['radicacion_crear', 'radicacion_editar']),
  ),
)

watch(shouldRedirectDraftToEdit, async (go) => {
  if (!go || !id.value) return
  await navigateTo(`/radicacion/editar/${id.value}`, { replace: true })
})
const agencies = ref<Array<{ id: number; name: string; code?: string }>>([])
const currentStep = ref(1)
const form = ref<CreditApplicationForm>({
  debtor: {
    document_type: 'CC',
    document_number: '',
    first_name: '',
    first_last_name: '',
    dependents: 0,
    documents: [],
  },
  amount_requested: 0,
  term_months: 12,
  destination: '',
  destination_description: '',
  credito_garantia_fng: false,
  destination_activity_templates: [],
  agency_id: 0,
  status: 'Draft',
  co_debtors: [],
  numero_radicado_externo: '',
})

const stepsDeudor = [
  { num: 1, title: 'Datos del Deudor' },
  { num: 2, title: 'Actividad económica' },
  { num: 3, title: 'Datos financieros' },
  { num: 4, title: 'Datos de la Solicitud' },
  { num: 5, title: 'Codeudores' },
]

const stepsCodeudor = [
  { num: 1, title: 'Datos del Codeudor' },
  { num: 2, title: 'Actividad económica' },
  { num: 3, title: 'Datos financieros' },
]

const { formatPesosConSimbolo } = usePesosFormat()
const { viewDocumentInNewTab, downloadApplicationPdf } = useDocumentDownload()
const downloadingPdf = ref(false)
const downloadingId = ref<number | null>(null)
const deactivating = ref(false)
const deactivateDialogOpen = ref(false)
const cancelling = ref(false)
const cancelRequestDialogOpen = ref(false)
const deleteWithReason = useApiDeleteWithReason()
const { labelForValue: creditDestinationLabel, fetchOptions: fetchCreditDestinationOptions } = useTemplateFlatCatalogOptions(
  'credit-destination',
  RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK,
)
const timelineEvents = computed(() => Array.isArray(application.value?.timeline) ? application.value.timeline : [])
const timelineExpanded = ref(false)

function timelineHasReturnedEvent(events: unknown): boolean {
  if (!Array.isArray(events)) {
    return false
  }
  return events.some(
    (e: unknown) =>
      e != null
      && typeof e === 'object'
      && String((e as { to_status?: unknown }).to_status ?? '') === 'Returned',
  )
}
const directorDecision = ref<'approved' | 'returned' | ''>('')
const directorConcept = ref('')
const directorDecisionDialogOpen = ref(false)
const submittingDirectorDecision = ref(false)
const documentationDecision = ref<'approved' | 'returned' | ''>('')
const documentationConcept = ref('')
const documentationDecisionDialogOpen = ref(false)
const submittingDocumentationDecision = ref(false)
const selectedCoDebtorIndex = ref<number | null>(null)
const selectedCoDebtorStep = ref(1)
const canDirectorDecide = computed(
  () => hasPermission('radicacion_director_decidir') && application.value?.status === 'Director_Review',
)
const canDocumentationDecide = computed(
  () => hasPermission('radicacion_documentos_decidir') && application.value?.status === 'Documentation_Review',
)
const canAnalystDecide = computed(
  () => hasPermission('radicacion_analisis_guardar') && application.value?.status === 'In_Analysis',
)
const analystAlreadyApproved = computed(
  () => Boolean(application.value?.analyst_review_approved_at),
)
/** Hay aprobación previa y la decisión sigue en «aprobar»: solo se actualiza el concepto (sin cambiar estado). */
const analystConfirmIsConceptOnly = computed(
  () => Boolean(application.value?.analyst_review_approved_at) && analystDecision.value === 'approved',
)
const analystDecisionDialogTitle = computed(() => {
  if (analystConfirmIsConceptOnly.value) {
    return 'Confirmar actualización del concepto'
  }
  if (analystDecision.value === 'returned') {
    return 'Confirmar devolución del analista'
  }
  return 'Confirmar decisión del analista'
})
/** Todos los adjuntos (deudor + codeudores) deben estar marcados revisados antes del concepto. */
const allDocumentsMarkedReviewed = computed(() => {
  const docs = application.value?.documents ?? []
  if (docs.length === 0) {
    return true
  }
  return docs.every((d: { is_reviewed?: boolean }) => Boolean(d.is_reviewed))
})
const directorDecisionOptions = [
  { value: 'approved', label: 'Aprobar y enviar a revisión de documentación' },
  { value: 'returned', label: 'Devolver al asesor para ajustes' },
]
const documentationDecisionOptions = [
  { value: 'approved', label: 'Aprobar y enviar a análisis' },
  { value: 'returned', label: 'Devolver por revisión de documentos' },
]

const analystDecision = ref<'approved' | 'returned' | ''>('')
const analystConcept = ref('')
const analystDecisionDialogOpen = ref(false)
const submittingAnalystDecision = ref(false)
const analystDecisionOptions = [
  { value: 'approved', label: 'Aprobar (abre Análisis y SCORE para análisis y envío a director de crédito)' },
  { value: 'returned', label: 'Devolver al asesor para corrección (visible también para director de agencia)' },
]

const creditDirectorDecision = ref<'approved' | 'rejected' | ''>('')
const creditDirectorConcept = ref('')
const creditDirectorExceptionOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Sí' },
]
const creditDirectorIsExceptionChoice = ref<'yes' | 'no'>('no')
const creditDirectorPrivilegedOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Sí' },
]
const creditDirectorIsPrivilegedChoice = ref<'yes' | 'no'>('no')
const creditDirectorPrivilegedJustification = ref('')
const creditDirectorExceptionJustification = ref('')
const creditDirectorExceptionReasonOptions = ref<Array<{ value: string, label: string }>>([])
const creditDirectorExceptionReasonsSelected = ref<string[]>([])
const creditDirectorApproverValue = ref('')
const creditDirectorApproverOptions = ref<Array<{ value: string, label: string }>>([])
const creditDirectorDecisionDialogOpen = ref(false)
const submittingCreditDirectorDecision = ref(false)
const creditDirectorDecisionOptions = [
  { value: 'approved', label: 'Aprobar para desembolso (definitivo)' },
  { value: 'rejected', label: 'Rechazar solicitud (definitivo)' },
]
const canCreditDirectorDecide = computed(
  () => hasPermission('radicacion_director_credito_decidir') && application.value?.status === 'Credit_Director_Review',
)
const creditDirectorUseExceptionReasonCatalog = computed(
  () => creditDirectorExceptionReasonOptions.value.length > 0,
)
/** Dos columnas en la fila de justificaciones solo cuando excepción y privilegiado requieren campo a la vez. */
const creditDirectorJustificationRowTwoColumns = computed(
  () =>
    hasPermission('radicacion_marcar_privilegiado')
    && creditDirectorIsExceptionChoice.value === 'yes'
    && creditDirectorIsPrivilegedChoice.value === 'yes',
)
const analisisSnapshotForDirector = computed((): Record<string, unknown> | null => {
  const s = application.value?.analisis_score_snapshot
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    return s as Record<string, unknown>
  }
  return null
})
const showCreditDirectorFinalConcept = computed(() => {
  const st = application.value?.status
  if (st !== 'Disbursement' && st !== 'Rejected') {
    return false
  }
  return Boolean(application.value?.credit_director_concept)
})

const isTerminalImmutable = computed(() => isCreditApplicationTerminalImmutable(application.value?.status))

const cancellationActorDisplay = computed((): string => {
  const raw = application.value?.cancelled_by
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { full_name?: string | null, name?: string | null }
    return String(o.full_name || o.name || '').trim()
  }
  return ''
})

function onDirectorDecisionUpdate(value: string | null) {
  if (value === 'approved' || value === 'returned') {
    directorDecision.value = value
    return
  }
  directorDecision.value = ''
}

function onDocumentationDecisionUpdate(value: string | null) {
  if (value === 'approved' || value === 'returned') {
    documentationDecision.value = value
    return
  }
  documentationDecision.value = ''
}

function onAnalystDecisionUpdate(value: string | null) {
  if (value === 'approved' || value === 'returned') {
    analystDecision.value = value
    return
  }
  analystDecision.value = ''
}

function onCreditDirectorDecisionUpdate(value: string | null) {
  if (value === 'approved' || value === 'rejected') {
    creditDirectorDecision.value = value
    if (value === 'rejected') {
      creditDirectorApproverValue.value = ''
    }
    return
  }
  creditDirectorDecision.value = ''
}

function onCreditDirectorExceptionUpdate(value: string | null) {
  if (value === 'yes' || value === 'no') {
    creditDirectorIsExceptionChoice.value = value
    if (value === 'no') {
      creditDirectorExceptionJustification.value = ''
      creditDirectorExceptionReasonsSelected.value = []
      creditDirectorApproverValue.value = ''
    } else {
      creditDirectorExceptionReasonsSelected.value = []
    }
    return
  }
  creditDirectorIsExceptionChoice.value = 'no'
  creditDirectorExceptionJustification.value = ''
  creditDirectorExceptionReasonsSelected.value = []
  creditDirectorApproverValue.value = ''
}

function onCreditDirectorPrivilegedUpdate(value: string | null) {
  if (value === 'yes' || value === 'no') {
    creditDirectorIsPrivilegedChoice.value = value
    if (value === 'no') {
      creditDirectorPrivilegedJustification.value = ''
    }
    return
  }
  creditDirectorIsPrivilegedChoice.value = 'no'
  creditDirectorPrivilegedJustification.value = ''
}

function exceptionReasonLabelForValue(value: string): string {
  const o = creditDirectorExceptionReasonOptions.value.find(x => x.value === value)
  return o?.label ?? value
}

function creditDirectorExceptionJustificationDisplay(stored: string | null | undefined): string {
  if (stored == null || stored === '') {
    return ''
  }
  const t = stored.trim()
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t) as unknown
      if (Array.isArray(arr) && arr.every(x => typeof x === 'string')) {
        return (arr as string[]).map(v => exceptionReasonLabelForValue(v)).join(', ')
      }
    } catch {
      /* texto libre o JSON inválido */
    }
  }
  return stored
}

async function loadAprobadoresCatalog(): Promise<void> {
  try {
    const res = await $api<{ data: { options?: Array<{ value: string, label: string }> } }>(
      '/catalogs/template-flat-data/aprobadores',
    )
    const opts = res.data?.options
    creditDirectorApproverOptions.value = Array.isArray(opts) ? opts : []
  } catch (e) {
    console.error('Error cargando catálogo aprobadores:', e)
    creditDirectorApproverOptions.value = []
  }
}

async function loadExcepcionesCatalog(): Promise<void> {
  try {
    const res = await $api<{ data: { options?: Array<{ value: string, label: string }> } }>(
      '/catalogs/template-flat-data/excepciones',
    )
    const opts = res.data?.options
    creditDirectorExceptionReasonOptions.value = Array.isArray(opts) ? opts : []
  } catch (e) {
    console.error('Error cargando catálogo excepciones:', e)
    creditDirectorExceptionReasonOptions.value = []
  }
}

function approverLabelForValue(value: string | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }
  const o = creditDirectorApproverOptions.value.find(x => x.value === value)
  return o?.label ?? value
}

function onCreditDirectorApproverUpdate(value: string | null): void {
  creditDirectorApproverValue.value = value ?? ''
}

function snapshotField(key: string): string {
  const snap = analisisSnapshotForDirector.value
  if (!snap) {
    return ''
  }
  const v = snap[key]
  if (v == null) {
    return ''
  }
  return typeof v === 'string' ? v : String(v)
}

function timelineEventStatusLabel(
  status: string | null | undefined,
  role: 'from' | 'to',
  event: { event_key?: string | null },
): string {
  if (!status) {
    return '—'
  }
  return getCreditApplicationStatusLabel(status, {
    timelineEventKey: event.event_key ?? null,
    timelineRole: role,
    skipNextDirectorReview: application.value?.skip_next_director_review,
  })
}

function toggleViewCoDebtor(index: number): void {
  if (selectedCoDebtorIndex.value === index) {
    selectedCoDebtorIndex.value = null
    selectedCoDebtorStep.value = 1
    return
  }
  selectedCoDebtorIndex.value = index
  selectedCoDebtorStep.value = 1
}

function parseJsonField(val: unknown): Record<string, unknown> {
  if (val == null) return {}
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function parseReferences(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Normaliza fecha ISO (ej. 1995-06-13T00:00:00.000000Z) a yyyy-MM-dd para input type="date". */
function toDateInputFormat(val: unknown): string | undefined {
  if (val == null || val === '') return undefined
  const str = String(val).trim()
  if (!str) return undefined
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function getActivityTemplates(app: any): ActivityTemplateData[] {
  const fi = (app?.financial_info || {}) as Record<string, unknown>
  const templates = fi.activity_templates
  if (Array.isArray(templates)) {
    return templates.filter(
      (t): t is ActivityTemplateData =>
        t && typeof t === 'object' && 'sector' in t && 'template' in t && 'data' in t,
    )
  }
  return []
}

function apiApplicantToForm(api: any, docs: any[]): ApplicantForm {
  const fi = normalizeFinancialInfoAliases(parseJsonField(api?.financial_info))
  const residenceName = (typeof api?.residence_city_name === 'string' && api.residence_city_name?.trim())
    ? api.residence_city_name
    : (api?.residence_city as { name?: string } | null)?.name ?? ''
  return {
    id: typeof api?.id === 'number' ? api.id : undefined,
    document_type: api?.document_type ?? 'CC',
    document_number: api?.document_number ?? '',
    expedition_date: toDateInputFormat(api?.expedition_date) ?? api?.expedition_date,
    expedition_place: api?.expedition_place,
    first_name: api?.first_name ?? '',
    second_name: api?.second_name,
    first_last_name: api?.first_last_name ?? '',
    second_last_name: api?.second_last_name,
    birth_date: toDateInputFormat(api?.birth_date) ?? api?.birth_date,
    gender: api?.gender,
    marital_status: api?.marital_status,
    dependents: api?.dependents ?? 0,
    mobile_phone: api?.mobile_phone,
    landline: api?.landline,
    email: api?.email,
    residence_address: api?.residence_address,
    residence_city_name: residenceName,
    residence_city_id: api?.residence_city_id,
    residence_type: api?.residence_type,
    time_in_residence: api?.time_in_residence,
    occupation: api?.occupation,
    company_name: api?.company_name,
    position: api?.position,
    contract_type: api?.contract_type,
    time_in_job: api?.time_in_job,
    financial_info: fi,
    references: parseReferences(api?.references),
    documents: docs.map((d) => ({
      id: d.id,
      title: d.title || d.original_name || 'Documento',
      original_name: d.original_name,
      is_reviewed: d.is_reviewed,
      review_comment: d.review_comment,
      reviewed_at: d.reviewed_at,
    })),
  }
}

const debtor = computed(() => {
  const app = application.value
  if (!app) return null
  if (app.debtor && typeof app.debtor === 'object') {
    return { ...app.debtor, financial_info: parseJsonField(app.debtor.financial_info), references: parseReferences(app.debtor.references) }
  }
  const apps = app.applicants ?? []
  const pivots = app.application_applicants ?? app.applicationApplicants ?? []
  const debtorPivot = pivots.find((p: any) => (p.role ?? p.Role) === 'DEUDOR')
  if (debtorPivot) {
    const applicant = apps.find((a: any) => a.id === debtorPivot.applicant_id)
    if (applicant) {
      return {
        ...applicant,
        financial_info: parseJsonField(debtorPivot.financial_info),
        references: parseReferences(debtorPivot.references),
      }
    }
  }
  const withPivot = apps.find((a: any) => (a.pivot?.role ?? a.pivot?.Role) === 'DEUDOR')
  if (withPivot) {
    return {
      ...withPivot,
      financial_info: parseJsonField(withPivot.pivot?.financial_info),
      references: parseReferences(withPivot.pivot?.references),
    }
  }
  if (apps.length) {
    const first = apps[0]
    const pivot = first.pivot ?? {}
    return {
      ...first,
      financial_info: parseJsonField(pivot.financial_info),
      references: parseReferences(pivot.references),
    }
  }
  return null
})

const coDebtors = computed(() => {
  const app = application.value
  if (!app) return []
  if (Array.isArray(app.co_debtors) && app.co_debtors.length) {
    return app.co_debtors.map((c: any) => ({
      ...c,
      financial_info: parseJsonField(c.financial_info),
      references: parseReferences(c.references),
    }))
  }
  const apps = app.applicants ?? []
  const pivots = app.application_applicants ?? app.applicationApplicants ?? []
  const coPivots = pivots.filter((p: any) => (p.role ?? p.Role) === 'CODEUDOR')
  if (coPivots.length) {
    return coPivots
      .map((pivot: any) => {
        const applicant = apps.find((a: any) => a.id === pivot.applicant_id)
        return applicant ? { ...applicant, financial_info: parseJsonField(pivot.financial_info), references: parseReferences(pivot.references) } : null
      })
      .filter(Boolean)
  }
  return apps
    .filter((a: any) => (a.pivot?.role ?? a.pivot?.Role) === 'CODEUDOR')
    .map((a: any) => ({
      ...a,
      financial_info: parseJsonField(a.pivot?.financial_info),
      references: parseReferences(a.pivot?.references),
    }))
})

const documentsByApplicant = computed(() => {
  const docs = application.value?.documents ?? []
  const byApplicant: Record<string, any[]> = {}
  for (const doc of docs) {
    const aid = doc.applicant_id
    if (aid == null) continue
    const key = String(aid)
    if (!byApplicant[key]) byApplicant[key] = []
    byApplicant[key].push(doc)
  }
  return byApplicant
})

function getDocumentsForApplicant(applicantId: number | string | null | undefined): any[] {
  if (applicantId == null) return []
  return documentsByApplicant.value[String(applicantId)] ?? []
}

function fullName(a: any): string {
  return [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean).join(' ') || '-'
}

function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('es-CO')
}

async function handleDownloadPdf() {
  if (!application.value?.id || downloadingPdf.value) return
  downloadingPdf.value = true
  try {
    await downloadApplicationPdf(application.value.id, `solicitud-${application.value.code ?? application.value.id}.pdf`)
    const { toast } = await import('vue-sonner')
    toast.success('PDF abierto en una nueva pestaña. Puede guardarlo desde el visor si lo desea.')
  } catch (e) {
    console.error('Error abriendo PDF:', e)
    const { toast } = await import('vue-sonner')
    toast.error('No se pudo abrir el PDF')
  } finally {
    downloadingPdf.value = false
  }
}

function openDeactivateDialog() {
  if (!application.value?.id || deactivating.value)
    return
  if (isCreditApplicationTerminalImmutable(application.value?.status)) {
    toast.error('Las solicitudes en desembolso, rechazadas o canceladas no se pueden desactivar.')
    return
  }
  deactivateDialogOpen.value = true
}

function openCancelRequestDialog() {
  if (!application.value?.id || cancelling.value)
    return
  if (isCreditApplicationTerminalImmutable(application.value?.status)) {
    toast.error('Esta solicitud ya está en un estado cerrado y no admite cancelación.')
    return
  }
  cancelRequestDialogOpen.value = true
}

async function onCancelRequestConfirm(reason: string) {
  if (!application.value?.id || cancelling.value)
    return
  cancelling.value = true
  try {
    await $csrf()
    await $api(`/credit-applications/${application.value.id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    })
    cancelRequestDialogOpen.value = false
    toast.success('Solicitud cancelada', {
      description: 'El proceso de radicación quedó detenido.',
      duration: 5000,
    })
    await fetchApplication()
  } catch (e: any) {
    console.error('Error cancelando solicitud:', e)
    toast.error(e?.data?.message ?? 'No se pudo cancelar la solicitud.')
  } finally {
    cancelling.value = false
  }
}

async function onDeactivateConfirm(reason: string) {
  if (!application.value?.id || deactivating.value)
    return
  deactivating.value = true
  try {
    await deleteWithReason(`/credit-applications/${application.value.id}`, reason)
    deactivateDialogOpen.value = false
    toast.success('Solicitud desactivada', {
      description: 'La solicitud ya no aparecerá en el listado.',
      duration: 4000,
    })
    await router.push('/radicacion')
  } catch (e: any) {
    console.error('Error desactivando:', e)
    toast.error(e?.data?.message ?? 'No se pudo desactivar')
  } finally {
    deactivating.value = false
  }
}

async function handleViewDocument(doc: { id: number; title?: string; original_name?: string }) {
  if (downloadingId.value) return
  const docId = Number(doc?.id)
  if (!Number.isFinite(docId) || docId < 1) {
    toast.error('Documento no válido. Recargue la ficha e intente de nuevo.')
    return
  }
  downloadingId.value = doc.id
  try {
    await viewDocumentInNewTab(application.value.id, doc.id)
  } catch (e) {
    console.error('Error abriendo documento:', e)
    const { toast } = await import('vue-sonner')
    const msg = e instanceof Error && e.message ? e.message : 'No se pudo abrir el documento.'
    toast.error(msg)
  } finally {
    downloadingId.value = null
  }
}

function openDirectorDecisionDialog() {
  if (submittingDirectorDecision.value) {
    return
  }
  if (directorDecision.value === '') {
    toast.error('Selecciona la decisión del director.')
    return
  }
  if (directorConcept.value.trim().length < 5) {
    toast.error('Escribe un concepto del director de al menos 5 caracteres.')
    return
  }
  directorDecisionDialogOpen.value = true
}

function openAnalystDecisionDialog() {
  if (submittingAnalystDecision.value) {
    return
  }
  if (analystDecision.value === '') {
    toast.error('Selecciona la decisión del analista.')
    return
  }
  if (analystConcept.value.trim().length < 5) {
    toast.error('Escribe un concepto del analista de al menos 5 caracteres.')
    return
  }
  analystDecisionDialogOpen.value = true
}

async function confirmAnalystDecision() {
  const decision = analystDecision.value
  const updatingConceptOnly = analystConfirmIsConceptOnly.value
  if (!application.value?.id || decision === '' || submittingAnalystDecision.value) {
    return
  }
  const wasReturned = decision === 'returned'
  submittingAnalystDecision.value = true
  try {
    await $csrf()
    await $api(`/credit-applications/${application.value.id}/analyst-decision`, {
      method: 'PATCH',
      body: {
        decision,
        concept: analystConcept.value.trim(),
      },
    })
    analystDecisionDialogOpen.value = false
    if (updatingConceptOnly) {
      toast.success('Concepto del analista actualizado.')
      await fetchApplication()
      return
    }
    toast.success(
      wasReturned
        ? 'Radicación devuelta al asesor.'
        : 'Decisión del analista registrada correctamente.',
      wasReturned
        ? {
            description:
              'Dejó de aparecer en el listado por defecto del analista (solo «En análisis»). Para localizarla, use el filtro de estado «Devuelta (ajustes pendientes)».',
            duration: 10000,
          }
        : undefined,
    )
    if (wasReturned) {
      await navigateTo('/radicacion')
    } else {
      await navigateTo({
        path: '/radicacion/analisis-score',
        query: { solicitud: String(application.value.id) },
      })
    }
  } catch (e: any) {
    console.error('Error registrando decisión del analista:', e)
    toast.error(e?.data?.message ?? 'No se pudo registrar la decisión del analista.')
  } finally {
    submittingAnalystDecision.value = false
  }
}

async function confirmDirectorDecision() {
  if (!application.value?.id || directorDecision.value === '' || submittingDirectorDecision.value) {
    return
  }
  submittingDirectorDecision.value = true
  try {
    await $csrf()
    await $api(`/credit-applications/${application.value.id}/director-decision`, {
      method: 'PATCH',
      body: {
        decision: directorDecision.value,
        concept: directorConcept.value.trim(),
      },
    })
    directorDecisionDialogOpen.value = false
    toast.success('Decisión del director registrada correctamente.')
    await navigateTo('/radicacion')
  } catch (e: any) {
    console.error('Error registrando decisión de director:', e)
    toast.error(e?.data?.message ?? 'No se pudo registrar la decisión del director.')
  } finally {
    submittingDirectorDecision.value = false
  }
}

function openCreditDirectorDecisionDialog() {
  if (submittingCreditDirectorDecision.value) {
    return
  }
  if (creditDirectorDecision.value === '') {
    toast.error('Selecciona la decisión del director de crédito.')
    return
  }
  if (creditDirectorConcept.value.trim().length < 25) {
    toast.error('El concepto debe ser claro y estructurado (mínimo 25 caracteres). Incluya antecedentes, análisis y decisión fundamentada.')
    return
  }
  if (creditDirectorIsExceptionChoice.value === 'yes') {
    if (creditDirectorUseExceptionReasonCatalog.value) {
      if (creditDirectorExceptionReasonsSelected.value.length < 1) {
        toast.error('Seleccione al menos un motivo de excepción.')
        return
      }
    } else if (creditDirectorExceptionJustification.value.trim().length < 10) {
      toast.error('Si marca excepción, la justificación debe tener al menos 10 caracteres.')
      return
    }
  } else if (creditDirectorDecision.value === 'approved') {
    if (creditDirectorApproverValue.value.trim() === '') {
      toast.error('Seleccione el ente aprobador.')
      return
    }
  }
  if (hasPermission('radicacion_marcar_privilegiado') && creditDirectorIsPrivilegedChoice.value === 'yes') {
    if (creditDirectorPrivilegedJustification.value.trim().length < 10) {
      toast.error('Indique la justificación por la cual la solicitud es privilegiada (mínimo 10 caracteres).')
      return
    }
  }
  creditDirectorDecisionDialogOpen.value = true
}

async function confirmCreditDirectorDecision() {
  if (!application.value?.id || creditDirectorDecision.value === '' || submittingCreditDirectorDecision.value) {
    return
  }
  submittingCreditDirectorDecision.value = true
  try {
    await $csrf()
    const isEx = creditDirectorIsExceptionChoice.value === 'yes'
    let exceptionJustificationPayload: string | string[] | null = null
    if (isEx) {
      if (creditDirectorUseExceptionReasonCatalog.value) {
        exceptionJustificationPayload = [...creditDirectorExceptionReasonsSelected.value]
      } else {
        exceptionJustificationPayload = creditDirectorExceptionJustification.value.trim()
      }
    }
    const body: Record<string, unknown> = {
      decision: creditDirectorDecision.value,
      concept: creditDirectorConcept.value.trim(),
      is_exception: isEx,
      exception_justification: exceptionJustificationPayload,
      approver_value: !isEx && creditDirectorDecision.value === 'approved'
        ? creditDirectorApproverValue.value.trim()
        : null,
    }
    if (hasPermission('radicacion_marcar_privilegiado')) {
      const isPriv = creditDirectorIsPrivilegedChoice.value === 'yes'
      body.is_privileged = isPriv
      body.privileged_justification = isPriv ? creditDirectorPrivilegedJustification.value.trim() : null
    }
    await $api(`/credit-applications/${application.value.id}/credit-director-decision`, {
      method: 'PATCH',
      body,
    })
    creditDirectorDecisionDialogOpen.value = false
    toast.success('Decisión del director de crédito registrada correctamente.')
    await navigateTo('/radicacion')
  } catch (e: any) {
    console.error('Error registrando decisión del director de crédito:', e)
    toast.error(e?.data?.message ?? 'No se pudo registrar la decisión del director de crédito.')
  } finally {
    submittingCreditDirectorDecision.value = false
  }
}

function openDocumentationDecisionDialog() {
  if (submittingDocumentationDecision.value) {
    return
  }
  if (!allDocumentsMarkedReviewed.value) {
    toast.error('Marca como revisados todos los documentos del deudor y codeudores antes de registrar el concepto.')
    return
  }
  if (documentationDecision.value === '') {
    toast.error('Selecciona la decisión de revisión de documentos.')
    return
  }
  if (documentationConcept.value.trim().length < 5) {
    toast.error('Escribe un concepto de revisión de documentos de al menos 5 caracteres.')
    return
  }
  documentationDecisionDialogOpen.value = true
}

async function confirmDocumentationDecision() {
  if (!application.value?.id || documentationDecision.value === '' || submittingDocumentationDecision.value) {
    return
  }
  if (!allDocumentsMarkedReviewed.value) {
    toast.error('Marca como revisados todos los documentos del deudor y codeudores antes de registrar el concepto.')
    return
  }
  submittingDocumentationDecision.value = true
  try {
    await $csrf()
    const documentsPayload = (application.value?.documents ?? []).map((doc: any) => ({
      id: Number(doc.id),
      is_reviewed: Boolean(doc.is_reviewed),
      review_comment: String(doc.review_comment ?? '').trim(),
    }))
    await $api(`/credit-applications/${application.value.id}/documentation-decision`, {
      method: 'PATCH',
      body: {
        decision: documentationDecision.value,
        concept: documentationConcept.value.trim(),
        documents: documentsPayload,
      },
    })
    documentationDecisionDialogOpen.value = false
    toast.success('Decisión de revisión de documentos registrada correctamente.')
    await navigateTo('/radicacion')
  } catch (e: any) {
    console.error('Error registrando decisión de revisión de documentos:', e)
    toast.error(e?.data?.message ?? 'No se pudo registrar la decisión de revisión de documentos.')
  } finally {
    submittingDocumentationDecision.value = false
  }
}

function syncFormFromApplication() {
  const app = application.value
  if (!app || !debtor.value) return
  const debtorDocs = getDocumentsForApplicant(debtor.value.id)
  form.value = {
    debtor: apiApplicantToForm(debtor.value, debtorDocs),
    amount_requested: Number(app.amount_requested) || 0,
    term_months: app.term_months ?? 12,
    destination: app.destination ?? '',
    destination_description: app.destination_description ?? '',
    credito_garantia_fng: app.credito_garantia_fng === true,
    destination_activity_templates: parseActivityTemplateList(app.destination_activity_templates),
    agency_id: app.agency_id ?? 0,
    status: app.status ?? 'Draft',
    numero_radicado_externo: app.numero_radicado_externo ?? '',
    co_debtors: coDebtors.value.map((c: (typeof coDebtors.value)[number]) => {
      const docs = getDocumentsForApplicant(c.id)
      return apiApplicantToForm(c, docs)
    }),
  }
}

async function fetchApplication() {
  loading.value = true
  error.value = null
  try {
    const res = await $api<{ data: any }>(`/credit-applications/${id.value}`)
    const data = res?.data ?? res
    application.value = {
      ...data,
      documents: Array.isArray(data?.documents) ? data.documents : [],
    }
    await fetchCreditDestinationOptions()
    if (String(application.value?.status ?? '') === 'Returned') {
      timelineExpanded.value = true
    } else if (
      application.value?.skip_next_director_review === true
      || application.value?.resubmit_to_analyst_after_return === true
      || timelineHasReturnedEvent(application.value?.timeline)
    ) {
      timelineExpanded.value = true
    }
    if (String(application.value?.status ?? '') === 'Draft' && hasAnyPermission(['radicacion_crear', 'radicacion_editar'])) {
      await navigateTo(`/radicacion/editar/${id.value}`, { replace: true })
      return
    }
    skipDocumentationFinancialPatch.value = true
    syncFormFromApplication()
    syncAnalystFieldsFromApplication()
    syncCreditDirectorPrivilegedFromApplication()
    await nextTick()
    skipDocumentationFinancialPatch.value = false
    if (
      application.value?.status === 'Credit_Director_Review'
      || application.value?.credit_director_is_exception
    ) {
      await loadAprobadoresCatalog()
      await loadExcepcionesCatalog()
    }
  } catch (e) {
    console.error('Error cargando solicitud:', e)
    error.value = 'No se pudo cargar la solicitud'
    application.value = null
  } finally {
    loading.value = false
  }
}

function syncAnalystFieldsFromApplication(): void {
  if (!application.value) {
    return
  }
  if (!application.value.analyst_review_approved_at) {
    analystDecision.value = ''
    analystConcept.value = ''
    return
  }
  const c = application.value.analyst_review_approved_concept
  if (typeof c === 'string') {
    analystConcept.value = c
  }
  analystDecision.value = 'approved'
}

function syncCreditDirectorPrivilegedFromApplication(): void {
  if (!application.value) {
    return
  }
  creditDirectorIsPrivilegedChoice.value = application.value.is_privileged === true ? 'yes' : 'no'
  creditDirectorPrivilegedJustification.value = typeof application.value.privileged_justification === 'string'
    ? application.value.privileged_justification
    : ''
}

function buildDocumentationFinancialPatch(fi: unknown): {
  activity_type?: string
  auxiliaryDocuments?: Record<string, number | null>
} {
  if (!fi || typeof fi !== 'object') {
    return {}
  }
  const o = fi as Record<string, unknown>
  const patch: {
    activity_type?: string
    auxiliaryDocuments?: Record<string, number | null>
  } = {}
  if ('activity_type' in o) {
    const at = o.activity_type
    if (at == null || at === '') {
      patch.activity_type = ''
    } else {
      patch.activity_type = typeof at === 'string' ? at : String(at)
    }
  }
  if (
    'auxiliaryDocuments' in o
    && o.auxiliaryDocuments
    && typeof o.auxiliaryDocuments === 'object'
    && !Array.isArray(o.auxiliaryDocuments)
  ) {
    const raw = o.auxiliaryDocuments as Record<string, unknown>
    const clean: Record<string, number | null> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (v == null || v === '') {
        clean[k] = null
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        clean[k] = v
      } else if (typeof v === 'string' && /^\d+$/.test(v)) {
        clean[k] = parseInt(v, 10)
      }
    }
    patch.auxiliaryDocuments = clean
  }
  return patch
}

function patchApplicationDebtorFinancialCache(fi: Record<string, unknown>): void {
  const app = application.value
  if (!app) {
    return
  }
  const rows = app.application_applicants ?? app.applicationApplicants ?? []
  const pivot = rows.find((r: any) => (r.role ?? r.Role) === 'DEUDOR')
  if (pivot) {
    pivot.financial_info = fi
  }
  if (app.debtor && typeof app.debtor === 'object') {
    (app.debtor as { financial_info?: unknown }).financial_info = fi
  }
}

function patchApplicationCodeudorFinancialCache(applicantId: number, fi: Record<string, unknown>): void {
  const app = application.value
  if (!app) {
    return
  }
  const rows = app.application_applicants ?? app.applicationApplicants ?? []
  const pivot = rows.find(
    (r: any) => (r.role ?? r.Role) === 'CODEUDOR' && Number(r.applicant_id) === applicantId,
  )
  if (pivot) {
    pivot.financial_info = fi
  }
  const coList = app.coDebtors ?? app.co_debtors ?? []
  const coRow = coList.find((c: any) => Number(c.applicant_id ?? c.applicantId) === applicantId)
  if (coRow && typeof coRow === 'object') {
    (coRow as { financial_info?: unknown }).financial_info = fi
  }
}

const pushDebtorDocumentationFinancial = useDebounceFn(async () => {
  if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value || !application.value?.id) {
    return
  }
  const patch = buildDocumentationFinancialPatch(form.value.debtor.financial_info)
  if (Object.keys(patch).length === 0) {
    return
  }
  try {
    await $csrf()
    await $api(`/credit-applications/${application.value.id}/documentation-applicant-financial`, {
      method: 'PATCH',
      body: { role: 'DEUDOR', financial_info: patch },
    })
    const fi = form.value.debtor.financial_info
    if (fi && typeof fi === 'object') {
      patchApplicationDebtorFinancialCache(fi as Record<string, unknown>)
    }
  } catch (e: any) {
    console.error(e)
    toast.error(e?.data?.message ?? 'No se pudo guardar el tipo de actividad o documentos auxiliares del deudor')
  }
}, 500)

const pushCodeudorDocumentationFinancial = useDebounceFn(async (applicantId: number) => {
  if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value || !application.value?.id) {
    return
  }
  const idx = selectedCoDebtorIndex.value
  if (idx == null) {
    return
  }
  const co = form.value.co_debtors[idx]
  if (!co || Number(co.id) !== applicantId) {
    return
  }
  const patch = buildDocumentationFinancialPatch(co.financial_info)
  if (Object.keys(patch).length === 0) {
    return
  }
  try {
    await $csrf()
    await $api(`/credit-applications/${application.value.id}/documentation-applicant-financial`, {
      method: 'PATCH',
      body: { role: 'CODEUDOR', applicant_id: applicantId, financial_info: patch },
    })
    const fi = co.financial_info
    if (fi && typeof fi === 'object') {
      patchApplicationCodeudorFinancialCache(applicantId, fi as Record<string, unknown>)
    }
  } catch (e: any) {
    console.error(e)
    toast.error(e?.data?.message ?? 'No se pudo guardar el tipo de actividad o documentos auxiliares del codeudor')
  }
}, 500)

watch(
  () => form.value.debtor.financial_info,
  () => {
    void pushDebtorDocumentationFinancial()
  },
  { deep: true },
)

watch(
  () => ({
    idx: selectedCoDebtorIndex.value,
    id: selectedCoDebtorIndex.value != null ? form.value.co_debtors[selectedCoDebtorIndex.value]?.id : null,
    fi: selectedCoDebtorIndex.value != null ? form.value.co_debtors[selectedCoDebtorIndex.value]?.financial_info : null,
  }),
  (state) => {
    if (state.id == null || typeof state.id !== 'number') {
      return
    }
    void pushCodeudorDocumentationFinancial(state.id)
  },
  { deep: true },
)

async function fetchCatalogs() {
  try {
    const agenciesRes = await $api<{ data: typeof agencies.value }>('/catalogs/agencies')
    agencies.value = agenciesRes.data
  } catch (e) {
    console.error('Error cargando catálogos:', e)
  }
}

onMounted(() => {
  fetchApplication()
  fetchCatalogs()
})
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col gap-4 px-0">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Ver Radicación
        </h2>
        <p class="text-muted-foreground">
          <template v-if="documentationUploadMode">
            Revisión de documentación: puede ajustar el tipo de actividad económica y el checklist auxiliar de documentos (deudor y codeudores).
          </template>
          <template v-else>
            Solicitud de crédito — solo lectura
          </template>
        </p>
        <p v-if="isTerminalImmutable" class="mt-1 text-sm font-medium text-amber-900 dark:text-amber-100">
          Estado cerrado (desembolso, rechazada o cancelada): no se permiten cambios ni desactivación; cualquier rol solo puede consultar.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar']">
          <Button
            v-if="(application?.status === 'Draft' || application?.status === 'Returned') && application?.id"
            variant="warning"
            as-child
          >
            <NuxtLink :to="`/radicacion/editar/${application.id}`">
              <Icon name="i-lucide-pencil" class="mr-2 h-4 w-4" />
              {{ application?.status === 'Returned' ? 'Corregir radicación' : 'Editar' }}
            </NuxtLink>
          </Button>
        </PermissionGate>
        <PermissionGate permission="radicacion_descargar_pdf">
          <Button
            variant="outline"
            :disabled="downloadingPdf"
            class="!border-red-200/90 !bg-red-50 text-red-900 hover:!border-red-300 hover:!bg-red-100 dark:!border-red-800/50 dark:!bg-red-950/45 dark:text-red-100 dark:hover:!border-red-700 dark:hover:!bg-red-950/70"
            @click="handleDownloadPdf"
          >
            <Icon
              :name="downloadingPdf ? 'i-lucide-loader-2' : 'i-simple-icons-adobeacrobatreader'"
              class="mr-2 h-4 w-4 text-red-600 dark:text-red-300"
              :class="{ 'animate-spin': downloadingPdf }"
            />
            {{ downloadingPdf ? 'Abriendo…' : 'Ver PDF' }}
          </Button>
        </PermissionGate>
        <Button variant="outline" class="shrink-0" @click="router.push('/radicacion')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
        <PermissionGate permission="radicacion_cancelar">
          <Button
            v-if="!isTerminalImmutable"
            variant="outline"
            class="border-destructive/40 text-destructive hover:bg-destructive/10"
            :disabled="cancelling"
            @click="openCancelRequestDialog"
          >
            <Icon :name="cancelling ? 'i-lucide-loader-2' : 'i-lucide-circle-x'" class="mr-2 h-4 w-4" :class="{ 'animate-spin': cancelling }" />
            {{ cancelling ? 'Cancelando…' : 'Cancelar solicitud' }}
          </Button>
        </PermissionGate>
        <PermissionGate permission="radicacion_desactivar">
          <Button
            v-if="!isTerminalImmutable"
            variant="destructive"
            :disabled="deactivating"
            @click="openDeactivateDialog"
          >
            <Icon :name="deactivating ? 'i-lucide-loader-2' : 'i-lucide-ban'" class="mr-2 h-4 w-4" :class="{ 'animate-spin': deactivating }" />
            {{ deactivating ? 'Desactivando...' : 'Desactivar' }}
          </Button>
        </PermissionGate>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
      <p class="text-destructive font-medium">{{ error }}</p>
      <Button variant="outline" class="mt-4" @click="router.push('/radicacion')">
        Ir a lista
      </Button>
    </div>

    <template v-else-if="application && debtor">
      <Card
        v-if="application.status === 'Cancelled'"
        class="border-destructive/40 bg-destructive/5"
      >
        <CardHeader>
          <CardTitle class="text-destructive">
            Solicitud cancelada
          </CardTitle>
          <CardDescription>
            El proceso de radicación fue detenido. Los datos permanecen consultables.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <p>
            <span class="font-medium text-foreground">Motivo:</span>
            {{ application.cancellation_reason || '—' }}
          </p>
          <p>
            <span class="font-medium text-foreground">Fecha:</span>
            {{ application.cancelled_at ? formatEventDate(application.cancelled_at) : '—' }}
          </p>
          <p v-if="cancellationActorDisplay">
            <span class="font-medium text-foreground">Canceló:</span>
            {{ cancellationActorDisplay }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <CardTitle>Trazabilidad</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="timelineExpanded = !timelineExpanded"
            >
              <Icon :name="timelineExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="mr-2 h-4 w-4" />
              {{ timelineExpanded ? 'Contraer' : 'Expandir' }}
            </Button>
          </div>
          <CardDescription>Registro de cambios de estado y acciones relevantes de la radicación.</CardDescription>
        </CardHeader>
        <CardContent v-if="timelineExpanded">
          <div v-if="timelineEvents.length === 0" class="text-sm text-muted-foreground">
            Aún no hay eventos de trazabilidad.
          </div>
          <div v-else class="space-y-3">
            <div v-for="event in timelineEvents" :key="event.id" class="rounded-lg border p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-medium">{{ event.title }}</p>
                <span class="text-xs text-muted-foreground">{{ formatEventDate(event.created_at) }}</span>
              </div>
              <p v-if="event.description" class="mt-1 text-sm text-muted-foreground">{{ event.description }}</p>
              <p v-if="event.from_status || event.to_status" class="mt-2 text-xs text-muted-foreground">
                Estado:
                <span class="font-medium text-foreground">{{ event.from_status ? timelineEventStatusLabel(event.from_status, 'from', event) : '—' }}</span>
                →
                <span class="font-medium text-foreground">{{ event.to_status ? timelineEventStatusLabel(event.to_status, 'to', event) : '—' }}</span>
              </p>
              <p v-if="event.actor?.name" class="mt-1 text-xs text-muted-foreground">
                Por: <span class="font-medium text-foreground">{{ event.actor.name }}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="showCreditDirectorFinalConcept">
        <CardHeader>
          <CardTitle>Concepto final — director de crédito</CardTitle>
          <CardDescription>
            Registro de la decisión definitiva sobre esta solicitud.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <p v-if="application?.credit_director_decision_at" class="text-muted-foreground">
            Fecha: {{ formatEventDate(application.credit_director_decision_at) }}
          </p>
          <p>
            <span class="text-muted-foreground">Es privilegiado:</span>
            {{ application?.is_privileged === true ? 'Sí' : 'No' }}
          </p>
          <p
            v-if="application?.is_privileged === true && application?.privileged_justification"
            class="whitespace-pre-wrap rounded-md border bg-muted/20 p-3"
          >
            <span class="text-muted-foreground">Justificación (privilegiado):</span>
            {{ application.privileged_justification }}
          </p>
          <div
            v-if="application?.credit_director_is_exception"
            class="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
          >
            <p class="font-medium text-foreground">
              Excepción: Sí
            </p>
            <p
              v-if="!application?.credit_director_is_exception && application?.credit_director_approver_value"
              class="text-sm"
            >
              <span class="text-muted-foreground">Ente aprobador:</span>
              {{ approverLabelForValue(application.credit_director_approver_value) }}
            </p>
            <p class="whitespace-pre-wrap">
              <span class="text-muted-foreground">Justificación:</span>
              {{ creditDirectorExceptionJustificationDisplay(application?.credit_director_exception_justification) }}
            </p>
          </div>
          <p class="whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
            {{ application?.credit_director_concept }}
          </p>
        </CardContent>
      </Card>

      <Card v-if="canCreditDirectorDecide">
        <CardHeader>
          <CardTitle>Decisión final — director de crédito</CardTitle>
          <CardDescription>
            Revise la radicación y el SCORE. Esta decisión es definitiva: si aprueba, la solicitud pasa a
            <strong>desembolso</strong>; si rechaza, queda en estado <strong>rechazado</strong>. Debe dejar un concepto claro y estructurado.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="rounded-lg border bg-muted/20 p-4 space-y-2">
            <p class="text-sm font-medium">
              Resumen Análisis y SCORE
            </p>
            <template v-if="analisisSnapshotForDirector">
              <dl class="grid gap-1 text-sm sm:grid-cols-2">
                <div v-if="snapshotField('nivel_riesgo')">
                  <dt class="text-muted-foreground">
                    Nivel de riesgo
                  </dt>
                  <dd class="font-medium">
                    {{ snapshotField('nivel_riesgo') }}
                  </dd>
                </div>
                <div v-if="snapshotField('nivel_ifs')">
                  <dt class="text-muted-foreground">
                    Nivel IFS
                  </dt>
                  <dd class="font-medium">
                    {{ snapshotField('nivel_ifs') }}
                  </dd>
                </div>
              </dl>
              <p v-if="snapshotField('concepto_analista')" class="text-sm text-muted-foreground mt-2">
                <span class="font-medium text-foreground">Concepto del analista (cierre):</span>
                {{ snapshotField('concepto_analista') }}
              </p>
            </template>
            <p v-else class="text-sm text-muted-foreground">
              No hay resumen SCORE en esta respuesta. Abra la hoja completa para revisar.
            </p>
            <Button variant="outline" size="sm" class="mt-2" as-child>
              <NuxtLink
                :to="{ path: '/radicacion/analisis-score', query: { solicitud: String(application?.id ?? '') } }"
              >
                <Icon name="i-lucide-chart-column-increasing" class="mr-2 h-4 w-4" />
                Abrir Análisis y SCORE (lectura)
              </NuxtLink>
            </Button>
          </div>
          <div class="space-y-1.5">
            <Label for="credit_director_decision">Decisión *</Label>
            <Multiselect
              id="credit_director_decision"
              :model-value="creditDirectorDecision === '' ? null : creditDirectorDecision"
              :options="creditDirectorDecisionOptions"
              value-prop="value"
              label="label"
              mode="single"
              :can-clear="false"
              :searchable="false"
              placeholder="Seleccionar decisión"
              class="multiselect-director"
              @update:model-value="onCreditDirectorDecisionUpdate"
            />
          </div>
          <div
            class="grid gap-4"
            :class="hasPermission('radicacion_marcar_privilegiado') ? 'sm:grid-cols-2' : ''"
          >
            <div class="space-y-1.5">
              <Label for="credit_director_exception">¿Es una excepción? *</Label>
              <Multiselect
                id="credit_director_exception"
                :model-value="creditDirectorIsExceptionChoice"
                :options="creditDirectorExceptionOptions"
                value-prop="value"
                label="label"
                mode="single"
                :can-clear="false"
                :searchable="false"
                placeholder="Seleccionar"
                class="multiselect-director"
                @update:model-value="onCreditDirectorExceptionUpdate"
              />
              <p class="text-xs text-muted-foreground">
                Por defecto «No». Si elige «Sí», debe indicar la justificación según la parametrización (lista de motivos o texto libre si el catálogo está vacío). Si no es excepción y aprueba, seleccione el ente aprobador.
              </p>
            </div>
            <div
              v-if="hasPermission('radicacion_marcar_privilegiado')"
              class="space-y-1.5"
            >
              <Label for="credit_director_privileged">¿Es privilegiado? *</Label>
              <Multiselect
                id="credit_director_privileged"
                :model-value="creditDirectorIsPrivilegedChoice"
                :options="creditDirectorPrivilegedOptions"
                value-prop="value"
                label="label"
                mode="single"
                :can-clear="false"
                :searchable="false"
                placeholder="Seleccionar"
                class="multiselect-director"
                @update:model-value="onCreditDirectorPrivilegedUpdate"
              />
              <p class="text-xs text-muted-foreground">
                Queda guardado en la solicitud para informes y seguimiento.
              </p>
            </div>
          </div>
          <div
            v-if="creditDirectorIsExceptionChoice === 'yes' || (hasPermission('radicacion_marcar_privilegiado') && creditDirectorIsPrivilegedChoice === 'yes')"
            class="grid gap-4 items-start"
            :class="creditDirectorJustificationRowTwoColumns ? 'sm:grid-cols-2' : ''"
          >
            <div
              v-if="creditDirectorIsExceptionChoice === 'yes'"
              class="space-y-1.5 min-w-0"
            >
              <div v-if="creditDirectorUseExceptionReasonCatalog" class="space-y-1.5">
                <Label for="credit_director_exception_reasons">Justificación de la excepción *</Label>
                <Multiselect
                  id="credit_director_exception_reasons"
                  v-model="creditDirectorExceptionReasonsSelected"
                  mode="multiple"
                  :object="false"
                  :options="creditDirectorExceptionReasonOptions"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :close-on-select="false"
                  :hide-selected="false"
                  placeholder="Seleccione uno o más motivos"
                  no-options-text="No hay motivos parametrizados"
                  no-results-text="Sin coincidencias"
                  class="multiselect-director"
                />
                <p class="text-xs text-muted-foreground">
                  Puede elegir más de un motivo.
                </p>
              </div>
              <div v-else class="space-y-1.5">
                <Label for="credit_director_exception_justification">Justificación de la excepción *</Label>
                <textarea
                  id="credit_director_exception_justification"
                  v-model="creditDirectorExceptionJustification"
                  rows="4"
                  class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Explique por qué esta operación se considera excepción."
                />
                <p class="text-xs text-muted-foreground">
                  Mínimo 10 caracteres (catálogo de excepciones sin opciones).
                </p>
              </div>
            </div>
            <div
              v-if="hasPermission('radicacion_marcar_privilegiado') && creditDirectorIsPrivilegedChoice === 'yes'"
              class="space-y-1.5 min-w-0"
            >
              <Label for="credit_director_privileged_justification">Justificación (privilegiado) *</Label>
              <textarea
                id="credit_director_privileged_justification"
                v-model="creditDirectorPrivilegedJustification"
                rows="4"
                class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Explique por qué esta solicitud se considera privilegiada."
              />
              <p class="text-xs text-muted-foreground">
                Mínimo 10 caracteres.
              </p>
            </div>
          </div>
          <div
            v-if="creditDirectorIsExceptionChoice === 'no' && creditDirectorDecision === 'approved'"
            class="space-y-1.5"
          >
            <Label for="credit_director_approver">Ente aprobador *</Label>
            <Multiselect
              id="credit_director_approver"
              :model-value="creditDirectorApproverValue === '' ? null : creditDirectorApproverValue"
              :options="creditDirectorApproverOptions"
              value-prop="value"
              label="label"
              mode="single"
              :can-clear="false"
              :searchable="true"
              placeholder="Seleccionar aprobador"
              class="multiselect-director"
              @update:model-value="onCreditDirectorApproverUpdate"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="credit_director_concept">Concepto estructurado *</Label>
            <textarea
              id="credit_director_concept"
              v-model="creditDirectorConcept"
              rows="6"
              class="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Sugerencia de estructura: 1) Antecedentes / radicación. 2) Análisis (incl. SCORE y riesgo). 3) Decisión fundamentada (desembolso o rechazo)."
            />
            <p class="text-xs text-muted-foreground">
              Mínimo 25 caracteres. Este texto queda en la trazabilidad.
            </p>
          </div>
          <div class="flex justify-end">
            <Button
              type="button"
              :disabled="submittingCreditDirectorDecision"
              @click="openCreditDirectorDecisionDialog"
            >
              <Icon v-if="submittingCreditDirectorDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Registrar decisión final
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-if="canDirectorDecide">
        <CardHeader>
          <CardTitle>Concepto director</CardTitle>
          <CardDescription>
            Selecciona la decisión y registra el concepto del director de agencia para esta radicación.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-1.5">
            <Label for="director_decision">Decisión *</Label>
            <Multiselect
              id="director_decision"
              :model-value="directorDecision === '' ? null : directorDecision"
              :options="directorDecisionOptions"
              value-prop="value"
              label="label"
              mode="single"
              :can-clear="false"
              :searchable="false"
              placeholder="Seleccionar decisión"
              class="multiselect-director"
              @update:model-value="onDirectorDecisionUpdate"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="director_concept">Concepto del director *</Label>
            <textarea
              id="director_concept"
              v-model="directorConcept"
              rows="4"
              class="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe el concepto y, si aplica, qué debe ajustar el asesor..."
            />
          </div>
          <div class="flex justify-end">
            <Button
              type="button"
              :disabled="submittingDirectorDecision"
              @click="openDirectorDecisionDialog"
            >
              <Icon v-if="submittingDirectorDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Enviar decisión del director
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-if="canDocumentationDecide">
        <CardHeader>
          <CardTitle>Concepto revisión de documentos</CardTitle>
          <CardDescription>
            Registra el concepto final de revisión documental y define si la radicación pasa a análisis o se devuelve.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <p
            v-if="(application?.documents ?? []).length > 0 && !allDocumentsMarkedReviewed"
            class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          >
            Marca «Revisado» en todos los documentos del deudor y de cada codeudor (pasos del formulario) antes de enviar el concepto.
          </p>
          <div class="space-y-1.5">
            <Label for="documentation_decision">Decisión *</Label>
            <Multiselect
              id="documentation_decision"
              :model-value="documentationDecision === '' ? null : documentationDecision"
              :options="documentationDecisionOptions"
              value-prop="value"
              label="label"
              mode="single"
              :can-clear="false"
              :searchable="false"
              placeholder="Seleccionar decisión"
              class="multiselect-director"
              @update:model-value="onDocumentationDecisionUpdate"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="documentation_concept">Concepto de revisión *</Label>
            <textarea
              id="documentation_concept"
              v-model="documentationConcept"
              rows="4"
              class="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe observaciones documentales, faltantes y ajustes requeridos..."
            />
          </div>
          <div class="flex justify-end">
            <Button
              type="button"
              :disabled="submittingDocumentationDecision || !allDocumentsMarkedReviewed"
              @click="openDocumentationDecisionDialog"
            >
              <Icon v-if="submittingDocumentationDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Enviar revisión de documentos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-if="canAnalystDecide">
        <CardHeader>
          <CardTitle>Concepto del analista</CardTitle>
          <CardDescription>
            Registra la aprobación o la devolución con concepto. La aprobación es obligatoria antes de enviar a director de crédito desde Análisis y SCORE. Si ya aprobaste, puedes corregir el concepto o cambiar la decisión (por ejemplo devolver al asesor) mientras siga en análisis.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-if="analystAlreadyApproved"
            class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-950 dark:text-emerald-100 space-y-1"
          >
            <p class="font-medium">
              Aprobación del analista registrada
            </p>
            <p class="text-muted-foreground">
              Elige otra decisión abajo si corresponde, o mantén «Aprobar» y edita solo el concepto.
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="analyst_decision">Decisión *</Label>
            <Multiselect
              id="analyst_decision"
              :model-value="analystDecision === '' ? null : analystDecision"
              :options="analystDecisionOptions"
              value-prop="value"
              label="label"
              mode="single"
              :can-clear="false"
              :searchable="false"
              placeholder="Seleccionar decisión"
              class="multiselect-director"
              @update:model-value="onAnalystDecisionUpdate"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="analyst_concept">Concepto del analista *</Label>
            <textarea
              id="analyst_concept"
              v-model="analystConcept"
              rows="4"
              class="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe el concepto de aprobación o los ajustes requeridos al asesor…"
            />
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              :disabled="submittingAnalystDecision"
              @click="openAnalystDecisionDialog"
            >
              <Icon v-if="submittingAnalystDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ analystAlreadyApproved ? 'Guardar decisión o concepto' : 'Registrar decisión del analista' }}
            </Button>
            <Button
              v-if="analystDecision === 'approved'"
              variant="outline"
              size="sm"
              as-child
            >
              <NuxtLink
                :to="{ path: '/radicacion/analisis-score', query: { solicitud: String(application?.id ?? '') } }"
              >
                <Icon name="i-lucide-chart-column-increasing" class="mr-2 h-4 w-4" />
                Ir a Análisis y SCORE
              </NuxtLink>
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Número de radicado externo -->
      <div class="rounded-xl border bg-card p-4">
        <div class="space-y-1.5 max-w-md">
          <p class="text-sm font-semibold">
            Número de radicado externo
          </p>
          <p class="font-mono text-muted-foreground">
            {{ form.numero_radicado_externo || '-' }}
          </p>
        </div>
      </div>

      <!-- Resumen financiero del deudor (requiere permiso; oculto p. ej. para asesor) -->
      <PermissionGate permission="radicacion_ver_resumen_financiero" strict>
        <RadicacionResumenFinancieroDeudorComparacion
          :financial-info="debtor?.financial_info"
          :amount-requested="Number(application?.amount_requested) || 0"
          :analisis-score-snapshot="analisisSnapshotForDirector"
        />
      </PermissionGate>

      <!-- Stepper -->
      <div class="flex flex-wrap items-center gap-2">
        <template v-for="(step, idx) in stepsDeudor" :key="step.num">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="[
              currentStep === step.num
                ? 'bg-primary text-primary-foreground cursor-default'
                : 'cursor-pointer hover:bg-muted',
            ]"
            @click="currentStep = step.num"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
              :class="currentStep === step.num ? 'bg-primary text-primary-foreground ring-primary' : currentStep > step.num ? 'bg-primary/30 text-primary ring-primary/30' : 'bg-background text-foreground ring-muted-foreground/40'"
            >
              {{ step.num }}
            </div>
            <span class="text-sm font-semibold hidden sm:inline" :class="currentStep === step.num ? 'text-primary-foreground' : 'text-foreground'">
              {{ step.title }}
            </span>
          </button>
          <Icon v-if="idx < stepsDeudor.length - 1" name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 text-muted-foreground" />
        </template>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{{ stepsDeudor[currentStep - 1]?.title ?? '' }}</CardTitle>
          <CardDescription>
            {{ currentStep === 1
              ? 'Datos personales del deudor principal'
              : currentStep === 2
                ? 'Plantillas agropecuarias según la actividad económica'
                : currentStep === 3
                  ? 'Ingresos, gastos y solvencia del deudor'
                  : currentStep === 4
                    ? 'Monto, plazo y destino del crédito'
                    : 'Codeudores de la solicitud' }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Paso 1: Datos del Deudor -->
          <div v-if="currentStep === 1" class="space-y-4">
            <ApplicantFormFields
              v-model="form.debtor"
              :show-search="false"
              :hide-financial-section="true"
              :show-co-debtor-concept="false"
              :read-only-form="true"
              :documents-editable-only="documentationUploadMode"
              :show-documentos-auxiliar-checklist="documentationUploadMode"
              :credit-application-id="application?.id ?? null"
              :credit-application-documents="application?.documents ?? []"
            />
            <div v-if="getDocumentsForApplicant(debtor.id).length > 0" class="space-y-3 border-t pt-4">
              <p class="text-sm font-semibold">Documentos adjuntos</p>
              <div class="flex min-w-0 flex-wrap gap-2">
                <PermissionGate v-for="doc in getDocumentsForApplicant(debtor.id)" :key="doc.id" permission="radicacion_descargar_documentos">
                  <div class="min-w-0 max-w-full space-y-2 rounded-md border p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-auto min-w-0 max-w-full w-full justify-start gap-2 whitespace-normal py-2 text-left [&>span]:text-left"
                      :disabled="downloadingId === doc.id"
                      @click="handleViewDocument(doc)"
                    >
                      <Icon :name="downloadingId === doc.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'" class="mt-0.5 h-4 w-4 shrink-0" :class="{ 'animate-spin': downloadingId === doc.id }" />
                      <span
                        class="min-w-0 flex-1 text-left text-sm font-medium leading-snug break-words [overflow-wrap:anywhere]"
                      >
                        {{ doc.title || doc.original_name || 'Documento' }}
                      </span>
                      <Icon name="i-lucide-external-link" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Button>
                    <p v-if="doc.review_comment" class="break-words text-xs text-amber-700 dark:text-amber-300">
                      Nota revisión: {{ doc.review_comment }}
                    </p>
                    <div v-if="canDocumentationDecide" class="flex flex-col gap-2">
                      <div class="flex items-center gap-2">
                        <Checkbox
                          :id="`debtor_doc_reviewed_${doc.id}`"
                          :model-value="!!doc.is_reviewed"
                          @update:model-value="doc.is_reviewed = !!$event"
                        />
                        <Label :for="`debtor_doc_reviewed_${doc.id}`" class="text-xs font-medium">
                          Revisado
                        </Label>
                      </div>
                      <Input
                        :model-value="doc.review_comment ?? ''"
                        placeholder="Descripción corta de revisión"
                        @update:model-value="doc.review_comment = String($event ?? '')"
                      />
                    </div>
                  </div>
                </PermissionGate>
              </div>
            </div>
          </div>

          <!-- Paso 2: Actividad económica -->
          <div v-else-if="currentStep === 2" class="space-y-4">
            <CreditsFinancialActivityFormList
              :model-value="getActivityTemplates(debtor)"
              :read-only-form="true"
            />
          </div>

          <!-- Paso 3: Datos financieros -->
          <div v-else-if="currentStep === 3" class="space-y-4">
            <div :class="documentationUploadMode ? '' : 'pointer-events-none'">
              <ApplicantFormFields
                v-model="form.debtor"
                :show-only-financial="true"
                :read-only-form="true"
                :documents-editable-only="documentationUploadMode"
              />
            </div>
          </div>

          <!-- Paso 4: Datos de la Solicitud -->
          <div v-else-if="currentStep === 4" class="space-y-8">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div class="space-y-1.5">
                <p class="text-sm font-medium">Monto solicitado (COP)</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                  {{ formatPesosConSimbolo(form.amount_requested) }}
                </p>
              </div>
              <div class="space-y-1.5">
                <p class="text-sm font-medium">Plazo (meses)</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                  {{ form.term_months }}
                </p>
              </div>
              <div class="space-y-1.5">
                <p class="text-sm font-medium">Sucursal</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                  {{ agencies.find(a => a.id === form.agency_id)?.name ?? application?.sucursal?.name ?? application?.agency?.name ?? '-' }}
                </p>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p class="text-sm font-medium">Destino del crédito</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2">
                  {{ creditDestinationLabel(form.destination) }}
                </p>
              </div>
              <div v-if="form.destination_description" class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p class="text-sm font-medium">Descripción del destino</p>
                <p class="whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2">
                  {{ form.destination_description }}
                </p>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p class="text-sm font-medium">Créditos con garantía del Fondo Nacional de Garantías (FNG)</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {{ form.credito_garantia_fng === true ? 'Sí' : 'No' }}
                </p>
              </div>
            </div>
            <div
              v-if="(form.destination_activity_templates ?? []).length"
              class="space-y-4 border-t border-border pt-6"
            >
              <p class="text-sm font-medium">
                Actividades del destino (referencia)
              </p>
              <CreditsFinancialActivityFormList
                :model-value="form.destination_activity_templates ?? []"
                :read-only-form="true"
                list-hint="Detalle de actividades asociadas al uso del crédito; valores informativos respecto al perfil financiero."
              />
            </div>
          </div>

          <!-- Paso 5: Codeudores -->
          <div v-else-if="currentStep === 5" class="space-y-6">
            <div v-if="form.co_debtors.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay codeudores en esta solicitud.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(co, idx) in form.co_debtors"
                :key="idx"
                class="flex w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2.5 sm:gap-3"
              >
                <div class="min-w-0 flex-1 font-medium">
                  Codeudor {{ idx + 1 }}
                  <span class="ml-2 text-muted-foreground font-normal">
                    ({{ [co.first_name, co.first_last_name].filter(Boolean).join(' ') || 'Sin nombre' }})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 shrink-0 gap-1.5"
                  @click="toggleViewCoDebtor(idx)"
                >
                  <Icon :name="selectedCoDebtorIndex === idx ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="h-3.5 w-3.5 shrink-0" />
                  {{ selectedCoDebtorIndex === idx ? 'Ocultar' : 'Ver' }}
                </Button>
              </div>
            </div>

            <div
              v-if="selectedCoDebtorIndex != null && form.co_debtors[selectedCoDebtorIndex]"
              class="rounded-lg border border-border p-4 space-y-4"
            >
              <p class="text-sm font-semibold">
                Detalle del codeudor {{ selectedCoDebtorIndex + 1 }}
              </p>
              <PermissionGate permission="radicacion_ver_resumen_financiero" strict>
                <RadicacionResumenFinancieroDeudor
                  summary-scope-label="del codeudor"
                  :financial-info="form.co_debtors[selectedCoDebtorIndex]!.financial_info"
                  :amount-requested="Number(application?.amount_requested) || 0"
                />
              </PermissionGate>
              <div class="flex flex-wrap items-center gap-2">
                <template v-for="step in stepsCodeudor" :key="step.num">
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :class="[
                      selectedCoDebtorStep === step.num
                        ? 'bg-primary text-primary-foreground cursor-default'
                        : 'cursor-pointer hover:bg-muted',
                    ]"
                    @click="selectedCoDebtorStep = step.num"
                  >
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
                      :class="selectedCoDebtorStep === step.num
                        ? 'bg-primary text-primary-foreground ring-primary'
                        : 'bg-background text-foreground ring-muted-foreground/40'"
                    >
                      {{ step.num }}
                    </div>
                    <span class="text-sm font-semibold hidden sm:inline">
                      {{ step.title }}
                    </span>
                  </button>
                </template>
              </div>

              <div v-if="selectedCoDebtorStep === 1" class="space-y-4">
                <ApplicantFormFields
                  v-model="form.co_debtors[selectedCoDebtorIndex]!"
                  :show-co-debtor-concept="true"
                  :hide-financial-section="true"
                  :hide-documents-section="!documentationUploadMode"
                  :read-only-form="true"
                  :documents-editable-only="documentationUploadMode"
                  :show-documentos-auxiliar-checklist="documentationUploadMode"
                  :credit-application-id="application?.id ?? null"
                  :credit-application-documents="application?.documents ?? []"
                />
                <div
                  v-if="getDocumentsForApplicant(coDebtors[selectedCoDebtorIndex]?.id ?? coDebtors[selectedCoDebtorIndex]?.applicant_id).length > 0"
                  class="space-y-3"
                >
                  <p class="text-sm font-semibold">Documentos adjuntos</p>
                  <div class="flex min-w-0 flex-wrap gap-2">
                    <PermissionGate
                      v-for="doc in getDocumentsForApplicant(coDebtors[selectedCoDebtorIndex]?.id ?? coDebtors[selectedCoDebtorIndex]?.applicant_id)"
                      :key="doc.id"
                      permission="radicacion_descargar_documentos"
                    >
                      <div class="min-w-0 max-w-full space-y-2 rounded-md border p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-auto min-w-0 max-w-full w-full justify-start gap-2 whitespace-normal py-2 text-left [&>span]:text-left"
                          :disabled="downloadingId === doc.id"
                          @click="handleViewDocument(doc)"
                        >
                          <Icon :name="downloadingId === doc.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'" class="mt-0.5 h-4 w-4 shrink-0" :class="{ 'animate-spin': downloadingId === doc.id }" />
                          <span
                            class="min-w-0 flex-1 text-left text-sm font-medium leading-snug break-words [overflow-wrap:anywhere]"
                          >
                            {{ doc.title || doc.original_name || 'Documento' }}
                          </span>
                          <Icon name="i-lucide-external-link" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                        <p v-if="doc.review_comment" class="break-words text-xs text-amber-700 dark:text-amber-300">
                          Nota revisión: {{ doc.review_comment }}
                        </p>
                        <div v-if="canDocumentationDecide" class="flex flex-col gap-2">
                          <div class="flex items-center gap-2">
                            <Checkbox
                              :id="`codebtor_doc_reviewed_${doc.id}`"
                              :model-value="!!doc.is_reviewed"
                              @update:model-value="doc.is_reviewed = !!$event"
                            />
                            <Label :for="`codebtor_doc_reviewed_${doc.id}`" class="text-xs font-medium">
                              Revisado
                            </Label>
                          </div>
                          <Input
                            :model-value="doc.review_comment ?? ''"
                            placeholder="Descripción corta de revisión"
                            @update:model-value="doc.review_comment = String($event ?? '')"
                          />
                        </div>
                      </div>
                    </PermissionGate>
                  </div>
                </div>
              </div>

              <div v-else-if="selectedCoDebtorStep === 2" class="space-y-4">
                <CreditsFinancialActivityFormList
                  :model-value="getActivityTemplates(form.co_debtors[selectedCoDebtorIndex]!)"
                  :read-only-form="true"
                />
              </div>

              <div v-else class="space-y-4">
                <div :class="documentationUploadMode ? '' : 'pointer-events-none'">
                  <ApplicantFormFields
                    v-model="form.co_debtors[selectedCoDebtorIndex]!"
                    :show-only-financial="true"
                    :read-only-form="true"
                    :documents-editable-only="documentationUploadMode"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>

    <ConfirmWithReasonDialog
      v-model:open="deactivateDialogOpen"
      title="Desactivar solicitud"
      description="La solicitud dejará de mostrarse en el listado. Indica el motivo de la desactivación."
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deactivating"
      @confirm="onDeactivateConfirm"
    />

    <ConfirmWithReasonDialog
      v-model:open="cancelRequestDialogOpen"
      title="Cancelar solicitud"
      description="La radicación pasará a estado cancelado y el proceso quedará detenido. Esta acción no se revierte desde aquí."
      reason-label="Motivo de la cancelación"
      reason-placeholder="Indique el motivo con el detalle suficiente para auditoría…"
      confirm-text="Confirmar cancelación"
      cancel-text="Volver"
      :min-length="10"
      :loading="cancelling"
      @confirm="onCancelRequestConfirm"
    />

    <AlertDialog v-model:open="creditDirectorDecisionDialogOpen">
      <AlertDialogContent class="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar decisión final del director de crédito</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="creditDirectorDecision === 'approved'">
              La solicitud pasará a estado <strong>desembolso</strong>. Verifique que el concepto quede completo antes de confirmar.
            </template>
            <template v-else>
              La solicitud quedará <strong>rechazada</strong> de forma definitiva. Esta acción no se puede deshacer desde aquí.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            :disabled="submittingCreditDirectorDecision"
            @click="confirmCreditDirectorDecision"
          >
            <Icon v-if="submittingCreditDirectorDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Confirmar
          </Button>
          <AlertDialogCancel :disabled="submittingCreditDirectorDecision">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="directorDecisionDialogOpen">
      <AlertDialogContent class="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar decisión del director</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción actualizará el estado de la radicación y guardará el concepto del director en la trazabilidad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            :disabled="submittingDirectorDecision"
            @click="confirmDirectorDecision"
          >
            <Icon v-if="submittingDirectorDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Confirmar
          </Button>
          <AlertDialogCancel :disabled="submittingDirectorDecision">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="analystDecisionDialogOpen">
      <AlertDialogContent class="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ analystDecisionDialogTitle }}</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="analystConfirmIsConceptOnly">
              Se guardará el texto del concepto en la radicación. Permanecerás en esta vista.
            </template>
            <template v-else-if="analystDecision === 'returned'">
              Esta acción devolverá la radicación al asesor y anulará la aprobación previa del analista si existía.
            </template>
            <template v-else-if="analystDecision === 'approved'">
              Se guardará la aprobación y te llevará a Análisis y SCORE para completar el análisis y el SCORE.
            </template>
            <template v-else>
              Confirma la decisión del analista y el concepto.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            :disabled="submittingAnalystDecision"
            @click="confirmAnalystDecision"
          >
            <Icon v-if="submittingAnalystDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Confirmar
          </Button>
          <AlertDialogCancel :disabled="submittingAnalystDecision">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="documentationDecisionDialogOpen">
      <AlertDialogContent class="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar revisión de documentos</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción actualizará el estado de la radicación y guardará el concepto de revisión documental.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            :disabled="submittingDocumentationDecision"
            @click="confirmDocumentationDecision"
          >
            <Icon v-if="submittingDocumentationDecision" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Confirmar
          </Button>
          <AlertDialogCancel :disabled="submittingDocumentationDecision">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-director {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  min-height: 2.25rem;
}
</style>
