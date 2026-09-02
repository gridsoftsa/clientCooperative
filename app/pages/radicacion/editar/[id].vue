<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import FngDocumentsSection from '~/components/radicacion/FngDocumentsSection.vue'
import CreditsFinancialActivityFormList from '~/components/credits/FinancialActivityFormList.vue'
import {
  sumUtilidadMensualFromTemplates,
  validateAllActivityTemplates,
  validateDestinationReferenceActivityTemplates,
} from '~/constants/credits-financial-templates'
import {
  extractItemsByActivityFromCatalogResponse,
  resolveAuxiliaryChecklistRows,
  titleForAuxiliaryDocumentUpload,
} from '~/constants/auxiliary-documents-checklist'
import {
  extractFngItemsFromCatalogResponse,
  titleForFngDocumentUpload,
} from '~/constants/documentation-fng-checklist'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { parseActivityTemplateList } from '~/types/credit-application'
import { mergeApplicantFromApi, normalizeFinancialInfoAliases } from '~/utils/merge-applicant-search'
import { messageFromFetchError } from '~/utils/http-error-message'
import {
  filterFreeAttachmentDocuments,
  findDocumentIdByTitle,
  hasPendingRadicacionDocumentUploads,
  readDocumentIdMap,
  runDocumentUpload,
} from '~/utils/radicacion-document-upload'
import {
  extractActivityTypeFromFinancialInfo,
  isAuxiliaryChecklistLabelUnique,
  itemsByActivityFromCatalogResponse,
  missingRequiredAuxiliaryLabels,
  repairAuxiliaryDocumentsMapFromExisting,
} from '~/utils/auxiliary-documents-validation'
import { validateColombianDocumentNumber } from '~/utils/colombian-document-number'
import { validateApplicantMinimalIdentityForDraftSave } from '~/utils/radicacion-debtor-draft-minimal'
import {
  PASTED_PLAIN_TEXT_MAX_LENGTH,
  clampPastedPlainText,
  pastedPlainTextFromClipboardEvent,
  sanitizeApplicantPlainTextFields,
} from '~/utils/sanitize-pasted-plain-text'
import {
  isDebtorWithoutActivityTemplate,
  setDebtorWithoutActivityTemplateFlag,
} from '~/utils/radicacion-debtor-activity-template'
import { getCreditApplicationStatusLabel, isCreditApplicationTerminalImmutable, isCreditApplicationAdviserEditableStatus, isCreditApplicationReturnedToAdviser } from '~/constants/credit-application-status'
import { returnedByStatusLabel, resubmitToLabel, inferResubmitToFromFlags } from '~/constants/credit-application-return'
import { RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK } from '~/constants/radicacion-form-catalog-fallbacks'
import {
  RADICACION_CREDITO_GARANTIA_FNG_OPTIONS,
  creditoGarantiaFngBooleanToSelectValue,
  selectValueToCreditoGarantiaFngBoolean,
} from '~/constants/radicacion-credito-fng-yes-no'
import { appendFileToFormData } from '~/utils/safe-upload-file-name'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  /** Misma capacidad que crear borradores: quien puede crear puede retomar el formulario */
  permissions: ['radicacion_crear', 'radicacion_editar'],
})

const route = useRoute()
const router = useRouter()
const { $api, $csrf } = useNuxtApp()
const { hasPermission } = usePermissions()
const id = computed(() => route.params.id as string)

const { options: creditDestinationOptions, fetchOptions: fetchCreditDestinationOptions } = useTemplateFlatCatalogOptions(
  'credit-destination',
  RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK,
)
const application = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const loadingSearch = ref(false)
const submitDirectorDialogOpen = ref(false)
/** Error visual si intenta enviar al director sin radicado externo (no aplica al reenvío solo a revisión de documentación). */
const radicadoExternoDirectorError = ref(false)
/** Tras devolución desde revisión documental: el backend envía directo a esa revisión sin pasar por el director. */
const skipNextDirectorReview = computed(() => Boolean(application.value?.skip_next_director_review))
/** Tras devolución del analista (o respuesta aseguradora): el reenvío vuelve a análisis. */
const resubmitToAnalyst = computed(() => Boolean(application.value?.resubmit_to_analyst_after_return))
/** Tras Devolución del director de crédito: el reenvío vuelve a esa revisión. */
const resubmitToCreditDirector = computed(() => Boolean(application.value?.resubmit_to_credit_director_after_return))
/** Reenvío que no pasa por el director de agencia: no exige radicado externo. */
const skipsAgencyDirectorOnResubmit = computed(() =>
  skipNextDirectorReview.value || resubmitToAnalyst.value || resubmitToCreditDirector.value,
)
const returnResubmitDestination = computed(() => {
  return inferResubmitToFromFlags({
    skipNextDirectorReview: skipNextDirectorReview.value,
    resubmitToAnalystAfterReturn: resubmitToAnalyst.value,
    resubmitToCreditDirectorAfterReturn: resubmitToCreditDirector.value,
  }) ?? 'agency_director'
})
const returnBannerTitle = computed(() => {
  const fromWho = returnedByStatusLabel(application.value?.returned_by)
  if (fromWho) {
    return fromWho
  }
  if (skipNextDirectorReview.value) {
    return 'Devolución por revisión de documentos'
  }
  if (resubmitToAnalyst.value) {
    return 'Devolución — reenvío a análisis'
  }
  if (resubmitToCreditDirector.value) {
    return 'Devolución del director de crédito'
  }
  return ''
})
const showReturnResubmitBanner = computed(() => {
  if (!application.value) {
    return false
  }
  if (isCreditApplicationReturnedToAdviser(String(application.value.status ?? ''))) {
    return true
  }
  return skipNextDirectorReview.value || resubmitToAnalyst.value || resubmitToCreditDirector.value
})

const timelineEvents = computed(() =>
  Array.isArray(application.value?.timeline) ? application.value.timeline : [],
)
/**
 * El asesor entra casi siempre por /editar (listado). La trazabilidad no debe ocultarse al pasar a
 * Borrador tras guardar: devolución documental (skip_next_director_review), reenvío al analista, etc.
 */
const showEditTraceability = computed((): boolean => {
  if (!application.value) {
    return false
  }
  if (isCreditApplicationReturnedToAdviser(String(application.value.status ?? ''))) {
    return true
  }
  if (application.value.skip_next_director_review === true) {
    return true
  }
  if (application.value.resubmit_to_analyst_after_return === true) {
    return true
  }
  if (application.value.resubmit_to_credit_director_after_return === true) {
    return true
  }
  return timelineEvents.value.some(
    (e: { to_status?: string | null }) => isCreditApplicationReturnedToAdviser(String(e?.to_status ?? '')),
  )
})
/** Devolución: trazabilidad visible por defecto para ver motivo y actor sin salir del formulario. */
const returnTimelineExpanded = ref(true)

function formatTraceabilityEventDate(iso: string | null | undefined): string {
  if (!iso) {
    return '-'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return '-'
  }
  return d.toLocaleString('es-CO')
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
    returnedBy: application.value?.returned_by,
    skipNextDirectorReview: application.value?.skip_next_director_review,
    resubmitToAnalystAfterReturn: application.value?.resubmit_to_analyst_after_return,
    resubmitToCreditDirectorAfterReturn: application.value?.resubmit_to_credit_director_after_return,
  })
}
const currentStep = ref(1)
const radicacionStepOneFormRef = ref<{
  validateRequiredStepOneFields: () => boolean
  validateAuxiliaryDocumentsRequired: (opts?: { silent?: boolean }) => boolean
} | null>(null)
const debtorActivityTemplatesListRef = ref<InstanceType<typeof CreditsFinancialActivityFormList> | null>(null)
const destinationActivityTemplatesListRef = ref<InstanceType<typeof CreditsFinancialActivityFormList> | null>(null)
const codeudorActivityTemplatesListRef = ref<InstanceType<typeof CreditsFinancialActivityFormList> | null>(null)
const codeudorWizardStepOneFormRef = ref<{
  validateRequiredStepOneFields: () => boolean
  validateAuxiliaryDocumentsRequired: (opts?: { silent?: boolean }) => boolean
} | null>(null)

const addingCodeudor = ref(false)
/** Evita que syncFormFromApplication borre mapas/pending al refrescar solo `documents`. */
const skipFormSyncFromApplication = ref(false)
const codeudorStep = ref(1)
const codeudorBeingAdded = ref<ApplicantForm>({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
  documents: [],
})

/** null = nuevo codeudor en `codeudorBeingAdded`; número = editar `form.co_debtors[index]`. */
const codeudorEditIndex = ref<number | null>(null)

const codeudorWizardApplicant = computed({
  get(): ApplicantForm {
    const i = codeudorEditIndex.value
    if (i != null) {
      const co = form.value.co_debtors[i]
      if (co != null) {
        return co
      }
    }
    return codeudorBeingAdded.value
  },
  set(v: ApplicantForm) {
    const i = codeudorEditIndex.value
    if (i != null) {
      form.value.co_debtors[i] = v
    } else {
      codeudorBeingAdded.value = v
    }
  },
})

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
  is_privileged: false,
  privileged_justification: '',
})

const {
  assignedSucursalLabel,
  hasAssignedSucursal,
  isAssignedSucursalActive,
  hasValidSucursalSelection,
  initRadicacionSucursalContext,
  defaultAgencyError,
} = useRadicacionAssignedSucursal(computed({
  get: () => form.value.agency_id,
  set: (v: number) => { form.value.agency_id = v },
}))

watch(
  () => form.value.numero_radicado_externo,
  (v) => {
    if (radicadoExternoDirectorError.value && typeof v === 'string' && v.trim() !== '') {
      radicadoExternoDirectorError.value = false
    }
  },
)

function focusNumeroRadicadoExternoInput(): void {
  nextTick(() => {
    const el = document.getElementById('numero_radicado_externo')
    if (el instanceof HTMLElement) {
      el.focus()
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

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

const steps = computed(() => (addingCodeudor.value ? stepsCodeudor : stepsDeudor))
const maxStep = computed(() => steps.value.length)

const canEdit = computed(() => isCreditApplicationAdviserEditableStatus(application.value?.status))
const isTerminalClosed = computed(() => isCreditApplicationTerminalImmutable(application.value?.status))

/** Última vez que la solicitud se guardó en el servidor (borrador abierto). */
function formatRadicacionLastSaved(iso: string | null | undefined): string {
  if (iso == null || iso === '') return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(d)
}

const radicacionLastEditedLabel = computed(() => {
  if (!application.value || application.value.status !== 'Draft') return ''
  const raw = application.value.updated_at ?? application.value.created_at
  if (raw == null || raw === '') return ''
  return formatRadicacionLastSaved(typeof raw === 'string' ? raw : String(raw))
})

const { formatPesosConSimbolo, parsePesosInput, onKeydownPesosOnly } = usePesosFormat()

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
function toDateInputFormat(val: string | null | undefined): string | undefined {
  if (val == null || val === '') return undefined
  const str = String(val).trim()
  if (!str) return undefined
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function apiApplicantToForm(api: any, docs: any[]): ApplicantForm {
  const fi = normalizeFinancialInfoAliases(parseJsonField(api?.financial_info))
  const residenceName = (typeof api?.residence_city_name === 'string' && api.residence_city_name?.trim())
    ? api.residence_city_name
    : (api?.residence_city as { name?: string } | null)?.name ?? ''
  const applicantId = typeof api?.id === 'number' ? api.id : Number(api?.id)
  return {
    id: Number.isInteger(applicantId) && applicantId > 0 ? applicantId : undefined,
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
    documents: filterFreeAttachmentDocuments(docs, fi).map((d) => ({
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
    status: 'Draft',
    numero_radicado_externo: app.numero_radicado_externo ?? '',
    co_debtors: coDebtors.value.map((c: (typeof coDebtors.value)[number]) => {
      const docs = getDocumentsForApplicant(c.id)
      return apiApplicantToForm(c, docs)
    }),
    is_privileged: app.is_privileged === true,
    privileged_justification: typeof app.privileged_justification === 'string' ? app.privileged_justification : '',
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
    await nextTick()
    syncFormFromApplication()
    await repairLoadedAuxiliaryDocumentMaps()
  } catch (e) {
    console.error('Error cargando solicitud:', e)
    error.value = 'No se pudo cargar la solicitud'
    application.value = null
  } finally {
    loading.value = false
  }
}

/**
 * Al abrir editar: si los archivos ya existen en la solicitud pero el mapa del checklist
 * está vacío o con IDs viejos, reenlaza por título para que se vean en el checklist.
 */
async function repairLoadedAuxiliaryDocumentMaps(): Promise<void> {
  const docs = (application.value?.documents ?? []) as Array<{
    id: number
    applicant_id?: number | null
    title?: string | null
    original_name?: string | null
  }>
  if (docs.length === 0) {
    return
  }

  let itemsByActivity: Record<string, Array<{ key: string, label: string, required: boolean }>> = {}
  try {
    const cfg = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
    itemsByActivity = itemsByActivityFromCatalogResponse(cfg)
  } catch {
    return
  }

  const repairOne = (applicant: ApplicantForm) => {
    const repaired = repairAuxiliaryDocumentsMapFromExisting({
      itemsByActivity,
      financialInfo: applicant.financial_info,
      applicationDocuments: docs,
      applicantId: applicant.id,
    })
    if (!repaired) {
      return
    }
    const fi = (
      applicant.financial_info
      && typeof applicant.financial_info === 'object'
      && !Array.isArray(applicant.financial_info)
    )
      ? { ...(applicant.financial_info as Record<string, unknown>) }
      : {}
    applicant.financial_info = { ...fi, auxiliaryDocuments: repaired }
  }

  repairOne(form.value.debtor)
  for (const co of form.value.co_debtors ?? []) {
    repairOne(co)
  }
}

async function fetchCatalogs() {
  await initRadicacionSucursalContext()
  if (defaultAgencyError.value) {
    toast.error(defaultAgencyError.value)
  }
}

async function searchApplicant() {
  const doc = form.value.debtor.document_number?.trim()
  if (!doc) {
    toast.error('Ingresa el número de documento')
    return
  }
  loadingSearch.value = true
  try {
    const res = await $api<{ data: ApplicantForm | null; found: boolean }>(
      '/credit-applications/applicants/find',
      { query: { document_number: doc } },
    )
    if (res.found && res.data) {
      mergeApplicantFromApi(form.value.debtor, res.data)
      toast.success('Solicitante encontrado. Revisa y completa los datos.')
    } else {
      toast.info('No encontrado. Completa el formulario con los datos del solicitante.')
    }
  } catch (e) {
    console.error('Error buscando:', e)
    toast.error('Error al buscar')
  } finally {
    loadingSearch.value = false
  }
}

function onIsPrivilegedSelectUpdate(value: unknown): void {
  form.value.is_privileged = value === 'yes'
  if (value !== 'yes') {
    form.value.privileged_justification = ''
  }
}

function validatePrivilegedFieldsForSave(): boolean {
  if (!hasPermission('radicacion_marcar_privilegiado')) {
    return true
  }
  if (form.value.is_privileged !== true) {
    return true
  }
  const j = String(form.value.privileged_justification ?? '').trim()
  if (j.length < 10) {
    toast.error('Indique la justificación por la cual la solicitud es privilegiada (mínimo 10 caracteres).')
    return false
  }
  return true
}

async function searchApplicantForCodeudor() {
  const doc = codeudorBeingAdded.value.document_number?.trim()
  if (!doc) {
    toast.error('Ingresa el número de documento del codeudor')
    return
  }
  loadingSearch.value = true
  try {
    const res = await $api<{ data: ApplicantForm | null; found: boolean }>(
      '/credit-applications/applicants/find',
      { query: { document_number: doc } },
    )
    if (res.found && res.data) {
      mergeApplicantFromApi(codeudorBeingAdded.value, res.data)
      toast.success('Codeudor encontrado. Revisa y completa los datos.')
    } else {
      toast.info('No encontrado. Completa el formulario con los datos del codeudor.')
    }
  } catch (e) {
    console.error('Error buscando codeudor:', e)
    toast.error('Error al buscar')
  } finally {
    loadingSearch.value = false
  }
}

async function searchApplicantForCoDebtor(idx: number) {
  const co = form.value.co_debtors[idx]
  if (!co) return
  const doc = co.document_number?.trim()
  if (!doc) {
    toast.error('Ingresa el número de documento del codeudor')
    return
  }
  loadingSearch.value = true
  try {
    const res = await $api<{ data: ApplicantForm | null; found: boolean }>(
      '/credit-applications/applicants/find',
      { query: { document_number: doc } },
    )
    if (res.found && res.data && co) {
      mergeApplicantFromApi(co, res.data)
      toast.success('Codeudor encontrado. Revisa y completa los datos.')
    } else {
      toast.info('No encontrado. Completa el formulario con los datos del codeudor.')
    }
  } catch (e) {
    console.error('Error buscando codeudor:', e)
    toast.error('Error al buscar')
  } finally {
    loadingSearch.value = false
  }
}

const emptyCodeudor = (): ApplicantForm => ({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
  documents: [],
})

function startAddingCodeudor() {
  addingCodeudor.value = true
  codeudorEditIndex.value = null
  codeudorStep.value = 1
  codeudorBeingAdded.value = { ...emptyCodeudor() }
}

function startEditingCodeudor(idx: number) {
  if (!form.value.co_debtors[idx]) {
    return
  }
  addingCodeudor.value = true
  codeudorEditIndex.value = idx
  codeudorStep.value = 1
}

function cancelAddingCodeudor() {
  addingCodeudor.value = false
  codeudorEditIndex.value = null
  codeudorStep.value = 1
}

function searchApplicantForWizard() {
  const i = codeudorEditIndex.value
  if (i != null) {
    searchApplicantForCoDebtor(i)
  } else {
    searchApplicantForCodeudor()
  }
}

async function finalizeCodeudorWizard() {
  const app = codeudorWizardApplicant.value
  if (!app.document_number?.trim()
    || !app.first_name?.trim()
    || !app.first_last_name?.trim()) {
    toast.error('Completa documento, primer nombre y primer apellido del codeudor')
    return
  }
  const docErr = validateColombianDocumentNumber(app.document_type ?? '', app.document_number ?? '')
  if (docErr) {
    toast.error(docErr)
    return
  }
  await nextTick()
  const stepRef = codeudorWizardStepOneFormRef.value
  if (!stepRef?.validateRequiredStepOneFields()) {
    toast.error('Completa los campos obligatorios del codeudor')
    codeudorStep.value = 1
    return
  }
  if (!stepRef.validateAuxiliaryDocumentsRequired()) {
    codeudorStep.value = 1
    return
  }
  const rTemplates = validateAllActivityTemplates(getActivityTemplatesFor(app), { requireAtLeastOne: false })
  if (!rTemplates.valid) {
    toast.error(rTemplates.errors.join('. '))
    return
  }
  if (hasDocumentsWithoutTitleInApplicant(app)) {
    toast.error('Todos los documentos adjuntos deben tener un título')
    return
  }
  if (codeudorEditIndex.value == null) {
    form.value.co_debtors.push({ ...codeudorBeingAdded.value })
    toast.success('Codeudor agregado')
  } else {
    toast.success('Cambios del codeudor guardados')
  }
  cancelAddingCodeudor()
}

function hasDocumentsWithoutTitleInApplicant(app: ApplicantForm): boolean {
  for (const d of app.documents ?? []) {
    if (d.file && !d.title?.trim()) return true
  }
  return false
}

async function nextCodeudorStep() {
  await nextTick()
  if (codeudorStep.value === 1) {
    const ref = codeudorWizardStepOneFormRef.value
    if (!ref?.validateRequiredStepOneFields()) {
      toast.error('Completa los campos obligatorios del codeudor')
      return
    }
    if (!ref.validateAuxiliaryDocumentsRequired()) {
      return
    }
  }
  if (codeudorStep.value === 2) {
    const templates = getActivityTemplatesFor(codeudorWizardApplicant.value)
    const r = validateAllActivityTemplates(templates, { requireAtLeastOne: false })
    if (!r.valid) {
      toast.error(r.errors.join('. '))
      nextTick(() => codeudorActivityTemplatesListRef.value?.highlightFirstInvalidFromList(templates))
      return
    }
  }
  if (codeudorStep.value < 3) codeudorStep.value++
}

function prevCodeudorStep() {
  if (codeudorStep.value > 1) codeudorStep.value--
}

function removeCoDebtor(index: number) {
  if (addingCodeudor.value && codeudorEditIndex.value === index) {
    cancelAddingCodeudor()
  } else if (addingCodeudor.value && codeudorEditIndex.value != null && codeudorEditIndex.value > index) {
    codeudorEditIndex.value = codeudorEditIndex.value - 1
  }
  form.value.co_debtors.splice(index, 1)
}

function setActivityTemplates(val: ActivityTemplateData[]): void {
  setActivityTemplatesFor(form.value.debtor, val)
}

function getActivityTemplates(): ActivityTemplateData[] {
  return getActivityTemplatesFor(form.value.debtor)
}

function getActivityTemplatesFor(app: ApplicantForm): ActivityTemplateData[] {
  const fi = app.financial_info as Record<string, unknown> | undefined
  if (!fi) return []
  const templates = fi.activity_templates
  if (Array.isArray(templates)) {
    return templates.filter(
      (t): t is ActivityTemplateData =>
        t && typeof t === 'object' && 'sector' in t && 'template' in t && 'data' in t,
    )
  }
  const legacy = fi.activity_template
  if (legacy && typeof legacy === 'object' && 'sector' in legacy && 'template' in legacy && 'data' in legacy) {
    return [legacy as ActivityTemplateData]
  }
  return []
}

function setActivityTemplatesFor(app: ApplicantForm, val: ActivityTemplateData[]): void {
  if (!app.financial_info || typeof app.financial_info !== 'object') {
    app.financial_info = {}
  }
  const fi = app.financial_info as Record<string, unknown>
  fi.activity_templates = val
  fi.activity_templates_count = val.length
  const sumUtilidad = sumUtilidadMensualFromTemplates(val)
  const income = (fi.income ?? {}) as Record<string, unknown>
  fi.income = { ...income, business: sumUtilidad }
}

const debtorWithoutActivityTemplate = ref(false)

watch(
  () => (form.value.debtor.financial_info as Record<string, unknown> | undefined)?.withoutActivityTemplate,
  () => {
    debtorWithoutActivityTemplate.value = isDebtorWithoutActivityTemplate(form.value.debtor)
  },
  { immediate: true },
)

watch(debtorWithoutActivityTemplate, (checked, wasChecked) => {
  if (checked === wasChecked) {
    return
  }
  setDebtorWithoutActivityTemplateFlag(form.value.debtor, checked)
  if (checked) {
    setActivityTemplates([])
  }
})

function debtorSkipsActivityTemplateStep(): boolean {
  return debtorWithoutActivityTemplate.value || isDebtorWithoutActivityTemplate(form.value.debtor)
}

function validateActivityTemplatesBeforeSave(): string | null {
  const debtorT = getActivityTemplates()
  let r = debtorSkipsActivityTemplateStep()
    ? { valid: true, errors: [], invalidFieldKeys: [] as string[] }
    : validateAllActivityTemplates(debtorT, { requireAtLeastOne: true })
  if (!r.valid) {
    return r.errors.join(' ')
  }
  const cos = form.value.co_debtors ?? []
  for (let i = 0; i < cos.length; i++) {
    const co = cos[i]
    if (!co) continue
    r = validateAllActivityTemplates(getActivityTemplatesFor(co), { requireAtLeastOne: false })
    if (!r.valid) {
      return `Codeudor ${i + 1}: ${r.errors.join(' ')}`
    }
  }
  const destT = form.value.destination_activity_templates ?? []
  r = validateDestinationReferenceActivityTemplates(destT)
  if (!r.valid) {
    return `Destino del crédito (actividades de referencia): ${r.errors.join(' ')}`
  }
  return null
}

const applicantForFinancialSummary = computed(() => {
  if (addingCodeudor.value) {
    return codeudorWizardApplicant.value
  }
  return form.value.debtor
})

function ensureSolvency() {
  const d = applicantForFinancialSummary.value
  if (!d.financial_info || typeof d.financial_info !== 'object') {
    d.financial_info = {}
  }
  const fi = d.financial_info as Record<string, unknown>
  if (!fi.solvency || typeof fi.solvency !== 'object') {
    fi.solvency = {}
  }
  return fi.solvency as Record<string, number | undefined>
}

function getSolvencyField(key: string): number | undefined {
  return ensureSolvency()[key]
}

function setSolvencyField(key: string, value: number | undefined) {
  ensureSolvency()[key] = value
}

const totalActivosFromAssets = computed(() => {
  const assets = (applicantForFinancialSummary.value.financial_info as any)?.assets ?? []
  return assets.reduce((sum: number, a: { value?: number }) => sum + (a.value ?? 0), 0)
})

const bienRaizFromGarantias = computed(() => {
  const assets = (applicantForFinancialSummary.value.financial_info as any)?.assets ?? []
  return assets.reduce((sum: number, a: { garantia?: boolean; value?: number }) =>
    (a.garantia ? sum + (a.value ?? 0) : sum), 0)
})

watch([totalActivosFromAssets, bienRaizFromGarantias], ([total, bienRaiz]) => {
  const s = ensureSolvency()
  s.assets = total as number
  s.real_estate = bienRaiz as number
}, { immediate: true })

const amountForSolvencia = computed(() => form.value.amount_requested)

const solvenciaPercentage = computed(() => {
  const pasivos = getSolvencyField('liabilities') ?? 0
  const activos = totalActivosFromAssets.value
  const monto = amountForSolvencia.value
  if (!activos || activos <= 0 || !monto || monto <= 0) return null
  const pct = ((pasivos + monto) / activos) * 100
  return Math.round(pct * 100) / 100
})

const endeudamientoPercentage = computed(() => {
  const pasivos = getSolvencyField('liabilities') ?? 0
  const bienRaiz = bienRaizFromGarantias.value
  const monto = amountForSolvencia.value
  if (!bienRaiz || bienRaiz <= 0 || !monto || monto <= 0) return null
  const pct = ((pasivos + monto) / bienRaiz) * 100
  return Math.round(pct * 100) / 100
})

/** Menor % = mejor: <50 verde, 50-100 ámbar, ≥100 rojo */
function solvenciaColorClass(pct: number | null): string {
  if (pct == null) return 'bg-muted text-muted-foreground'
  if (pct < 50) return 'bg-green-600/20 text-green-700 dark:text-green-400 border-green-600/40'
  if (pct < 100) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
  return 'bg-destructive/20 text-destructive border-destructive/40'
}

watch([solvenciaPercentage, endeudamientoPercentage], () => {
  setSolvencyField('solvency', solvenciaPercentage.value ?? undefined)
  setSolvencyField('endeudamiento', endeudamientoPercentage.value ?? undefined)
}, { immediate: true })

function onKeydownNumeric(e: KeyboardEvent, allowDecimal = false) {
  if (['e', 'E', '+', '-'].includes(e.key) || (!allowDecimal && e.key === '.')) {
    e.preventDefault()
  }
}

function canProceedStep1(): boolean {
  const d = addingCodeudor.value ? codeudorWizardApplicant.value : form.value.debtor
  if (!d.document_number?.trim() || !d.first_name?.trim() || !d.first_last_name?.trim()) {
    return false
  }
  return validateColombianDocumentNumber(d.document_type ?? '', d.document_number ?? '') === null
}

function canProceedStep2(): boolean {
  if (
    form.value.amount_requested <= 0
    || form.value.term_months <= 0
    || !hasValidSucursalSelection()
    || !form.value.destination?.trim()
  ) {
    return false
  }
  const destR = validateDestinationReferenceActivityTemplates(form.value.destination_activity_templates ?? [])
  return destR.valid
}

function hasDocumentsWithoutTitle(): boolean {
  if (addingCodeudor.value && hasDocumentsWithoutTitleInApplicant(codeudorWizardApplicant.value)) {
    return true
  }
  const debtorDocs = form.value.debtor.documents ?? []
  for (const d of debtorDocs) {
    if (d.file && !d.title?.trim()) return true
  }
  for (const co of form.value.co_debtors ?? []) {
    const docs = co.documents ?? []
    for (const d of docs) {
      if (d.file && !d.title?.trim()) return true
    }
  }
  return false
}

function payloadWithoutDocuments(status: 'Draft' | 'Submitted') {
  const { debtor, co_debtors, ...rest } = form.value
  const { documents: _d, auxiliaryDocumentFiles: _aux, ...debtorWithoutDocs } = debtor
  const coDebtorsWithoutDocs = (co_debtors ?? []).map(
    ({ documents: _doc, auxiliaryDocumentFiles: _auxCo, ...co }) => co,
  )
  const privileged = form.value.is_privileged === true
  return {
    ...rest,
    destination_description: clampPastedPlainText(form.value.destination_description ?? ''),
    debtor: sanitizeApplicantPlainTextFields(debtorWithoutDocs),
    co_debtors: coDebtorsWithoutDocs.map(co => sanitizeApplicantPlainTextFields(co)),
    status,
    privileged_justification: privileged ? String(form.value.privileged_justification ?? '').trim() : null,
  }
}

function onPasteDestinationDescription(e: ClipboardEvent) {
  e.preventDefault()
  form.value.destination_description = pastedPlainTextFromClipboardEvent(
    e,
    form.value.destination_description ?? '',
  )
}

function onBlurDestinationDescription() {
  form.value.destination_description = clampPastedPlainText(form.value.destination_description ?? '')
}

/** Para «Guardar borrador»: defaults de monto, plazo y sucursal si el formulario aún no los tiene. */
function payloadForDraftPersist(): Record<string, unknown> {
  const base = payloadWithoutDocuments('Draft')
  const agencyId = form.value.agency_id
  return {
    ...base,
    amount_requested: form.value.amount_requested > 0 ? form.value.amount_requested : 1,
    term_months: form.value.term_months > 0 ? form.value.term_months : 12,
    agency_id: agencyId,
  }
}

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

function validateAllDocumentsBeforeUpload(): string | null {
  const check = (docs: Array<{ title?: string; file?: File }>) => {
    for (const doc of docs) {
      if (doc.file && doc.file.size > MAX_DOCUMENT_SIZE) {
        return `"${doc.file.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`
      }
    }
    return null
  }
  const debtorErr = check(form.value.debtor.documents ?? [])
  if (debtorErr) return debtorErr
  for (const co of form.value.co_debtors ?? []) {
    const err = check(co.documents ?? [])
    if (err) return err
  }
  for (const f of Object.values(form.value.debtor.auxiliaryDocumentFiles ?? {})) {
    if (f instanceof File && f.size > MAX_DOCUMENT_SIZE) {
      return `"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`
    }
  }
  for (const co of form.value.co_debtors ?? []) {
    for (const f of Object.values(co.auxiliaryDocumentFiles ?? {})) {
      if (f instanceof File && f.size > MAX_DOCUMENT_SIZE) {
        return `"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`
      }
    }
  }
  for (const f of Object.values(form.value.debtor.fngDocumentFiles ?? {})) {
    if (f instanceof File && f.size > MAX_DOCUMENT_SIZE) {
      return `"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`
    }
  }
  return null
}

async function uploadAllDocuments(
  applicationId: number,
  app: {
    application_applicants?: Array<{ applicant_id: number; role: string }>
    applicationApplicants?: Array<{ applicant_id: number; role: string }>
    co_debtors?: Array<{ applicant_id: number }>
    coDebtors?: Array<{ applicant_id: number }>
  },
) {
  if (!hasPendingRadicacionDocumentUploads(form.value)) {
    return
  }

  const sizeErr = validateAllDocumentsBeforeUpload()
  if (sizeErr) throw new Error(sizeErr)

  // Contexto fresco: mapas e IDs en servidor (evita POST sin DELETE si el form perdió el mapa).
  let serverDocuments: Array<{ id?: number; title?: string | null; applicant_id?: number | null }> = []
  try {
    const fresh = await $api<{ data?: { documents?: typeof serverDocuments } }>(`/credit-applications/${applicationId}`)
    const data = (fresh as { data?: { documents?: typeof serverDocuments } })?.data ?? fresh
    serverDocuments = Array.isArray((data as { documents?: typeof serverDocuments }).documents)
      ? (data as { documents: typeof serverDocuments }).documents
      : []
  } catch {
    serverDocuments = Array.isArray(application.value?.documents) ? application.value!.documents : []
  }

  const pivots = app.application_applicants ?? app.applicationApplicants ?? []
  const debtorPivot = pivots.find((p: { role: string }) => (p.role ?? (p as any).Role) === 'DEUDOR')
  const coDebtorsList = app.co_debtors ?? app.coDebtors ?? []
  const codeudorApplicantIds = coDebtorsList.map((c: any) => c.applicant_id ?? c.applicantId)
  const debtorApplicantId = debtorPivot
    ? Number((debtorPivot as { applicant_id?: number }).applicant_id ?? 0) || null
    : null

  async function deleteDocIfPresent(docId: number | null | undefined) {
    if (typeof docId === 'number' && docId > 0) {
      await $api(`/credit-applications/${applicationId}/documents/${docId}`, { method: 'DELETE' })
    }
  }

  if (debtorPivot) {
    const docs = form.value.debtor.documents ?? []
    for (const doc of docs) {
      if (!doc.file || !doc.title?.trim()) continue
      await deleteDocIfPresent(doc.id)
      const fd = new FormData()
      fd.append('title', doc.title.trim())
      appendFileToFormData(fd, doc.file, 'adjunto')
      const res = await runDocumentUpload(
        `Deudor — adjunto: ${doc.title.trim()}`,
        doc.file,
        () => $api<{ data: { id: number; original_name?: string } }>(
          `/credit-applications/${applicationId}/documents`,
          { method: 'POST', body: fd },
        ),
      )
      doc.id = res.data.id
      doc.original_name = res.data.original_name ?? doc.file.name
      doc.file = undefined
      upsertLocalApplicationDocument({
        id: res.data.id,
        title: doc.title.trim(),
        original_name: doc.original_name,
        applicant_id: debtorApplicantId,
      })
    }

    let labelByKey: Record<string, string> = {}
    const auxFiles = form.value.debtor.auxiliaryDocumentFiles
    const fiRaw = form.value.debtor.financial_info
    const activityType = fiRaw && typeof fiRaw === 'object'
      ? String((fiRaw as { activity_type?: string }).activity_type ?? '').trim()
      : ''
    if (auxFiles && Object.keys(auxFiles).length > 0 && activityType) {
      try {
        const cfg = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
        const iba = extractItemsByActivityFromCatalogResponse(cfg)
        const rows = resolveAuxiliaryChecklistRows(iba, activityType)
        labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
      } catch {
        labelByKey = {}
      }
    }

    let didAuxiliarUpload = false
    if (auxFiles) {
      const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
      const docMap = readDocumentIdMap(fi, 'auxiliaryDocuments')

      for (const [key, file] of Object.entries(auxFiles)) {
        if (!(file instanceof File)) continue
        const label = labelByKey[key] ?? key
        const uploadTitle = titleForAuxiliaryDocumentUpload(label)
        const labelRows = Object.entries(labelByKey).map(([k, lab]) => ({ key: k, label: lab }))
        const prevId = docMap[key]
          ?? (isAuxiliaryChecklistLabelUnique(labelRows, label)
            ? findDocumentIdByTitle(serverDocuments, uploadTitle, debtorApplicantId)
            : null)
        await deleteDocIfPresent(prevId)
        const fd = new FormData()
        fd.append('title', uploadTitle)
        appendFileToFormData(fd, file, 'auxiliar')
        fd.append('auxiliary_checklist', '1')
        const res = await runDocumentUpload(
          `Deudor — documento auxiliar: ${label}`,
          file,
          () => $api<{ data: { id: number } }>(
            `/credit-applications/${applicationId}/documents`,
            { method: 'POST', body: fd },
          ),
        )
        docMap[key] = res.data.id
        serverDocuments = serverDocuments.filter(d => d.id !== prevId)
        serverDocuments.push({ id: res.data.id, title: uploadTitle, applicant_id: debtorApplicantId })
        upsertLocalApplicationDocument({
          id: res.data.id,
          title: uploadTitle,
          original_name: file.name,
          applicant_id: debtorApplicantId,
        })
        didAuxiliarUpload = true
      }

      if (didAuxiliarUpload) {
        form.value.debtor.financial_info = { ...fi, auxiliaryDocuments: docMap }
        form.value.debtor.auxiliaryDocumentFiles = {}
        await $csrf()
        await $api(`/credit-applications/${applicationId}`, {
          method: 'PUT',
          body: payloadWithoutDocuments('Draft'),
        })
      }
    }

    let didFngUpload = false
    if (form.value.credito_garantia_fng) {
      const fngFiles = form.value.debtor.fngDocumentFiles
      if (fngFiles && Object.keys(fngFiles).length > 0) {
        let labelByKeyFng: Record<string, string> = {}
        try {
          const cfgFng = await $api<unknown>('/catalogs/template-flat-data/documentation-fng-documents')
          const rowsFng = extractFngItemsFromCatalogResponse(cfgFng)
          labelByKeyFng = Object.fromEntries(rowsFng.map(r => [r.key, r.label]))
        } catch {
          labelByKeyFng = {}
        }
        const fiFng = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
        const fngDocMap = readDocumentIdMap(fiFng, 'fngDocuments')

        for (const [key, file] of Object.entries(fngFiles)) {
          if (!(file instanceof File)) {
            continue
          }
          const labelFng = labelByKeyFng[key] ?? key
          const uploadTitleFng = titleForFngDocumentUpload(labelFng)
          const prevIdFng = fngDocMap[key]
            ?? findDocumentIdByTitle(serverDocuments, uploadTitleFng, debtorApplicantId)
          await deleteDocIfPresent(prevIdFng)
          const fdFng = new FormData()
          fdFng.append('title', uploadTitleFng)
          appendFileToFormData(fdFng, file, 'fng')
          fdFng.append('fng_checklist', '1')
          const resFng = await runDocumentUpload(
            `Deudor — documento FNG: ${labelFng}`,
            file,
            () => $api<{ data: { id: number } }>(
              `/credit-applications/${applicationId}/documents`,
              { method: 'POST', body: fdFng },
            ),
          )
          fngDocMap[key] = resFng.data.id
          serverDocuments = serverDocuments.filter(d => d.id !== prevIdFng)
          serverDocuments.push({ id: resFng.data.id, title: uploadTitleFng, applicant_id: debtorApplicantId })
          upsertLocalApplicationDocument({
            id: resFng.data.id,
            title: uploadTitleFng,
            original_name: file.name,
            applicant_id: debtorApplicantId,
          })
          didFngUpload = true
        }

        if (didFngUpload) {
          form.value.debtor.financial_info = { ...fiFng, fngDocuments: fngDocMap }
          form.value.debtor.fngDocumentFiles = {}
          await $csrf()
          await $api(`/credit-applications/${applicationId}`, {
            method: 'PUT',
            body: payloadWithoutDocuments('Draft'),
          })
        }
      }
    }
  }

  const coDebtors = form.value.co_debtors ?? []
  for (let i = 0; i < coDebtors.length && i < codeudorApplicantIds.length; i++) {
    const co = coDebtors[i]
    const applicantId = codeudorApplicantIds[i]
    if (!co || !applicantId) continue
    const docs = co.documents ?? []
    for (const doc of docs) {
      if (!doc.file || !doc.title?.trim()) continue
      await deleteDocIfPresent(doc.id)
      const fd = new FormData()
      fd.append('title', doc.title.trim())
      appendFileToFormData(fd, doc.file, 'adjunto')
      fd.append('applicant_id', String(applicantId))
      const res = await runDocumentUpload(
        `Codeudor ${i + 1} — adjunto: ${doc.title.trim()}`,
        doc.file,
        () => $api<{ data: { id: number; original_name?: string } }>(
          `/credit-applications/${applicationId}/documents`,
          { method: 'POST', body: fd },
        ),
      )
      doc.id = res.data.id
      doc.original_name = res.data.original_name ?? doc.file.name
      doc.file = undefined
      upsertLocalApplicationDocument({
        id: res.data.id,
        title: doc.title.trim(),
        original_name: doc.original_name,
        applicant_id: Number(applicantId) || null,
      })
    }

    let labelByKeyCo: Record<string, string> = {}
    const auxFilesCo = co.auxiliaryDocumentFiles
    const fiRawCo = co.financial_info
    const activityTypeCo = fiRawCo && typeof fiRawCo === 'object'
      ? String((fiRawCo as { activity_type?: string }).activity_type ?? '').trim()
      : ''
    if (auxFilesCo && Object.keys(auxFilesCo).length > 0 && activityTypeCo) {
      try {
        const cfgCo = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
        const ibaCo = extractItemsByActivityFromCatalogResponse(cfgCo)
        const rowsCo = resolveAuxiliaryChecklistRows(ibaCo, activityTypeCo)
        labelByKeyCo = Object.fromEntries(rowsCo.map(r => [r.key, r.label]))
      } catch {
        labelByKeyCo = {}
      }
    }

    let didAuxCo = false
    if (auxFilesCo) {
      const fiCo = { ...(typeof fiRawCo === 'object' && fiRawCo ? fiRawCo : {}) } as Record<string, unknown>
      const docMapCo = readDocumentIdMap(fiCo, 'auxiliaryDocuments')

      for (const [key, file] of Object.entries(auxFilesCo)) {
        if (!(file instanceof File)) continue
        const labelCo = labelByKeyCo[key] ?? key
        const uploadTitleCo = titleForAuxiliaryDocumentUpload(labelCo)
        const labelRowsCo = Object.entries(labelByKeyCo).map(([k, lab]) => ({ key: k, label: lab }))
        const prevId = docMapCo[key]
          ?? (isAuxiliaryChecklistLabelUnique(labelRowsCo, labelCo)
            ? findDocumentIdByTitle(serverDocuments, uploadTitleCo, applicantId)
            : null)
        await deleteDocIfPresent(prevId)
        const fdAux = new FormData()
        fdAux.append('title', uploadTitleCo)
        appendFileToFormData(fdAux, file, 'auxiliar-codeudor')
        fdAux.append('auxiliary_checklist', '1')
        fdAux.append('applicant_id', String(applicantId))
        const resCo = await runDocumentUpload(
          `Codeudor ${i + 1} — documento auxiliar: ${labelCo}`,
          file,
          () => $api<{ data: { id: number } }>(
            `/credit-applications/${applicationId}/documents`,
            { method: 'POST', body: fdAux },
          ),
        )
        docMapCo[key] = resCo.data.id
        serverDocuments = serverDocuments.filter(d => d.id !== prevId)
        serverDocuments.push({ id: resCo.data.id, title: uploadTitleCo, applicant_id: applicantId })
        upsertLocalApplicationDocument({
          id: resCo.data.id,
          title: uploadTitleCo,
          original_name: file.name,
          applicant_id: Number(applicantId) || null,
        })
        didAuxCo = true
      }

      if (didAuxCo) {
        const cos = form.value.co_debtors ?? []
        const rowCo = cos[i]
        if (rowCo) {
          rowCo.financial_info = { ...fiCo, auxiliaryDocuments: docMapCo }
          rowCo.auxiliaryDocumentFiles = {}
        }
        await $csrf()
        await $api(`/credit-applications/${applicationId}`, {
          method: 'PUT',
          body: payloadWithoutDocuments('Draft'),
        })
      }
    }
  }

  await refreshApplicationDocumentsFromServer(applicationId)
}

/** Igual que «Siguiente» en paso 1: obligatorios + checklist auxiliar. Requiere paso 1 montado (v-show). */
async function validateRadicacionStepOneForPersist(): Promise<boolean> {
  if (addingCodeudor.value) {
    await nextTick()
    const formRef = codeudorWizardStepOneFormRef.value
    if (!formRef) {
      toast.error('No se pudo validar los datos del codeudor. Complete el paso 1 del asistente.')
      return false
    }
    if (!formRef.validateRequiredStepOneFields()) {
      toast.error('Completa los campos obligatorios del codeudor')
      return false
    }
    if (!formRef.validateAuxiliaryDocumentsRequired()) {
      return false
    }
    return true
  }
  await nextTick()
  const formRef = radicacionStepOneFormRef.value
  if (!formRef) {
    toast.error('No se pudo validar los datos del deudor. Vuelva al paso 1 e intente de nuevo.')
    return false
  }
  if (!formRef.validateRequiredStepOneFields()) {
    toast.error('Completa los campos obligatorios del deudor')
    return false
  }
  // No basta con el formulario visible: al enviar/guardar hay que cubrir deudor y todos los codeudores.
  if (!(await validateAllApplicantsAuxiliaryChecklists())) {
    return false
  }
  return true
}

/**
 * Valida checklists auxiliares del deudor y de cada codeudor (datos del form + documentos en servidor).
 * Si falla, lleva al usuario a la pantalla correcta y muestra quién/qué falta.
 */
async function validateAllApplicantsAuxiliaryChecklists(): Promise<boolean> {
  let itemsByActivity: Record<string, Array<{ key: string, label: string, required: boolean }>> = {}
  try {
    const cfg = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
    itemsByActivity = itemsByActivityFromCatalogResponse(cfg)
  } catch {
    toast.error('No se pudo cargar el listado de documentos auxiliares para validar.')
    return false
  }

  const docs = (application.value?.documents ?? []) as Array<{
    id: number
    applicant_id?: number | null
    title?: string | null
    original_name?: string | null
  }>

  const debtorMissing = missingRequiredAuxiliaryLabels({
    itemsByActivity,
    activityType: extractActivityTypeFromFinancialInfo(form.value.debtor.financial_info),
    financialInfo: form.value.debtor.financial_info,
    pendingFiles: form.value.debtor.auxiliaryDocumentFiles,
    applicationDocuments: docs,
    applicantId: form.value.debtor.id,
  })
  if (debtorMissing.length > 0) {
    addingCodeudor.value = false
    currentStep.value = 1
    await nextTick()
    toast.error(
      `Deudor: faltan documentos obligatorios del checklist (${debtorMissing.slice(0, 3).join(', ')}${debtorMissing.length > 3 ? '…' : ''}).`,
    )
    document.querySelector('#radicacion-auxiliary-documents')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    radicacionStepOneFormRef.value?.validateAuxiliaryDocumentsRequired({ silent: true })
    return false
  }

  const cos = form.value.co_debtors ?? []
  for (let i = 0; i < cos.length; i++) {
    const co = cos[i]
    if (!co) continue
    const coMissing = missingRequiredAuxiliaryLabels({
      itemsByActivity,
      activityType: extractActivityTypeFromFinancialInfo(co.financial_info),
      financialInfo: co.financial_info,
      pendingFiles: co.auxiliaryDocumentFiles,
      applicationDocuments: docs,
      applicantId: co.id,
    })
    if (coMissing.length > 0) {
      startEditingCodeudor(i)
      await nextTick()
      codeudorStep.value = 1
      await nextTick()
      const who = co.first_name || co.first_last_name
        ? `${co.first_name ?? ''} ${co.first_last_name ?? ''}`.trim()
        : `codeudor ${i + 1}`
      toast.error(
        `Codeudor (${who}): faltan documentos obligatorios del checklist (${coMissing.slice(0, 3).join(', ')}${coMissing.length > 3 ? '…' : ''}).`,
      )
      document.querySelector('#radicacion-auxiliary-documents')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      codeudorWizardStepOneFormRef.value?.validateAuxiliaryDocumentsRequired({ silent: true })
      return false
    }
  }

  return true
}

async function refreshApplicationDocumentsFromServer(applicationId: number): Promise<void> {
  try {
    const fresh = await $api<{ data?: { documents?: unknown[] } }>(`/credit-applications/${applicationId}`)
    const data = (fresh as { data?: { documents?: unknown[] } })?.data ?? fresh
    // Solo actualizar si el payload trae `documents` como array. Nunca reemplazar por []
    // si la respuesta vino mal formada (antes borraba todos los adjuntos visibles).
    if (
      !data
      || typeof data !== 'object'
      || !('documents' in (data as object))
      || !Array.isArray((data as { documents?: unknown[] }).documents)
    ) {
      return
    }
    const list = (data as { documents: unknown[] }).documents
    const prevCount = Array.isArray(application.value?.documents)
      ? application.value!.documents.length
      : 0
    if (list.length === 0 && prevCount > 0) {
      console.warn('[radicacion] Refresh de documentos ignorado: respuesta vacía con adjuntos previos.')
      return
    }
    if (application.value) {
      skipFormSyncFromApplication.value = true
      try {
        application.value = {
          ...application.value,
          documents: list as typeof application.value.documents,
        }
        await nextTick()
      } finally {
        skipFormSyncFromApplication.value = false
      }
    }
  } catch {
    // La subida ya ocurrió; el listado se refrescará al recargar.
  }
}

/** Añade o reemplaza un documento en el listado local sin ir al servidor. */
function upsertLocalApplicationDocument(doc: {
  id: number
  title?: string | null
  original_name?: string | null
  applicant_id?: number | null
}): void {
  if (!application.value) {
    return
  }
  skipFormSyncFromApplication.value = true
  try {
    const prev = Array.isArray(application.value.documents)
      ? [...application.value.documents]
      : []
    const idx = prev.findIndex(d => Number((d as { id?: number }).id) === Number(doc.id))
    const row = {
      id: doc.id,
      title: doc.title ?? undefined,
      original_name: doc.original_name ?? undefined,
      applicant_id: doc.applicant_id ?? undefined,
    }
    if (idx >= 0) {
      prev[idx] = { ...(prev[idx] as object), ...row }
    } else {
      prev.push(row)
    }
    application.value = {
      ...application.value,
      documents: prev as typeof application.value.documents,
    }
  } finally {
    void nextTick().then(() => {
      skipFormSyncFromApplication.value = false
    })
  }
}

async function saveChanges() {
  const identityErr = validateApplicantMinimalIdentityForDraftSave(
    addingCodeudor.value ? codeudorWizardApplicant.value : form.value.debtor,
    addingCodeudor.value ? 'co_debtor' : 'debtor',
  )
  if (identityErr) {
    toast.error(identityErr)
    return
  }
  if (!hasValidSucursalSelection()) {
    if (!hasAssignedSucursal.value) {
      toast.error('Debe tener una sucursal asignada. Contacte al administrador.')
    } else if (!isAssignedSucursalActive.value) {
      toast.error('Su sucursal asignada no está activa. Contacte al administrador.')
    } else {
      toast.error(defaultAgencyError.value || 'No hay agencia activa configurada. Contacte al administrador.')
    }
    return
  }
  if (!validatePrivilegedFieldsForSave()) {
    return
  }

  saving.value = true
  try {
    await $csrf()
    const { data: updated } = await $api<{ data: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }>; co_debtors?: Array<{ applicant_id: number }> } }>(
      `/credit-applications/${id.value}`,
      { method: 'PUT', body: payloadForDraftPersist() },
    )
    await uploadAllDocuments(updated.id, updated)
    toast.success('Cambios guardados correctamente')
    router.push('/radicacion')
  } catch (e: unknown) {
    console.error('Error guardando:', e)
    toast.error(messageFromFetchError(e, 'Error al guardar'))
  } finally {
    saving.value = false
  }
}

async function confirmSubmitToDirector() {
  if (saving.value) return
  saving.value = true
  submitDirectorDialogOpen.value = false
  try {
    // saving ya está true: submitToDirectorReview no debe rearmarlo desde false al inicio
    await submitToDirectorReviewBody()
  } finally {
    saving.value = false
  }
}

function openSubmitDirectorDialog() {
  if (saving.value) return
  submitDirectorDialogOpen.value = true
}

async function submitToDirectorReview() {
  if (saving.value) return
  saving.value = true
  try {
    await submitToDirectorReviewBody()
  } finally {
    saving.value = false
  }
}

async function submitToDirectorReviewBody() {
  if (!skipsAgencyDirectorOnResubmit.value && !form.value.numero_radicado_externo?.trim()) {
    radicadoExternoDirectorError.value = true
    toast.error('Indique el número de radicado externo para enviar al director de agencia.')
    focusNumeroRadicadoExternoInput()
    return
  }
  if (!(await validateRadicacionStepOneForPersist())) {
    return
  }
  if (!canProceedStep1()) {
    toast.error(
      addingCodeudor.value
        ? 'Completa los datos obligatorios del codeudor'
        : 'Completa los datos obligatorios del deudor',
    )
    return
  }
  if (!canProceedStep2()) {
    toast.error('Completa monto, plazo, sucursal y destino del crédito')
    return
  }
  if (hasDocumentsWithoutTitle()) {
    toast.error('Todos los documentos adjuntos deben tener un título')
    return
  }
  const errTemplates = validateActivityTemplatesBeforeSave()
  if (errTemplates) {
    toast.error(errTemplates)
    return
  }
  if (!validatePrivilegedFieldsForSave()) {
    return
  }

  try {
    await $csrf()
    let applicationIdForSubmit = Number(application.value?.id ?? 0)
    if (!applicationIdForSubmit) {
      return
    }
    const { data: updated } = await $api<{ data: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }>; co_debtors?: Array<{ applicant_id: number }> } }>(
      `/credit-applications/${id.value}`,
      { method: 'PUT', body: payloadWithoutDocuments('Draft') },
    )
    await uploadAllDocuments(updated.id, updated)
    applicationIdForSubmit = updated.id
    const submitRes = await $api<{ message?: string }>(`/credit-applications/${applicationIdForSubmit}/submit-to-director-review`, { method: 'PATCH' })
    toast.success(submitRes?.message ?? 'Solicitud enviada al director de agencia.')
    await navigateTo('/radicacion')
  } catch (e: unknown) {
    console.error('Error enviando al director:', e)
    toast.error(messageFromFetchError(e, 'Error al enviar al director'))
  }
}

async function nextStep() {
  if (currentStep.value === 1) {
    const okRequired = radicacionStepOneFormRef.value?.validateRequiredStepOneFields() ?? true
    if (!okRequired) {
      toast.error('Completa los campos obligatorios del deudor')
      return
    }
    const okAux = radicacionStepOneFormRef.value?.validateAuxiliaryDocumentsRequired() ?? true
    if (!okAux) {
      return
    }
    if (!validatePrivilegedFieldsForSave()) {
      return
    }
  }
  if (currentStep.value === 2) {
    await nextTick()
    if (!debtorSkipsActivityTemplateStep()) {
      const templates = getActivityTemplates()
      const r = validateAllActivityTemplates(templates, { requireAtLeastOne: true })
      if (!r.valid) {
        toast.error(r.errors.join('. '))
        nextTick(() => debtorActivityTemplatesListRef.value?.highlightFirstInvalidFromList(templates))
        return
      }
    }
  }
  if (currentStep.value === 4) {
    if (form.value.amount_requested <= 0) {
      toast.error('Indique el monto solicitado')
      return
    }
    if (form.value.term_months <= 0) {
      toast.error('Indique el plazo en meses')
      return
    }
    if (!hasValidSucursalSelection()) {
      if (!hasAssignedSucursal.value) {
        toast.error('Debe tener una sucursal asignada')
      } else if (!isAssignedSucursalActive.value) {
        toast.error('Su sucursal asignada no está activa')
      } else {
        toast.error('No hay agencia activa configurada')
      }
      return
    }
    if (!form.value.destination?.trim()) {
      toast.error('Indique el destino del crédito')
      return
    }
    const destT = form.value.destination_activity_templates ?? []
    const rDest = validateDestinationReferenceActivityTemplates(destT)
    if (!rDest.valid) {
      toast.error(rDest.errors.join('. '))
      nextTick(() => destinationActivityTemplatesListRef.value?.highlightFirstInvalidFromList(destT))
      return
    }
  }
  if (currentStep.value < maxStep.value) currentStep.value++
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

// No vigilar en profundidad `application` / codeudores: mutaciones locales
// (p. ej. al subir documentos) recargaban el formulario desde el API y
// borraban plantillas, activos y tipo de actividad aún no guardados.
// La hidratación ocurre en fetchApplication() → syncFormFromApplication().

onMounted(() => {
  void fetchApplication()
  void fetchCatalogs()
  void fetchCreditDestinationOptions()
})
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col gap-4 px-0">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Radicación
        </h2>
        <p class="text-muted-foreground">
          Radicación - Editable
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <PermissionGate permission="radicacion_analisis_ver">
          <Button variant="outline" as-child class="shrink-0">
            <NuxtLink
              :to="{ path: '/radicacion/analisis-score', query: { solicitud: id } }"
            >
              <Icon name="i-lucide-chart-column-increasing" class="mr-2 h-4 w-4" />
              Análisis y SCORE
            </NuxtLink>
          </Button>
        </PermissionGate>
        <Button variant="outline" @click="router.push('/radicacion')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
      <p class="text-destructive font-medium">{{ error }}</p>
      <Button variant="outline" class="mt-4" @click="router.push('/radicacion')">
        Volver
      </Button>
    </div>

    <div
      v-else-if="application && !canEdit && isTerminalClosed"
      class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-center space-y-3"
    >
      <p class="font-medium text-amber-950 dark:text-amber-50">
        Esta solicitud está cerrada (desembolso o rechazado). No admite modificaciones para ningún rol; use la vista de solo lectura.
      </p>
      <Button as-child>
        <NuxtLink :to="`/radicacion/${application.id}`">
          Ver radicación
        </NuxtLink>
      </Button>
      <div>
        <Button variant="outline" @click="router.push('/radicacion')">
          Volver al listado
        </Button>
      </div>
    </div>

    <div
      v-else-if="application && !canEdit"
      class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
    >
      <p class="text-destructive font-medium">
        Solo se pueden editar solicitudes en estado Borrador o Devolución. Esta solicitud tiene estado: {{ application.status }}.
      </p>
      <Button variant="outline" class="mt-4" @click="router.push('/radicacion')">
        Volver
      </Button>
    </div>

    <template v-else-if="application && canEdit">
      <Card v-if="showEditTraceability">
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <CardTitle>Trazabilidad</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="returnTimelineExpanded = !returnTimelineExpanded"
            >
              <Icon :name="returnTimelineExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="mr-2 h-4 w-4" />
              {{ returnTimelineExpanded ? 'Contraer' : 'Expandir' }}
            </Button>
          </div>
          <CardDescription>
            Historial de estados y conceptos (incluye devoluciones del director, documentación o analista). Revíselo antes de corregir y reenviar.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="returnTimelineExpanded">
          <div v-if="timelineEvents.length === 0" class="text-sm text-muted-foreground">
            Aún no hay eventos de trazabilidad registrados.
          </div>
          <div v-else class="space-y-3">
            <div v-for="event in timelineEvents" :key="event.id" class="rounded-lg border p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-medium">{{ event.title }}</p>
                <span class="text-xs text-muted-foreground">{{ formatTraceabilityEventDate(event.created_at) }}</span>
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

      <div
        v-if="radicacionLastEditedLabel"
        class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-sm text-muted-foreground"
        role="status"
      >
        <Icon name="i-lucide-history" class="h-4 w-4 shrink-0 text-foreground/70" aria-hidden="true" />
        <span>
          <span class="font-medium text-foreground">Última modificación guardada:</span>
          {{ radicacionLastEditedLabel }}
          <span class="text-xs">(hora Colombia)</span>
        </span>
      </div>

      <div
        v-if="showReturnResubmitBanner"
        class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50"
        role="status"
      >
        <p class="font-medium">
          {{ returnBannerTitle || 'Devuelta para ajustes' }}
        </p>
        <p class="mt-1 text-muted-foreground">
          Puede corregir todos los datos del formulario y los documentos. Al reenviar, la solicitud vuelve a {{ resubmitToLabel(returnResubmitDestination) }}{{ skipNextDirectorReview ? ' (sin pasar otra vez por el director de agencia)' : '' }}.
        </p>
      </div>

      <div class="rounded-xl border bg-card p-4">
        <div class="space-y-1.5 max-w-2xl">
          <Label for="numero_radicado_externo" class="text-sm font-semibold">
            Número de radicado externo{{ skipsAgencyDirectorOnResubmit ? '' : ' *' }}
          </Label>
          <Input
            id="numero_radicado_externo"
            v-model="form.numero_radicado_externo"
            type="text"
            maxlength="100"
            placeholder="Ej: RAD-EXT-2025-001234"
            class="max-w-2xl font-mono"
            :aria-invalid="radicadoExternoDirectorError ? true : undefined"
            :class="
              radicadoExternoDirectorError
                ? 'border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive'
                : ''
            "
          />
          <p
            v-if="radicadoExternoDirectorError"
            class="text-sm text-destructive"
            role="alert"
          >
            Indique el número de radicado externo para enviar al director de agencia.
          </p>
          <p class="text-xs text-muted-foreground">
            {{
              skipsAgencyDirectorOnResubmit
                ? 'No es obligatorio para este reenvío (no pasa por el director de agencia).'
                : 'Obligatorio para enviar la solicitud al director de agencia.'
            }}
          </p>
        </div>
      </div>

      <PermissionGate permission="radicacion_ver_resumen_financiero" strict>
        <div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resumen financiero {{ addingCodeudor ? 'del codeudor' : 'del deudor' }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div class="space-y-1">
              <Label for="res_solvencia" class="text-sm font-bold uppercase">Solvencia</Label>
              <div
                id="res_solvencia"
                class="flex h-10 w-full items-center rounded-md border px-3 py-2 text-base font-semibold"
                :class="solvenciaColorClass(solvenciaPercentage)"
              >
                {{ solvenciaPercentage != null ? `${solvenciaPercentage.toFixed(2)} %` : '—' }}
              </div>
              <p class="text-[10px] text-muted-foreground">
                (Pasivos + monto solicitado) ÷ Activos
              </p>
            </div>
            <div class="space-y-1">
              <Label for="res_endeudamiento" class="text-sm font-bold uppercase">Endeudamiento</Label>
              <div
                id="res_endeudamiento"
                class="flex h-10 w-full items-center rounded-md border px-3 py-2 text-base font-semibold"
                :class="solvenciaColorClass(endeudamientoPercentage)"
              >
                {{ endeudamientoPercentage != null ? `${endeudamientoPercentage.toFixed(2)} %` : '—' }}
              </div>
              <p class="text-[10px] text-muted-foreground">
                (Pasivos + monto solicitado) ÷ Bien raíz
              </p>
            </div>
            <div class="space-y-1">
              <Label for="res_activos" class="text-sm font-bold uppercase">Activos</Label>
              <Input
                id="res_activos"
                :model-value="formatPesosConSimbolo(totalActivosFromAssets)"
                type="text"
                placeholder="0"
                readonly
                class="cursor-default bg-muted/50 font-semibold"
                title="Suma total de todos los activos reportados"
              />
              <p class="text-[10px] text-muted-foreground">
                Total de activos reportados
              </p>
            </div>
            <div class="space-y-1">
              <Label for="res_pasivos" class="text-sm font-bold uppercase">Pasivos</Label>
              <Input
                id="res_pasivos"
                :model-value="formatPesosConSimbolo(getSolvencyField('liabilities'))"
                type="text"
                inputmode="decimal"
                placeholder="0"
                class="font-semibold"
                @keydown="onKeydownPesosOnly"
                @update:model-value="setSolvencyField('liabilities', parsePesosInput(String($event)))"
              />
            </div>
            <div class="space-y-1">
              <Label for="res_bien_raiz" class="text-sm font-bold uppercase">Bien raíz</Label>
              <Input
                id="res_bien_raiz"
                :model-value="formatPesosConSimbolo(bienRaizFromGarantias)"
                type="text"
                placeholder="0"
                readonly
                class="cursor-default bg-muted/50 font-semibold"
                title="Se calcula con la suma de activos marcados como garantía"
              />
              <p class="text-[10px] text-muted-foreground">
                Suma de activos con Garantía
              </p>
            </div>
          </div>
        </div>
      </PermissionGate>

      <div v-if="!addingCodeudor" class="flex flex-wrap items-center gap-2">
        <template v-for="(step, idx) in steps" :key="step.num">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="[
              currentStep === step.num
                ? 'bg-primary text-primary-foreground cursor-default'
                : 'cursor-pointer hover:bg-muted',
            ]"
            :aria-current="currentStep === step.num ? 'step' : undefined"
            @click="currentStep = step.num"
          >
            <div
              class="flex w-8 h-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
              :class="currentStep === step.num
                ? 'bg-primary text-primary-foreground ring-primary'
                : currentStep > step.num
                  ? 'bg-primary/30 text-primary ring-primary/30'
                  : 'bg-background text-foreground ring-muted-foreground/40'"
            >
              {{ step.num }}
            </div>
            <span
              class="text-sm font-semibold hidden sm:inline"
              :class="currentStep === step.num ? 'text-primary-foreground' : 'text-foreground'"
            >
              {{ step.title }}
            </span>
          </button>
          <Icon
            v-if="idx < steps.length - 1"
            name="i-lucide-chevron-right"
            class="h-4 w-4 shrink-0 text-muted-foreground"
          />
        </template>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {{ addingCodeudor
              ? `${codeudorEditIndex != null ? 'Editar' : 'Agregar'} Codeudor - ${stepsCodeudor[codeudorStep - 1]?.title ?? ''}`
              : (steps[currentStep - 1]?.title ?? '') }}
          </CardTitle>
          <CardDescription>
            {{ addingCodeudor
              ? (codeudorStep === 1
                  ? 'Busca por cédula o completa el formulario (datos personales y concepto del codeudor)'
                  : codeudorStep === 2
                    ? 'Opcional. Plantillas agropecuarias según la actividad económica del codeudor'
                    : 'Ingresos, gastos y solvencia del codeudor')
              : (currentStep === 1
                ? 'Busca por cédula o completa el formulario del deudor principal'
                : currentStep === 2
                  ? (debtorWithoutActivityTemplate
                    ? 'Sin plantilla de actividad económica'
                    : 'Plantillas agropecuarias según la actividad económica del deudor')
                  : currentStep === 3
                    ? 'Ingresos, gastos y solvencia del deudor'
                    : currentStep === 4
                      ? 'Monto, plazo y destino del crédito'
                      : 'Agrega codeudores si aplica') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div
            v-show="!addingCodeudor && currentStep === 1"
            class="space-y-4"
          >
            <ApplicantFormFields
              ref="radicacionStepOneFormRef"
              v-model="form.debtor"
              :credit-application-id="application?.id"
              :show-search="true"
              :loading-search="loadingSearch"
              :hide-financial-section="true"
              :read-only-form="false"
              :show-documentos-auxiliar-checklist="!addingCodeudor"
              :credit-application-documents="application?.documents ?? []"
              @search="searchApplicant"
            />
            <div
              v-if="hasPermission('radicacion_marcar_privilegiado')"
              class="space-y-1.5 rounded-md border border-dashed border-muted-foreground/25 bg-muted/10 p-4"
            >
              <Label for="form_is_privileged_trigger">¿Es privilegiado? *</Label>
              <Select
                :model-value="form.is_privileged === true ? 'yes' : 'no'"
                @update:model-value="onIsPrivilegedSelectUpdate"
              >
                <SelectTrigger id="form_is_privileged_trigger">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">
                    No
                  </SelectItem>
                  <SelectItem value="yes">
                    Sí
                  </SelectItem>
                </SelectContent>
              </Select>
              <div v-if="form.is_privileged === true" class="space-y-1.5">
                <Label for="form_privileged_justification">Justificación (privilegiado) *</Label>
                <textarea
                  id="form_privileged_justification"
                  v-model="form.privileged_justification"
                  rows="4"
                  class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Explique por qué esta solicitud se considera privilegiada."
                />
                <p class="text-xs text-muted-foreground">
                  Mínimo 10 caracteres. Queda guardado con la solicitud para informes.
                </p>
              </div>
              <p class="text-xs text-muted-foreground">
                Queda guardado con la solicitud para informes. El director de crédito puede confirmarlo o cambiarlo al registrar la decisión final.
              </p>
            </div>
          </div>

          <div
            v-show="!addingCodeudor && currentStep === 2"
            class="space-y-4"
          >
            <label
              class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5"
            >
              <Checkbox
                id="debtor_without_activity_template_edit"
                bare
                v-model:checked="debtorWithoutActivityTemplate"
              />
              <span class="text-sm">Sin plantilla de actividad</span>
            </label>
            <CreditsFinancialActivityFormList
              v-if="!debtorWithoutActivityTemplate"
              ref="debtorActivityTemplatesListRef"
              :model-value="getActivityTemplates()"
              @update:model-value="setActivityTemplates"
            />
            <p
              v-else
              class="text-sm text-muted-foreground"
            >
              No se requiere configurar plantillas agropecuarias para este deudor.
            </p>
          </div>

          <div
            v-show="!addingCodeudor && currentStep === 3"
            class="space-y-4"
          >
            <ApplicantFormFields
              v-model="form.debtor"
              :credit-application-id="application?.id"
              :show-only-financial="true"
            />
          </div>

          <div v-show="!addingCodeudor && currentStep === 4" class="space-y-8">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div class="space-y-1.5">
                <Label for="amount">Monto solicitado * (COP)</Label>
                <Input
                  id="amount"
                  :model-value="formatPesosConSimbolo(form.amount_requested)"
                  type="text"
                  inputmode="decimal"
                  placeholder="Ej: 5.000.000"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => (form.amount_requested = parsePesosInput(String(v)) ?? 0)"
                />
              </div>
              <div class="space-y-1.5">
                <Label for="term">Plazo (meses) *</Label>
                <Input
                  id="term"
                  v-model.number="form.term_months"
                  type="number"
                  min="1"
                  placeholder="Ej: 12"
                  inputmode="numeric"
                  @keydown="onKeydownNumeric($event, false)"
                />
              </div>
              <div class="space-y-1.5">
                <Label for="agency-sucursal">Sucursal *</Label>
                <Input
                  v-if="hasAssignedSucursal"
                  id="agency-sucursal"
                  :model-value="assignedSucursalLabel"
                  readonly
                  disabled
                  class="bg-muted"
                />
                <p v-else class="text-sm text-destructive">
                  No tiene sucursal asignada. Contacte al administrador.
                </p>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label for="destination">Destino del crédito *</Label>
                <Multiselect
                  id="destination"
                  :model-value="form.destination ? form.destination : null"
                  :options="creditDestinationOptions"
                  mode="single"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :can-clear="false"
                  placeholder="Seleccionar destino"
                  no-options-text="Sin opciones. Configure «Destino del crédito» en Parametrización → Radicación."
                  no-results-text="Sin coincidencias"
                  class="multiselect-municipality"
                  @update:model-value="form.destination = ($event != null && $event !== '') ? String($event) : ''"
                />
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label for="destination_description">Descripción específica del destino del crédito</Label>
                <textarea
                  id="destination_description"
                  v-model="form.destination_description"
                  class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describa en detalle el uso que se le dará al crédito"
                  rows="4"
                  :maxlength="PASTED_PLAIN_TEXT_MAX_LENGTH"
                  @paste="onPasteDestinationDescription"
                  @blur="onBlurDestinationDescription"
                />
                <p class="text-[11px] text-muted-foreground">
                  Al pegar desde Word se limpian espacios extra y caracteres especiales.
                  {{ (form.destination_description ?? '').length }}/{{ PASTED_PLAIN_TEXT_MAX_LENGTH }}
                </p>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <div class="max-w-md space-y-1.5">
                  <Label for="credito_garantia_fng">Créditos con garantía del Fondo Nacional de Garantías (FNG) *</Label>
                  <Multiselect
                    id="credito_garantia_fng"
                    :model-value="creditoGarantiaFngBooleanToSelectValue(form.credito_garantia_fng)"
                    :options="RADICACION_CREDITO_GARANTIA_FNG_OPTIONS"
                    mode="single"
                    value-prop="value"
                    label="label"
                    :searchable="false"
                    :can-clear="false"
                    placeholder="Seleccionar"
                    no-results-text="Sin coincidencias"
                    class="multiselect-municipality w-full"
                    @update:model-value="form.credito_garantia_fng = selectValueToCreditoGarantiaFngBoolean($event)"
                  />
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    Por defecto «No». Elija «Sí» solo si la operación cuenta con cobertura o garantía del FNG. Si marca «Sí», cargue el paquete FNG en el bloque siguiente; <span class="font-medium text-foreground">revisión de documentación</span> adjunta un único documento de respaldo al aprobar.
                  </p>
                </div>
              </div>
              <div
                v-if="form.credito_garantia_fng && application?.id"
                class="space-y-3 sm:col-span-2 lg:col-span-3"
              >
                <Card class="border-border/80">
                  <CardHeader class="pb-2">
                    <CardTitle class="text-base">
                      Documentos FNG (Fondo Nacional de Garantías)
                    </CardTitle>
                    <CardDescription class="text-xs leading-relaxed">
                      Checklist según Parametrización → Radicación (plantilla «FNG — documentos»). Mismo criterio de archivos que documentos auxiliares (PDF, ZIP, imagen · máximo 10 MB).
                    </CardDescription>
                  </CardHeader>
                  <CardContent class="pt-0">
                    <FngDocumentsSection
                      :applicant="form.debtor"
                      :credit-application-id="application.id"
                      :application-documents="(application?.documents ?? [])"
                      :disabled="!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
                      auxiliary-pending-upload-hint="draftSave"
                      interaction-mode="full"
                      checklist-scope="adviser_pack"
                      @update:applicant="(v) => { form.debtor = v }"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            <div class="space-y-4 border-t border-border pt-6">
              <div>
                <p class="text-sm font-medium">
                  Actividades económicas del destino (referencia)
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Opcional: puede añadir plantillas con la herramienta de abajo; los valores son solo referencia y no alteran ingresos ni datos financieros del deudor.
                </p>
              </div>
              <CreditsFinancialActivityFormList
                ref="destinationActivityTemplatesListRef"
                v-model="form.destination_activity_templates"
                list-hint="Añade plantillas que ilustren cómo se invertirá o destinará el crédito. No se sincronizan con el paso 2 ni el 3."
              />
            </div>
          </div>

          <div
            v-show="currentStep === 5 && !addingCodeudor"
            class="space-y-6"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <p class="text-sm text-muted-foreground">
                Agrega codeudores si el crédito lo requiere
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="startAddingCodeudor"
              >
                <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                Agregar Codeudor
              </Button>
            </div>

            <div v-if="form.co_debtors.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay codeudores. Haz clic en "Agregar Codeudor" si aplica.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(co, idx) in form.co_debtors"
                :key="idx"
                class="flex w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2.5 sm:gap-3"
              >
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  class="h-8 shrink-0 gap-1.5 px-2 text-xs"
                  title="Eliminar codeudor"
                  @click="removeCoDebtor(idx)"
                >
                  <Icon name="i-lucide-trash" class="h-3.5 w-3.5 shrink-0" />
                  Eliminar
                </Button>
                <div class="min-w-0 flex-1 font-medium">
                  Codeudor {{ idx + 1 }}
                  <span v-if="co.first_name || co.first_last_name" class="ml-2 text-muted-foreground font-normal">
                    ({{ [co.first_name, co.first_last_name].filter(Boolean).join(' ') || 'Sin nombre' }})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 shrink-0 gap-1.5"
                  @click="startEditingCodeudor(idx)"
                >
                  <Icon name="i-lucide-pencil" class="h-3.5 w-3.5 shrink-0" />
                  Editar
                </Button>
              </div>
            </div>
          </div>

          <div
            v-if="addingCodeudor"
            class="space-y-6"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="cancelAddingCodeudor"
              >
                <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
                Volver al deudor
              </Button>
              <div class="flex flex-wrap items-center gap-2">
                <template v-for="(s, idx) in stepsCodeudor" :key="s.num">
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :class="[
                      codeudorStep === s.num
                        ? 'bg-primary text-primary-foreground cursor-default'
                        : 'cursor-pointer hover:bg-muted',
                    ]"
                    @click="codeudorStep = s.num"
                  >
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
                      :class="codeudorStep === s.num ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background'"
                    >
                      {{ s.num }}
                    </div>
                    <span class="text-sm font-semibold hidden sm:inline">{{ s.title }}</span>
                  </button>
                  <Icon v-if="idx < stepsCodeudor.length - 1" name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 text-muted-foreground" />
                </template>
              </div>
            </div>

            <div v-show="codeudorStep === 1" class="space-y-4">
              <ApplicantFormFields
                ref="codeudorWizardStepOneFormRef"
                v-model="codeudorWizardApplicant"
                :credit-application-id="application?.id"
                :show-search="true"
                :loading-search="loadingSearch"
                :show-co-debtor-concept="true"
                :hide-financial-section="true"
                :read-only-form="false"
                :show-documentos-auxiliar-checklist="true"
                :credit-application-documents="application?.documents ?? []"
                @search="searchApplicantForWizard"
              />
            </div>
            <div v-show="codeudorStep === 2" class="space-y-4">
              <CreditsFinancialActivityFormList
                ref="codeudorActivityTemplatesListRef"
                :model-value="getActivityTemplatesFor(codeudorWizardApplicant)"
                @update:model-value="(v) => setActivityTemplatesFor(codeudorWizardApplicant, v)"
              />
            </div>
            <div v-show="codeudorStep === 3" class="space-y-4">
              <ApplicantFormFields
                v-model="codeudorWizardApplicant"
                :credit-application-id="application?.id"
                :show-only-financial="true"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <div class="flex gap-2">
                <Button
                  v-if="codeudorStep > 1"
                  type="button"
                  variant="outline"
                  @click="prevCodeudorStep"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  @click="cancelAddingCodeudor"
                >
                  <Icon name="i-lucide-x" class="mr-2 h-4 w-4" />
                  Volver al deudor
                </Button>
                <Button
                  v-if="codeudorStep < 3"
                  type="button"
                  @click="nextCodeudorStep"
                >
                  Siguiente
                </Button>
              </div>
              <Button
                v-if="codeudorStep === 3"
                type="button"
                @click="finalizeCodeudorWizard"
              >
                <Icon :name="codeudorEditIndex != null ? 'i-lucide-save' : 'i-lucide-plus'" class="mr-2 h-4 w-4" />
                {{ codeudorEditIndex != null ? 'Guardar cambios' : 'Agregar codeudor' }}
              </Button>
            </div>
          </div>

          <div v-if="!addingCodeudor" class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
            <div class="flex gap-2">
              <Button
                v-if="currentStep > 1"
                type="button"
                variant="outline"
                @click="prevStep"
              >
                Anterior
              </Button>
              <Button
                v-if="currentStep < maxStep"
                type="button"
                @click="nextStep"
              >
                Siguiente
              </Button>
            </div>
            <div class="flex gap-2">
              <Button
                type="button"
                variant="outline"
                :disabled="saving"
                @click="saveChanges"
              >
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                Guardar borrador
              </Button>
              <Button
                type="button"
                :disabled="saving"
                @click="openSubmitDirectorDialog"
              >
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{
                  skipNextDirectorReview
                    ? 'Enviar a revisión de documentación'
                    : resubmitToAnalyst
                      ? 'Enviar al analista'
                      : resubmitToCreditDirector
                        ? 'Enviar al director de crédito'
                        : 'Enviar al director'
                }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog v-model:open="submitDirectorDialogOpen">
        <AlertDialogContent class="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {{
                skipNextDirectorReview
                  ? 'Confirmar envío a revisión de documentación'
                  : resubmitToAnalyst
                    ? 'Confirmar envío al analista'
                    : resubmitToCreditDirector
                      ? 'Confirmar envío al director de crédito'
                      : 'Confirmar envío al director'
              }}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <template v-if="skipNextDirectorReview">
                Esta acción guarda los cambios y envía la radicación de nuevo a revisión de documentación, sin pasar por el director de agencia (ya estaba aprobado en esa etapa).
              </template>
              <template v-else-if="resubmitToAnalyst">
                Esta acción guarda los cambios y envía la radicación de nuevo a análisis.
              </template>
              <template v-else-if="resubmitToCreditDirector">
                Esta acción guarda los cambios y envía la radicación de nuevo a revisión del director de crédito.
              </template>
              <template v-else>
                Esta acción guarda el borrador y envía la radicación a revisión del director de agencia.
              </template>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              :disabled="saving"
              @click="confirmSubmitToDirector"
            >
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Confirmar
            </Button>
            <AlertDialogCancel :disabled="saving">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>
  </div>
</template>
