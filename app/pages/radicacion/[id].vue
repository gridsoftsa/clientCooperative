<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import InsurabilityDocumentsSection from '~/components/radicacion/InsurabilityDocumentsSection.vue'
import FngDocumentsSection from '~/components/radicacion/FngDocumentsSection.vue'
import ApproverEntityDocumentsSection from '~/components/radicacion/ApproverEntityDocumentsSection.vue'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import RadicacionResumenFinancieroDeudor from '~/components/radicacion/RadicacionResumenFinancieroDeudor.vue'
import RadicacionResumenFinancieroDeudorComparacion from '~/components/radicacion/RadicacionResumenFinancieroDeudorComparacion.vue'
import CreditsFinancialActivityFormList from '~/components/credits/FinancialActivityFormList.vue'
import { getCreditApplicationStatusLabel, isCreditApplicationTerminalImmutable, isCreditApplicationAdviserEditableStatus, isCreditApplicationReturnedToAdviser } from '~/constants/credit-application-status'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { parseActivityTemplateList } from '~/types/credit-application'
import { normalizeFinancialInfoAliases } from '~/utils/merge-applicant-search'
import { RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK } from '~/constants/radicacion-form-catalog-fallbacks'
import {
  extractItemsByActivityFromCatalogResponse,
  resolveAuxiliaryChecklistRows,
  titleForAuxiliaryDocumentUpload,
} from '~/constants/auxiliary-documents-checklist'
import {
  extractInsurabilityItemsFromCatalogResponse,
  titleForInsurabilityDocumentUpload,
} from '~/constants/documentation-insurability-checklist'
import {
  extractFngItemsFromCatalogResponse,
  titleForFngDocumentUpload,
} from '~/constants/documentation-fng-checklist'
import {
  extractApproverEntityItemsFromCatalogResponse,
  titleForApproverEntityDocumentUpload,
} from '~/constants/documentation-approver-entity-checklist'

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
    && (
      hasPermission('radicacion_documentos_subir')
      || hasPermission('radicacion_insurability_documentos_subir')
      || hasPermission('radicacion_fng_documentos_subir')
    ),
)

/** Subida de checklist de asegurabilidad: permitida en cualquier estado no terminal (con permiso). */
const insurabilityDocumentUploadMode = computed(
  () =>
    Boolean(application.value?.id)
    && !isCreditApplicationTerminalImmutable(application.value?.status)
    && (
      hasPermission('radicacion_insurability_documentos_subir')
      || hasPermission('radicacion_documentos_subir')
    ),
)
const skipDocumentationFinancialPatch = ref(true)

/**
 * Firma estable de los campos que el PATCH documental persiste (evita PATCH al montar el formulario:
 * `ApplicantFormFields` sincroniza `solvency.real_estate` desde garantías con `watch(..., { immediate: true })`,
 * lo que muta `financial_info` sin cambiar activity/aux/ins/approver).
 */
const lastDebtorDocumentationFinancialPatchSignature = ref('')

/** Borrador editable: redirige a /editar. Las devoluciones al asesor se quedan aquí para ver trazabilidad y motivo antes de corregir. */
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
  const toAdviser = new Set(['Returned', 'Returned_Credit_Modification', 'Returned_Insurer_Response'])
  return events.some(
    (e: unknown) =>
      e != null
      && typeof e === 'object'
      && toAdviser.has(String((e as { to_status?: unknown }).to_status ?? '')),
  )
}
const directorDecision = ref<'approved' | 'returned' | ''>('')
const directorConcept = ref('')
const directorDecisionDialogOpen = ref(false)
const submittingDirectorDecision = ref(false)
const documentationDecision = ref<'approved' | 'returned' | ''>('')
const documentationConcept = ref('')
const documentationInsurabilityChoice = ref<'yes' | 'no'>('no')
const documentationInsurabilityStatusValue = ref('')
const documentationInsurabilityStatusJustification = ref('')
const documentationInsurabilityStatusOptions = ref<Array<{ value: string, label: string }>>([])
const documentationDecisionDialogOpen = ref(false)
const submittingDocumentationDecision = ref(false)
const submittingInsurabilityStatusPatch = ref(false)
/** `yes` | `no` — al aprobar revisión documental se envía como `credit_mortgage_options: [value]`. */
const documentationCreditMortgage = ref<'' | 'yes' | 'no'>('')
const documentationMortgageSelectOptions = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
]
const fngStandaloneCollapsibleOpen = ref(true)
const selectedCoDebtorIndex = ref<number | null>(null)
const selectedCoDebtorStep = ref(1)
const canDirectorDecide = computed(
  () => hasPermission('radicacion_director_decidir') && application.value?.status === 'Director_Review',
)
const canDocumentationDecide = computed(
  () => hasPermission('radicacion_documentos_decidir') && application.value?.status === 'Documentation_Review',
)

const documentationReviewFlowActive = computed(
  () => String(application.value?.status ?? '') === 'Documentation_Review',
)

const documentationAuxiliaryInteractionMode = computed((): 'full' | 'uploadOnly' | 'viewOnly' => {
  if (!documentationReviewFlowActive.value) {
    return 'full'
  }
  return documentationUploadMode.value ? 'uploadOnly' : 'viewOnly'
})

/**
 * Asegurabilidad: subida de primera versión permitida; «Revisado» no aplica en esta sección.
 */
const insurabilityDocumentationInteractionMode = computed((): 'full' | 'uploadOnly' | 'viewOnly' => {
  if (!hasPermission('radicacion_insurability_documentos_subir') && !hasPermission('radicacion_documentos_subir')) {
    return 'viewOnly'
  }
  if (isCreditApplicationTerminalImmutable(application.value?.status)) {
    return 'viewOnly'
  }
  return 'full'
})

const showInsurabilityDocumentsSection = computed(
  () =>
    hasPermission('radicacion_insurability_ver')
    && (
      application.value?.documentation_insurability_required === true
      || (canDocumentationDecide.value && documentationInsurabilityChoice.value === 'yes')
    ),
)

/** En revisión documental el bloque de documentos va dentro de la misma tarjeta, arriba de la decisión. */
const inlineInsurabilityDocumentsInDocReviewCard = computed(
  () => canDocumentationDecide.value && documentationReviewFlowActive.value && showInsurabilityDocumentsSection.value,
)

/** Fuera de la tarjeta de decisión documental (p. ej. analista con seguimiento). */
const showInsurabilityDocumentsAsStandaloneCard = computed(
  () => showInsurabilityDocumentsSection.value && !inlineInsurabilityDocumentsInDocReviewCard.value,
)

/** Misma vista que asegurabilidad independiente y crédito con FNG: mostrar checklist FNG aquí (evita omitirlo si no tienen `radicacion_fng_ver` solo). */
const showFngEmbeddedWithStandaloneInsurability = computed(
  () => showInsurabilityDocumentsAsStandaloneCard.value && Boolean(form.value.credito_garantia_fng),
)

const showFngDocumentsSection = computed(
  () =>
    hasPermission('radicacion_fng_ver')
    && form.value.credito_garantia_fng === true,
)

const inlineFngDocumentsInDocReviewCard = computed(
  () => canDocumentationDecide.value && documentationReviewFlowActive.value && showFngDocumentsSection.value,
)

const showFngDocumentsAsStandaloneCard = computed(
  () =>
    showFngDocumentsSection.value
    && !inlineFngDocumentsInDocReviewCard.value
    && !showFngEmbeddedWithStandaloneInsurability.value,
)

const fngDocumentationInteractionMode = computed((): 'full' | 'uploadOnly' | 'viewOnly' => {
  if (!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')) {
    return 'viewOnly'
  }
  if (isCreditApplicationTerminalImmutable(application.value?.status)) {
    return 'viewOnly'
  }
  if (String(application.value?.status ?? '') !== 'Documentation_Review') {
    return 'viewOnly'
  }
  return 'full'
})

/** Estado catalogado de asegurabilidad: solo usuarios con permiso explícito (plantilla: director de crédito). */
const showInsurabilityStatusInAsegurabilidadCard = computed(
  () =>
    hasPermission('radicacion_insurability_status_editar')
    && application.value?.documentation_insurability_required === true,
)

const canEditInsurabilityStatusInAsegurabilidadSection = computed(
  () =>
    showInsurabilityStatusInAsegurabilidadCard.value
    && !isCreditApplicationTerminalImmutable(application.value?.status),
)

const showDocumentationAuxiliaryChecklist = computed(() => documentationReviewFlowActive.value)

const showAuxiliaryDocumentReviewInChecklist = computed(
  () => documentationReviewFlowActive.value && canDocumentationDecide.value,
)
/** Devolución: el reenvío a revisión documental solo está en /editar (botón «Enviar a revisión de documentación»). */
const showReturnedCorrectionHint = computed(
  () =>
    Boolean(
      application.value
        && isCreditApplicationReturnedToAdviser(application.value.status)
        && hasAnyPermission(['radicacion_crear', 'radicacion_editar']),
    ),
)
const returnedFromDocumentationReview = computed(() => Boolean(application.value?.skip_next_director_review))
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

const creditDirectorDecision = ref<'approved' | 'rejected' | 'returned_modification' | 'returned_insurer_response' | ''>('')
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
const insurabilityStandaloneCollapsibleOpen = ref(true)
const creditDirectorSectionCollapsibleOpen = ref(true)
const documentationReviewConceptCollapsibleOpen = ref(true)
const creditDirectorDecisionOptions = [
  { value: 'approved', label: 'Aprobar para desembolso' },
  { value: 'rejected', label: 'Rechazar solicitud' },
  { value: 'returned_modification', label: 'Modificación' },
  { value: 'returned_insurer_response', label: 'Respuesta aseguradora' },
]
const canCreditDirectorDecide = computed(
  () => hasPermission('radicacion_director_credito_decidir') && application.value?.status === 'Credit_Director_Review',
)

/** Subida del checklist del ente aprobador: solo en revisión del director de crédito. */
const approverEntityDocumentUploadMode = computed(
  () =>
    application.value?.status === 'Credit_Director_Review'
    && (
      hasPermission('radicacion_approver_entity_documentos_subir')
      || hasPermission('radicacion_documentos_subir')
    ),
)

const approverEntityDocumentationInteractionMode = computed((): 'full' | 'uploadOnly' | 'viewOnly' => {
  if (hasPermission('radicacion_approver_entity_documentos_subir') || hasPermission('radicacion_documentos_subir')) {
    if (application.value?.status !== 'Credit_Director_Review') {
      return 'viewOnly'
    }
    return 'full'
  }
  if (
    hasPermission('radicacion_approver_entity_ver')
    && application.value?.status === 'Credit_Director_Review'
  ) {
    return 'viewOnly'
  }
  return 'viewOnly'
})

const showApproverEntityDocumentsInCreditDirectorCard = computed(
  () =>
    canCreditDirectorDecide.value
    && creditDirectorDecision.value === 'approved'
    && creditDirectorApproverValue.value.trim() !== ''
    && (
      hasPermission('radicacion_approver_entity_ver')
      || hasPermission('radicacion_approver_entity_documentos_subir')
      || hasPermission('radicacion_documentos_subir')
    ),
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
  if (
    value === 'approved'
    || value === 'rejected'
    || value === 'returned_modification'
    || value === 'returned_insurer_response'
  ) {
    creditDirectorDecision.value = value
    if (value !== 'approved') {
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

async function loadInsurabilityStatusCatalog(): Promise<void> {
  try {
    const res = await $api<{ data: { options?: Array<{ value: string, label: string }> } }>(
      '/catalogs/template-flat-data/insurability-status',
    )
    const opts = res.data?.options
    documentationInsurabilityStatusOptions.value = Array.isArray(opts) ? opts : []
  } catch (e) {
    console.error('Error cargando catálogo estado asegurabilidad:', e)
    documentationInsurabilityStatusOptions.value = []
  }
}

function insurabilityStatusLabelForCatalogValue(value: string | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }
  const o = documentationInsurabilityStatusOptions.value.find(x => x.value === value)
  return o?.label ?? value
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

/**
 * IDs de `credit_application_documents` referenciados en `financial_info.auxiliaryDocuments`
 * (deudor, codeudores y pivots de la solicitud cargada).
 */
function auxiliaryDocumentIdsLinkedInReview(): Set<number> {
  const s = new Set<number>()
  const ingest = (fi: unknown): void => {
    if (!fi || typeof fi !== 'object') {
      return
    }
    const raw = (fi as { auxiliaryDocuments?: unknown }).auxiliaryDocuments
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return
    }
    for (const v of Object.values(raw)) {
      let n: number
      if (typeof v === 'number' && Number.isFinite(v)) {
        n = v
      } else if (typeof v === 'string' && /^\d+$/.test(String(v).trim())) {
        n = parseInt(String(v).trim(), 10)
      } else {
        continue
      }
      if (n > 0) {
        s.add(n)
      }
    }
  }
  ingest(form.value.debtor.financial_info)
  for (const co of form.value.co_debtors ?? []) {
    ingest(co.financial_info)
  }
  const app = application.value
  if (app) {
    const rows = app.application_applicants ?? app.applicationApplicants ?? []
    for (const r of rows as Array<{ financial_info?: unknown }>) {
      ingest(parseJsonField(r.financial_info))
    }
  }
  return s
}

/**
 * En `Documentation_Review` solo exigimos «Revisado» en adjuntos del checklist auxiliar (mapa
 * `auxiliaryDocuments`). Los de asegurabilidad no usan «Revisado» en esta vista.
 */
const allDocumentsMarkedReviewed = computed(() => {
  const docs = application.value?.documents ?? []
  if (docs.length === 0) {
    return true
  }
  const st = String(application.value?.status ?? '')
  if (st !== 'Documentation_Review') {
    return docs.every((d: { is_reviewed?: boolean }) => Boolean(d.is_reviewed))
  }
  const auxIds = auxiliaryDocumentIdsLinkedInReview()
  const useLinkedOnly = auxIds.size > 0
  if (!useLinkedOnly) {
    return docs.every((d: { is_reviewed?: boolean }) => Boolean(d.is_reviewed))
  }
  return docs.every((d: { id?: unknown, is_reviewed?: boolean }) => {
    const id = Number(d.id)
    if (!Number.isFinite(id) || !auxIds.has(id)) {
      return true
    }
    return Boolean(d.is_reviewed)
  })
})

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
  const seenByApplicant: Record<string, Set<number>> = {}
  for (const doc of docs) {
    const aid = doc.applicant_id
    if (aid == null) continue
    const key = String(aid)
    const id = Number(doc.id)
    if (!Number.isFinite(id)) {
      continue
    }
    if (!byApplicant[key]) {
      byApplicant[key] = []
      seenByApplicant[key] = new Set()
    }
    if (seenByApplicant[key]!.has(id)) {
      continue
    }
    seenByApplicant[key]!.add(id)
    byApplicant[key].push(doc)
  }
  return byApplicant
})

function getDocumentsForApplicant(applicantId: number | string | null | undefined): any[] {
  if (applicantId == null) return []
  return documentsByApplicant.value[String(applicantId)] ?? []
}

function creditMortgageSummaryText(opts: unknown): string {
  if (!Array.isArray(opts) || opts.length !== 1) {
    return '—'
  }
  const v = opts[0]
  return v === 'yes' ? 'Sí' : v === 'no' ? 'No' : '—'
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

async function openCreditDirectorDecisionDialog() {
  if (submittingCreditDirectorDecision.value) {
    return
  }
  try {
    await flushDebtorInsurabilityDocumentUploads()
    await flushDebtorFngDocumentUploads()
    await flushDebtorApproverEntityDocumentUploads()
    await patchDebtorDocumentationFinancialToServer()
  } catch (e: any) {
    if (e?.message === 'document_too_large') {
      return
    }
    console.error(e)
    toast.error(e?.data?.message ?? 'No se pudieron sincronizar los documentos antes de registrar la decisión.')
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
  if (
    application.value?.documentation_insurability_required === true
    && creditDirectorDecision.value === 'approved'
    && creditDirectorIsExceptionChoice.value === 'no'
  ) {
    if (documentationInsurabilityStatusValue.value === '') {
      toast.error('Seleccione el estado de asegurabilidad.')
      return
    }
    if (documentationInsurabilityStatusJustification.value.trim().length < 10) {
      toast.error('Escriba la justificación del estado de asegurabilidad (mínimo 10 caracteres).')
      return
    }
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
  }
  if (creditDirectorDecision.value === 'approved') {
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
      approver_value: creditDirectorDecision.value === 'approved'
        ? creditDirectorApproverValue.value.trim()
        : null,
    }
    if (
      application.value?.documentation_insurability_required === true
      && creditDirectorDecision.value === 'approved'
      && !isEx
    ) {
      body.insurability_status_value = documentationInsurabilityStatusValue.value.trim()
      body.insurability_status_justification = documentationInsurabilityStatusJustification.value.trim()
    }
    if (creditDirectorDecision.value === 'approved') {
      const fiRaw = form.value.debtor.financial_info
      if (fiRaw && typeof fiRaw === 'object') {
        const m = (fiRaw as Record<string, unknown>).approverEntityDocuments
        if (m && typeof m === 'object' && !Array.isArray(m)) {
          body.approver_entity_documents = m
        }
      }
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

function onDocumentationInsurabilityChoiceUpdate(v: unknown): void {
  documentationInsurabilityChoice.value = v === 'yes' ? 'yes' : 'no'
  if (documentationInsurabilityChoice.value === 'no') {
    documentationInsurabilityStatusValue.value = ''
    documentationInsurabilityStatusJustification.value = ''
  }
}

function onDocumentationInsurabilityStatusUpdate(v: unknown): void {
  documentationInsurabilityStatusValue.value = typeof v === 'string' ? v : ''
  if (documentationInsurabilityStatusValue.value === '') {
    documentationInsurabilityStatusJustification.value = ''
  }
}

function onDocumentationCreditMortgageUpdate(v: unknown): void {
  documentationCreditMortgage.value = v === 'yes' || v === 'no' ? v : ''
}

async function openDocumentationDecisionDialog() {
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
  if (documentationDecision.value === 'approved') {
    if (documentationCreditMortgage.value !== 'yes' && documentationCreditMortgage.value !== 'no') {
      toast.error('Indique si la solicitud de crédito es hipotecario (elija Sí o No).')
      return
    }
  }
  try {
    await flushPendingDocumentationReviewUploadsBeforeDecision()
  } catch (e: any) {
    if (e?.message === 'document_too_large') {
      return
    }
    console.error(e)
    toast.error(e?.data?.message ?? 'No se pudieron sincronizar los documentos antes de registrar la decisión.')
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
  if (documentationConcept.value.trim().length < 5) {
    toast.error('Escribe un concepto de revisión de documentos de al menos 5 caracteres.')
    return
  }
  submittingDocumentationDecision.value = true
  try {
    await flushPendingDocumentationReviewUploadsBeforeDecision()
    await $csrf()
    const documentsPayload = (application.value?.documents ?? []).map((doc: any) => ({
      id: Number(doc.id),
      is_reviewed: Boolean(doc.is_reviewed),
      review_comment: String(doc.review_comment ?? '').trim(),
    }))
    const body: Record<string, unknown> = {
      decision: documentationDecision.value,
      concept: documentationConcept.value.trim(),
      insurability_required: documentationInsurabilityChoice.value === 'yes',
      documents: documentsPayload,
    }
    if (documentationDecision.value === 'approved') {
      body.credit_mortgage_options = [documentationCreditMortgage.value]
    }
    await $api(`/credit-applications/${application.value.id}/documentation-decision`, {
      method: 'PATCH',
      body,
    })
    documentationDecisionDialogOpen.value = false
    toast.success('Decisión de revisión de documentos registrada correctamente.')
    await navigateTo('/radicacion')
  } catch (e: any) {
    if (e?.message === 'document_too_large') {
      return
    }
    console.error('Error registrando decisión de revisión de documentos:', e)
    toast.error(e?.data?.message ?? 'No se pudo registrar la decisión de revisión de documentos.')
  } finally {
    submittingDocumentationDecision.value = false
  }
}

async function patchInsurabilityStatusFromSection(): Promise<void> {
  const app = application.value
  if (!app?.id || !canEditInsurabilityStatusInAsegurabilidadSection.value) {
    return
  }
  if (documentationInsurabilityStatusOptions.value.length < 1) {
    toast.error('Configure el catálogo «Estado asegurabilidad» en Parametrización → Radicación.')
    return
  }
  if (documentationInsurabilityStatusValue.value === '') {
    toast.error('Seleccione el estado de asegurabilidad.')
    return
  }
  if (documentationInsurabilityStatusJustification.value.trim().length < 10) {
    toast.error('Escriba la justificación del estado de asegurabilidad (mínimo 10 caracteres).')
    return
  }
  submittingInsurabilityStatusPatch.value = true
  try {
    await $csrf()
    const res = await $api<{ data: Record<string, unknown> }>(`/credit-applications/${app.id}/insurability-status`, {
      method: 'PATCH',
      body: {
        insurability_status_value: documentationInsurabilityStatusValue.value,
        insurability_status_justification: documentationInsurabilityStatusJustification.value.trim(),
      },
    })
    const data = res.data
    const prevDocs = application.value?.documents ?? []
    application.value = {
      ...application.value,
      ...data,
      documents: Array.isArray(data.documents) ? data.documents : prevDocs,
    }
    const nextStatus = data.insurability_status_value
    documentationInsurabilityStatusValue.value = typeof nextStatus === 'string' && nextStatus !== ''
      ? nextStatus
      : documentationInsurabilityStatusValue.value
    const nextJust = data.insurability_status_justification
    documentationInsurabilityStatusJustification.value = typeof nextJust === 'string' ? nextJust : documentationInsurabilityStatusJustification.value
    toast.success('Estado de asegurabilidad actualizado.')
  } catch (e: any) {
    console.error('Error actualizando estado de asegurabilidad:', e)
    toast.error(e?.data?.message ?? 'No se pudo actualizar el estado de asegurabilidad.')
  } finally {
    submittingInsurabilityStatusPatch.value = false
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
  lastDebtorDocumentationFinancialPatchSignature.value = stableStringifyDocumentationFinancialPatch(
    buildDocumentationFinancialPatch(form.value.debtor.financial_info),
  )
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
    if (isCreditApplicationReturnedToAdviser(String(application.value?.status ?? ''))) {
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
    cancelPendingDebtorDocumentationFinancialPush()
    cancelPendingCodeudorDocumentationFinancialPush()
    skipDocumentationFinancialPatch.value = true
    syncFormFromApplication()
    documentationInsurabilityChoice.value = application.value?.documentation_insurability_required === true ? 'yes' : 'no'
    documentationInsurabilityStatusValue.value = typeof application.value?.insurability_status_value === 'string'
      && application.value.insurability_status_value !== ''
      ? application.value.insurability_status_value
      : ''
    documentationInsurabilityStatusJustification.value = typeof application.value?.insurability_status_justification === 'string'
      ? application.value.insurability_status_justification
      : ''
    const mo = application.value?.credit_mortgage_options
    const firstMortgage = Array.isArray(mo)
      ? mo.find((x: unknown): x is 'yes' | 'no' => x === 'yes' || x === 'no')
      : undefined
    documentationCreditMortgage.value = firstMortgage ?? ''
    syncAnalystFieldsFromApplication()
    syncCreditDirectorPrivilegedFromApplication()
    await nextTick()
    skipDocumentationFinancialPatch.value = false
    const appStatus = String(application.value?.status ?? '')
    if (application.value?.documentation_insurability_required === true || appStatus === 'Documentation_Review') {
      await loadInsurabilityStatusCatalog()
    }
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

function stableStringifyDocumentationFinancialPatch(p: {
  activity_type?: string
  auxiliaryDocuments?: Record<string, number | null>
  insurabilityDocuments?: Record<string, number | null>
  fngDocuments?: Record<string, number | null>
  approverEntityDocuments?: Record<string, number | null>
}): string {
  const normalize = (v: unknown): unknown => {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(o).sort()) {
        out[k] = normalize(o[k])
      }
      return out
    }
    return v
  }
  return JSON.stringify(normalize(p))
}

function buildDocumentationFinancialPatch(fi: unknown): {
  activity_type?: string
  auxiliaryDocuments?: Record<string, number | null>
  insurabilityDocuments?: Record<string, number | null>
  fngDocuments?: Record<string, number | null>
  approverEntityDocuments?: Record<string, number | null>
} {
  if (!fi || typeof fi !== 'object') {
    return {}
  }
  const o = fi as Record<string, unknown>
  const patch: {
    activity_type?: string
    auxiliaryDocuments?: Record<string, number | null>
    insurabilityDocuments?: Record<string, number | null>
    fngDocuments?: Record<string, number | null>
    approverEntityDocuments?: Record<string, number | null>
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
  if (
    'insurabilityDocuments' in o
    && o.insurabilityDocuments
    && typeof o.insurabilityDocuments === 'object'
    && !Array.isArray(o.insurabilityDocuments)
  ) {
    const raw = o.insurabilityDocuments as Record<string, unknown>
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
    patch.insurabilityDocuments = clean
  }
  if (
    'fngDocuments' in o
    && o.fngDocuments
    && typeof o.fngDocuments === 'object'
    && !Array.isArray(o.fngDocuments)
  ) {
    const raw = o.fngDocuments as Record<string, unknown>
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
    patch.fngDocuments = clean
  }
  if (
    'approverEntityDocuments' in o
    && o.approverEntityDocuments
    && typeof o.approverEntityDocuments === 'object'
    && !Array.isArray(o.approverEntityDocuments)
  ) {
    const raw = o.approverEntityDocuments as Record<string, unknown>
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
    patch.approverEntityDocuments = clean
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

const MAX_AUXILIARY_DOCUMENT_BYTES = 10 * 1024 * 1024

function pendingAuxiliaryFileKeys(files: Record<string, File | undefined> | undefined): string {
  if (!files || typeof files !== 'object') {
    return ''
  }
  return Object.entries(files)
    .filter(([, f]) => f instanceof File)
    .map(([k]) => k)
    .sort()
    .join(',')
}

function pendingInsurabilityFileKeys(files: Record<string, File | undefined> | undefined): string {
  if (!files || typeof files !== 'object') {
    return ''
  }
  return Object.entries(files)
    .filter(([, f]) => f instanceof File)
    .map(([k]) => k)
    .sort()
    .join(',')
}

function pendingFngFileKeys(files: Record<string, File | undefined> | undefined): string {
  return pendingInsurabilityFileKeys(files)
}

function pendingApproverEntityFileKeys(files: Record<string, File | undefined> | undefined): string {
  return pendingInsurabilityFileKeys(files)
}

function mergeUploadedDocumentIntoApplication(doc: unknown): void {
  const app = application.value
  if (!app || doc == null || typeof doc !== 'object') {
    return
  }
  const row = doc as Record<string, unknown>
  const docId = Number(row.id)
  if (!Number.isFinite(docId) || docId < 1) {
    return
  }
  const list = Array.isArray(app.documents) ? app.documents : []
  if (list.some((d: { id?: unknown }) => Number(d?.id) === docId)) {
    return
  }
  app.documents = [...list, doc]
}

function removeInsurabilityDocumentFromApplicationState(documentId: number): void {
  const app = application.value
  if (!app || !Array.isArray(app.documents)) {
    return
  }
  app.documents = app.documents.filter((d: { id?: unknown }) => Number(d?.id) !== documentId)
}

async function flushDebtorAuxiliaryDocumentUploads(): Promise<void> {
  const applicationId = application.value?.id
  if (!documentationUploadMode.value || typeof applicationId !== 'number' || applicationId < 1) {
    return
  }
  const auxFiles = form.value.debtor.auxiliaryDocumentFiles
  if (!auxFiles) {
    return
  }
  const pending = Object.entries(auxFiles).filter(([, f]) => f instanceof File) as [string, File][]
  if (pending.length === 0) {
    return
  }
  for (const [, f] of pending) {
    if (f.size > MAX_AUXILIARY_DOCUMENT_BYTES) {
      toast.error(`"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
      throw new Error('document_too_large')
    }
  }
  const fiRaw = form.value.debtor.financial_info
  const activityType = fiRaw && typeof fiRaw === 'object'
    ? String((fiRaw as { activity_type?: string }).activity_type ?? '').trim()
    : ''
  let labelByKey: Record<string, string> = {}
  if (activityType) {
    try {
      const cfg = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
      const iba = extractItemsByActivityFromCatalogResponse(cfg)
      const rows = resolveAuxiliaryChecklistRows(iba, activityType)
      labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
    } catch {
      labelByKey = {}
    }
  }
  const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
  const docMap = { ...(typeof fi.auxiliaryDocuments === 'object' && fi.auxiliaryDocuments && !Array.isArray(fi.auxiliaryDocuments)
    ? (fi.auxiliaryDocuments as Record<string, number | null>)
    : {}) }

  await $csrf()
  for (const [key, file] of pending) {
    const prevId = docMap[key]
    if (typeof prevId === 'number' && prevId > 0) {
      try {
        await $api(`/credit-applications/${applicationId}/documents/${prevId}`, { method: 'DELETE' })
      } catch (e) {
        console.error(e)
      }
    }
    const label = labelByKey[key] ?? key
    const fd = new FormData()
    fd.append('title', titleForAuxiliaryDocumentUpload(label))
    fd.append('file', file)
    const res = await $api<{ data: unknown }>(
      `/credit-applications/${applicationId}/documents?auxiliary_checklist=1`,
      { method: 'POST', body: fd },
    )
    const created = res.data
    mergeUploadedDocumentIntoApplication(created)
    const newId = typeof created === 'object' && created !== null && 'id' in (created as object)
      ? Number((created as { id: unknown }).id)
      : NaN
    if (Number.isFinite(newId) && newId > 0) {
      docMap[key] = newId
    }
  }
  const nextFi = { ...fi, auxiliaryDocuments: docMap }
  form.value.debtor.financial_info = nextFi as typeof form.value.debtor.financial_info
  form.value.debtor.auxiliaryDocumentFiles = {}
  patchApplicationDebtorFinancialCache(nextFi)
}

async function flushDebtorInsurabilityDocumentUploads(): Promise<void> {
  const applicationId = application.value?.id
  if (!insurabilityDocumentUploadMode.value || typeof applicationId !== 'number' || applicationId < 1) {
    return
  }
  if (!hasPermission('radicacion_insurability_documentos_subir') && !hasPermission('radicacion_documentos_subir')) {
    return
  }
  const insFiles = form.value.debtor.insurabilityDocumentFiles
  if (!insFiles) {
    return
  }
  const pending = Object.entries(insFiles).filter(([, f]) => f instanceof File) as [string, File][]
  if (pending.length === 0) {
    return
  }
  for (const [, f] of pending) {
    if (f.size > MAX_AUXILIARY_DOCUMENT_BYTES) {
      toast.error(`"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
      throw new Error('document_too_large')
    }
  }
  let labelByKey: Record<string, string> = {}
  try {
    const cfg = await $api<unknown>('/catalogs/template-flat-data/documentation-insurability-documents')
    const rows = extractInsurabilityItemsFromCatalogResponse(cfg)
    labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
  } catch {
    labelByKey = {}
  }
  const fiRaw = form.value.debtor.financial_info
  const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
  const docMap = { ...(typeof fi.insurabilityDocuments === 'object' && fi.insurabilityDocuments && !Array.isArray(fi.insurabilityDocuments)
    ? (fi.insurabilityDocuments as Record<string, number | null>)
    : {}) }

  await $csrf()
  for (const [key, file] of pending) {
    const prevId = docMap[key]
    if (typeof prevId === 'number' && prevId > 0) {
      try {
        await $api(`/credit-applications/${applicationId}/documents/${prevId}`, { method: 'DELETE' })
      } catch (e) {
        console.error(e)
      }
    }
    const label = labelByKey[key] ?? key
    const fd = new FormData()
    fd.append('title', titleForInsurabilityDocumentUpload(label))
    fd.append('file', file)
    const res = await $api<{ data: unknown }>(
      `/credit-applications/${applicationId}/documents?insurability_checklist=1`,
      { method: 'POST', body: fd },
    )
    const created = res.data
    mergeUploadedDocumentIntoApplication(created)
    const newId = typeof created === 'object' && created !== null && 'id' in (created as object)
      ? Number((created as { id: unknown }).id)
      : NaN
    if (Number.isFinite(newId) && newId > 0) {
      docMap[key] = newId
    }
  }
  const nextFi = { ...fi, insurabilityDocuments: docMap }
  form.value.debtor.financial_info = nextFi as typeof form.value.debtor.financial_info
  form.value.debtor.insurabilityDocumentFiles = {}
  patchApplicationDebtorFinancialCache(nextFi)
}

async function flushDebtorFngDocumentUploads(): Promise<void> {
  const applicationId = application.value?.id
  if (!documentationUploadMode.value || typeof applicationId !== 'number' || applicationId < 1) {
    return
  }
  if (!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')) {
    return
  }
  const fngFiles = form.value.debtor.fngDocumentFiles
  if (!fngFiles) {
    return
  }
  const pending = Object.entries(fngFiles).filter(([, f]) => f instanceof File) as [string, File][]
  if (pending.length === 0) {
    return
  }
  for (const [, f] of pending) {
    if (f.size > MAX_AUXILIARY_DOCUMENT_BYTES) {
      toast.error(`"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
      throw new Error('document_too_large')
    }
  }
  let labelByKey: Record<string, string> = {}
  try {
    const cfg = await $api<unknown>('/catalogs/template-flat-data/documentation-fng-documents')
    const rows = extractFngItemsFromCatalogResponse(cfg)
    labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
  } catch {
    labelByKey = {}
  }
  const fiRaw = form.value.debtor.financial_info
  const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
  const docMap = { ...(typeof fi.fngDocuments === 'object' && fi.fngDocuments && !Array.isArray(fi.fngDocuments)
    ? (fi.fngDocuments as Record<string, number | null>)
    : {}) }

  await $csrf()
  for (const [key, file] of pending) {
    const prevId = docMap[key]
    if (typeof prevId === 'number' && prevId > 0) {
      try {
        await $api(`/credit-applications/${applicationId}/documents/${prevId}`, { method: 'DELETE' })
      } catch (e) {
        console.error(e)
      }
    }
    const label = labelByKey[key] ?? key
    const fd = new FormData()
    fd.append('title', titleForFngDocumentUpload(label))
    fd.append('file', file)
    const res = await $api<{ data: unknown }>(
      `/credit-applications/${applicationId}/documents?fng_checklist=1`,
      { method: 'POST', body: fd },
    )
    const created = res.data
    mergeUploadedDocumentIntoApplication(created)
    const newId = typeof created === 'object' && created !== null && 'id' in (created as object)
      ? Number((created as { id: unknown }).id)
      : NaN
    if (Number.isFinite(newId) && newId > 0) {
      docMap[key] = newId
    }
  }
  const nextFi = { ...fi, fngDocuments: docMap }
  form.value.debtor.financial_info = nextFi as typeof form.value.debtor.financial_info
  form.value.debtor.fngDocumentFiles = {}
  patchApplicationDebtorFinancialCache(nextFi)
}

async function flushDebtorApproverEntityDocumentUploads(): Promise<void> {
  const applicationId = application.value?.id
  if (!approverEntityDocumentUploadMode.value || typeof applicationId !== 'number' || applicationId < 1) {
    return
  }
  if (!hasPermission('radicacion_approver_entity_documentos_subir') && !hasPermission('radicacion_documentos_subir')) {
    return
  }
  const appFiles = form.value.debtor.approverEntityDocumentFiles
  if (!appFiles) {
    return
  }
  const pending = Object.entries(appFiles).filter(([, f]) => f instanceof File) as [string, File][]
  if (pending.length === 0) {
    return
  }
  for (const [, f] of pending) {
    if (f.size > MAX_AUXILIARY_DOCUMENT_BYTES) {
      toast.error(`"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
      throw new Error('document_too_large')
    }
  }
  let labelByKey: Record<string, string> = {}
  try {
    const cfg = await $api<unknown>('/catalogs/template-flat-data/credit-director-approver-documents')
    const rows = extractApproverEntityItemsFromCatalogResponse(cfg)
    labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
  } catch {
    labelByKey = {}
  }
  const fiRaw = form.value.debtor.financial_info
  const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
  const docMap = { ...(typeof fi.approverEntityDocuments === 'object' && fi.approverEntityDocuments && !Array.isArray(fi.approverEntityDocuments)
    ? (fi.approverEntityDocuments as Record<string, number | null>)
    : {}) }

  await $csrf()
  for (const [key, file] of pending) {
    const prevId = docMap[key]
    if (typeof prevId === 'number' && prevId > 0) {
      try {
        await $api(`/credit-applications/${applicationId}/documents/${prevId}`, { method: 'DELETE' })
      } catch (e) {
        console.error(e)
      }
    }
    const label = labelByKey[key] ?? key
    const fd = new FormData()
    fd.append('title', titleForApproverEntityDocumentUpload(label))
    fd.append('file', file)
    const res = await $api<{ data: unknown }>(
      `/credit-applications/${applicationId}/documents?approver_entity_checklist=1`,
      { method: 'POST', body: fd },
    )
    const created = res.data
    mergeUploadedDocumentIntoApplication(created)
    const newId = typeof created === 'object' && created !== null && 'id' in (created as object)
      ? Number((created as { id: unknown }).id)
      : NaN
    if (Number.isFinite(newId) && newId > 0) {
      docMap[key] = newId
    }
  }
  const nextFi = { ...fi, approverEntityDocuments: docMap }
  form.value.debtor.financial_info = nextFi as typeof form.value.debtor.financial_info
  form.value.debtor.approverEntityDocumentFiles = {}
  patchApplicationDebtorFinancialCache(nextFi)
}

async function flushCodeudorAuxiliaryDocumentUploads(applicantId: number): Promise<void> {
  const applicationId = application.value?.id
  if (!documentationUploadMode.value || typeof applicationId !== 'number' || applicationId < 1) {
    return
  }
  const co = form.value.co_debtors.find(c => Number(c.id) === applicantId)
  if (!co) {
    return
  }
  const auxFiles = co.auxiliaryDocumentFiles
  if (!auxFiles) {
    return
  }
  const pending = Object.entries(auxFiles).filter(([, f]) => f instanceof File) as [string, File][]
  if (pending.length === 0) {
    return
  }
  for (const [, f] of pending) {
    if (f.size > MAX_AUXILIARY_DOCUMENT_BYTES) {
      toast.error(`"${f.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
      throw new Error('document_too_large')
    }
  }
  const fiRaw = co.financial_info
  const activityType = fiRaw && typeof fiRaw === 'object'
    ? String((fiRaw as { activity_type?: string }).activity_type ?? '').trim()
    : ''
  let labelByKey: Record<string, string> = {}
  if (activityType) {
    try {
      const cfg = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
      const iba = extractItemsByActivityFromCatalogResponse(cfg)
      const rows = resolveAuxiliaryChecklistRows(iba, activityType)
      labelByKey = Object.fromEntries(rows.map(r => [r.key, r.label]))
    } catch {
      labelByKey = {}
    }
  }
  const fi = { ...(typeof fiRaw === 'object' && fiRaw ? fiRaw : {}) } as Record<string, unknown>
  const docMap = { ...(typeof fi.auxiliaryDocuments === 'object' && fi.auxiliaryDocuments && !Array.isArray(fi.auxiliaryDocuments)
    ? (fi.auxiliaryDocuments as Record<string, number | null>)
    : {}) }

  await $csrf()
  for (const [key, file] of pending) {
    const prevId = docMap[key]
    if (typeof prevId === 'number' && prevId > 0) {
      try {
        await $api(`/credit-applications/${applicationId}/documents/${prevId}`, { method: 'DELETE' })
      } catch (e) {
        console.error(e)
      }
    }
    const label = labelByKey[key] ?? key
    const fd = new FormData()
    fd.append('title', titleForAuxiliaryDocumentUpload(label))
    fd.append('file', file)
    fd.append('applicant_id', String(applicantId))
    const res = await $api<{ data: unknown }>(
      `/credit-applications/${applicationId}/documents?auxiliary_checklist=1`,
      { method: 'POST', body: fd },
    )
    const created = res.data
    mergeUploadedDocumentIntoApplication(created)
    const newId = typeof created === 'object' && created !== null && 'id' in (created as object)
      ? Number((created as { id: unknown }).id)
      : NaN
    if (Number.isFinite(newId) && newId > 0) {
      docMap[key] = newId
    }
  }
  const nextFi = { ...fi, auxiliaryDocuments: docMap }
  co.financial_info = nextFi as typeof co.financial_info
  co.auxiliaryDocumentFiles = {}
  patchApplicationCodeudorFinancialCache(applicantId, nextFi)
}

async function patchDebtorDocumentationFinancialToServer(): Promise<void> {
  if (skipDocumentationFinancialPatch.value || !application.value?.id) {
    return
  }
  const rawPatch = buildDocumentationFinancialPatch(form.value.debtor.financial_info)
  const rawSig = stableStringifyDocumentationFinancialPatch(rawPatch)
  if (rawSig === lastDebtorDocumentationFinancialPatchSignature.value) {
    return
  }
  const patch: {
    activity_type?: string
    auxiliaryDocuments?: Record<string, number | null>
    insurabilityDocuments?: Record<string, number | null>
    fngDocuments?: Record<string, number | null>
    approverEntityDocuments?: Record<string, number | null>
  } = {}
  if (hasPermission('radicacion_documentos_subir')) {
    if (rawPatch.activity_type !== undefined) {
      patch.activity_type = rawPatch.activity_type
    }
    if (rawPatch.auxiliaryDocuments !== undefined) {
      patch.auxiliaryDocuments = rawPatch.auxiliaryDocuments
    }
  }
  if (hasPermission('radicacion_insurability_documentos_subir') || hasPermission('radicacion_documentos_subir')
    || hasPermission('radicacion_insurability_documentos_eliminar') || hasPermission('radicacion_documentos_eliminar')) {
    if (rawPatch.insurabilityDocuments !== undefined) {
      patch.insurabilityDocuments = rawPatch.insurabilityDocuments
    }
  }
  if (hasPermission('radicacion_fng_documentos_subir') || hasPermission('radicacion_documentos_subir')
    || hasPermission('radicacion_fng_documentos_eliminar') || hasPermission('radicacion_documentos_eliminar')) {
    if (rawPatch.fngDocuments !== undefined) {
      patch.fngDocuments = rawPatch.fngDocuments
    }
  }
  if (hasPermission('radicacion_approver_entity_documentos_subir') || hasPermission('radicacion_documentos_subir')
    || hasPermission('radicacion_approver_entity_documentos_eliminar') || hasPermission('radicacion_documentos_eliminar')) {
    if (rawPatch.approverEntityDocuments !== undefined) {
      patch.approverEntityDocuments = rawPatch.approverEntityDocuments
    }
  }
  if (Object.keys(patch).length === 0) {
    return
  }

  const status = String(application.value?.status ?? '')
  const docReviewFinancial =
    documentationUploadMode.value && status === 'Documentation_Review'

  type FiPatch = typeof patch
  let financialInfoForRequest: FiPatch = patch

  if (!docReviewFinancial) {
    const hasActOrAux = patch.activity_type !== undefined || patch.auxiliaryDocuments !== undefined
    const hasIns = patch.insurabilityDocuments !== undefined
    const hasApp = patch.approverEntityDocuments !== undefined
    const hasFng = patch.fngDocuments !== undefined

    if (hasActOrAux) {
      return
    }

    const insAllowed = insurabilityDocumentUploadMode.value
    const appAllowed = approverEntityDocumentUploadMode.value && status === 'Credit_Director_Review'
    const fngAllowed = documentationUploadMode.value && status === 'Documentation_Review'

    if (!hasIns && !hasApp && !hasFng) {
      return
    }
    if (hasIns && !insAllowed) {
      return
    }
    if (hasApp && !appAllowed) {
      return
    }
    if (hasFng && !fngAllowed) {
      return
    }

    const merged: FiPatch = {}
    if (hasIns) {
      merged.insurabilityDocuments = patch.insurabilityDocuments
    }
    if (hasApp) {
      merged.approverEntityDocuments = patch.approverEntityDocuments
    }
    if (hasFng) {
      merged.fngDocuments = patch.fngDocuments
    }
    financialInfoForRequest = merged
  }

  await $csrf()
  await $api(`/credit-applications/${application.value.id}/documentation-applicant-financial`, {
    method: 'PATCH',
    body: { role: 'DEUDOR', financial_info: financialInfoForRequest },
  })
  lastDebtorDocumentationFinancialPatchSignature.value = stableStringifyDocumentationFinancialPatch(
    buildDocumentationFinancialPatch(form.value.debtor.financial_info),
  )
  const fi = form.value.debtor.financial_info
  if (fi && typeof fi === 'object') {
    patchApplicationDebtorFinancialCache(fi as Record<string, unknown>)
  }
}

/**
 * Sube adjuntos pendientes del deudor (auxiliar, asegurabilidad, FNG) y persiste `financial_info`
 * antes de registrar la decisión de revisión documental. Evita 422 en el servidor (p. ej. FNG obligatorio)
 * si el usuario envía antes de que el watch asíncrono termine de sincronizar.
 */
async function flushPendingDocumentationReviewUploadsBeforeDecision(): Promise<void> {
  await flushDebtorAuxiliaryDocumentUploads()
  await flushDebtorInsurabilityDocumentUploads()
  await flushDebtorFngDocumentUploads()
  await patchDebtorDocumentationFinancialToServer()
}

async function patchCodeudorDocumentationFinancialToServer(applicantId: number): Promise<void> {
  if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value || !application.value?.id) {
    return
  }
  const co = form.value.co_debtors.find(c => Number(c.id) === applicantId)
  if (!co) {
    return
  }
  const patch = buildDocumentationFinancialPatch(co.financial_info)
  if (Object.keys(patch).length === 0) {
    return
  }
  await $csrf()
  await $api(`/credit-applications/${application.value.id}/documentation-applicant-financial`, {
    method: 'PATCH',
    body: { role: 'CODEUDOR', applicant_id: applicantId, financial_info: patch },
  })
  const fi = co.financial_info
  if (fi && typeof fi === 'object') {
    patchApplicationCodeudorFinancialCache(applicantId, fi as Record<string, unknown>)
  }
}

let debtorDocumentationFinancialDebounceTimer: ReturnType<typeof setTimeout> | null = null

function cancelPendingDebtorDocumentationFinancialPush(): void {
  if (debtorDocumentationFinancialDebounceTimer != null) {
    clearTimeout(debtorDocumentationFinancialDebounceTimer)
    debtorDocumentationFinancialDebounceTimer = null
  }
}

function schedulePushDebtorDocumentationFinancial(): void {
  if (skipDocumentationFinancialPatch.value) {
    return
  }
  if (debtorDocumentationFinancialDebounceTimer != null) {
    clearTimeout(debtorDocumentationFinancialDebounceTimer)
  }
  debtorDocumentationFinancialDebounceTimer = setTimeout(() => {
    debtorDocumentationFinancialDebounceTimer = null
    void (async () => {
      try {
        await patchDebtorDocumentationFinancialToServer()
      } catch (e: any) {
        console.error(e)
        toast.error(e?.data?.message ?? 'No se pudo guardar el tipo de actividad o documentos auxiliares del deudor')
      }
    })()
  }, 500)
}


let codeudorDocumentationFinancialDebounceTimer: ReturnType<typeof setTimeout> | null = null
let codeudorDocumentationFinancialDebounceApplicantId: number | null = null

function cancelPendingCodeudorDocumentationFinancialPush(): void {
  if (codeudorDocumentationFinancialDebounceTimer != null) {
    clearTimeout(codeudorDocumentationFinancialDebounceTimer)
    codeudorDocumentationFinancialDebounceTimer = null
  }
  codeudorDocumentationFinancialDebounceApplicantId = null
}

function schedulePushCodeudorDocumentationFinancial(applicantId: number): void {
  if (skipDocumentationFinancialPatch.value) {
    return
  }
  if (codeudorDocumentationFinancialDebounceTimer != null) {
    clearTimeout(codeudorDocumentationFinancialDebounceTimer)
  }
  codeudorDocumentationFinancialDebounceApplicantId = applicantId
  codeudorDocumentationFinancialDebounceTimer = setTimeout(() => {
    codeudorDocumentationFinancialDebounceTimer = null
    const id = codeudorDocumentationFinancialDebounceApplicantId
    codeudorDocumentationFinancialDebounceApplicantId = null
    if (id == null) {
      return
    }
    void (async () => {
      try {
        await patchCodeudorDocumentationFinancialToServer(id)
      } catch (e: any) {
        console.error(e)
        toast.error(e?.data?.message ?? 'No se pudo guardar el tipo de actividad o documentos auxiliares del codeudor')
      }
    })()
  }, 500)
}

watch(
  () => form.value.debtor.financial_info,
  () => {
    schedulePushDebtorDocumentationFinancial()
  },
  { deep: true },
)

watch(
  () => pendingAuxiliaryFileKeys(form.value.debtor.auxiliaryDocumentFiles),
  async (pend, prevPend) => {
    if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value) {
      return
    }
    if (!pend || pend === prevPend) {
      return
    }
    try {
      await flushDebtorAuxiliaryDocumentUploads()
      await patchDebtorDocumentationFinancialToServer()
    } catch (e: any) {
      if (e?.message === 'document_too_large') {
        return
      }
      console.error(e)
      toast.error(e?.data?.message ?? 'No se pudo subir o guardar los documentos auxiliares del deudor')
    }
  },
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
    schedulePushCodeudorDocumentationFinancial(state.id)
  },
  { deep: true },
)

watch(
  () => form.value.co_debtors.map((c) => ({ id: c.id, pend: pendingAuxiliaryFileKeys(c.auxiliaryDocumentFiles) })),
  async (curr, prev) => {
    if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value) {
      return
    }
    for (const r of curr) {
      if (typeof r.id !== 'number' || !r.pend) {
        continue
      }
      const prevPend = prev?.find(p => p.id === r.id)?.pend
      if (r.pend === prevPend) {
        continue
      }
      try {
        await flushCodeudorAuxiliaryDocumentUploads(r.id)
        await patchCodeudorDocumentationFinancialToServer(r.id)
      } catch (e: any) {
        if (e?.message === 'document_too_large') {
          return
        }
        console.error(e)
        toast.error(e?.data?.message ?? 'No se pudo subir o guardar los documentos auxiliares del codeudor')
      }
    }
  },
)

watch(
  () => pendingInsurabilityFileKeys(form.value.debtor.insurabilityDocumentFiles),
  async (pend, prevPend) => {
    if (skipDocumentationFinancialPatch.value || !insurabilityDocumentUploadMode.value) {
      return
    }
    if (!pend || pend === prevPend) {
      return
    }
    try {
      await flushDebtorInsurabilityDocumentUploads()
      await patchDebtorDocumentationFinancialToServer()
    } catch (e: any) {
      if (e?.message === 'document_too_large') {
        return
      }
      console.error(e)
      toast.error(e?.data?.message ?? 'No se pudo subir o guardar los documentos de asegurabilidad del deudor')
    }
  },
)

watch(
  () => pendingFngFileKeys(form.value.debtor.fngDocumentFiles),
  async (pend, prevPend) => {
    if (skipDocumentationFinancialPatch.value || !documentationUploadMode.value) {
      return
    }
    if (!pend || pend === prevPend) {
      return
    }
    try {
      await flushDebtorFngDocumentUploads()
      await patchDebtorDocumentationFinancialToServer()
    } catch (e: any) {
      if (e?.message === 'document_too_large') {
        return
      }
      console.error(e)
      toast.error(e?.data?.message ?? 'No se pudo subir o guardar los documentos FNG del deudor')
    }
  },
)

watch(
  () => pendingApproverEntityFileKeys(form.value.debtor.approverEntityDocumentFiles),
  async (pend, prevPend) => {
    if (skipDocumentationFinancialPatch.value || !approverEntityDocumentUploadMode.value) {
      return
    }
    if (!pend || pend === prevPend) {
      return
    }
    try {
      await flushDebtorApproverEntityDocumentUploads()
      await patchDebtorDocumentationFinancialToServer()
    } catch (e: any) {
      if (e?.message === 'document_too_large') {
        return
      }
      console.error(e)
      toast.error(e?.data?.message ?? 'No se pudo subir o guardar los documentos del ente aprobador')
    }
  },
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
            Revisión de documentación: puede ajustar el tipo de actividad económica, el checklist auxiliar (deudor y codeudores), documentos de asegurabilidad y FNG cuando la solicitud tiene garantía FNG, e indicar si el crédito es hipotecario antes de registrar el concepto.
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
            v-if="isCreditApplicationAdviserEditableStatus(application?.status) && application?.id"
            variant="warning"
            as-child
          >
            <NuxtLink :to="`/radicacion/editar/${application.id}`">
              <Icon name="i-lucide-pencil" class="mr-2 h-4 w-4" />
              {{ application?.status === 'Draft' ? 'Editar' : 'Corregir radicación' }}
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

    <Alert
      v-if="showReturnedCorrectionHint && application?.id"
      class="border-amber-600/35 bg-amber-500/[0.08] dark:border-amber-500/35 dark:bg-amber-950/40 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300"
    >
      <Icon name="i-lucide-info" class="h-4 w-4" />
      <AlertTitle>Solicitud devuelta para corrección</AlertTitle>
      <AlertDescription class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p class="text-sm leading-relaxed">
          <template v-if="returnedFromDocumentationReview">
            Esta solicitud volvió desde <span class="font-medium">revisión de documentación</span>. El reenvío no se hace en esta pantalla: abra la edición, cargue o ajuste los documentos y use el botón
            <span class="font-medium">«Enviar a revisión de documentación»</span> al pie del formulario (guarda los cambios y devuelve la solicitud al revisor).
          </template>
          <template v-else>
            Revise la trazabilidad, abra <span class="font-medium">Corregir radicación</span> y vuelva a enviar según el flujo que corresponda.
          </template>
        </p>
        <Button v-if="application?.id" as-child class="w-full shrink-0 sm:w-auto">
          <NuxtLink :to="`/radicacion/editar/${application.id}`">
            Ir a corregir y reenviar
          </NuxtLink>
        </Button>
      </AlertDescription>
    </Alert>

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

      <Card v-if="showInsurabilityDocumentsAsStandaloneCard">
        <Collapsible v-model:open="insurabilityStandaloneCollapsibleOpen">
          <CardHeader class="pb-2">
            <CollapsibleTrigger as-child>
              <button
                type="button"
                class="flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring -m-2 p-2"
              >
                <div class="min-w-0 flex-1 space-y-1.5">
                  <CardTitle class="text-left">
                    Documentos de asegurabilidad
                  </CardTitle>
                  <CardDescription class="text-left">
                    Lista en Parametrización → Radicación → Asegurabilidad. Puede subirlos en cualquier etapa mientras la solicitud no esté en desembolso, rechazada o cancelada. Al enviar a director de crédito desde Análisis y SCORE, deben constar cargados los ítems obligatorios del checklist si la solicitud requiere asegurabilidad.
                    <span v-if="canCreditDirectorDecide" class="mt-2 block font-medium text-foreground">
                      Si está en revisión del director de crédito, el estado catalogado y la justificación se guardan al pulsar «Registrar decisión final» (junto con la decisión), o con «Guardar estado y justificación» en el bloque de estado cuando tenga el permiso correspondiente.
                    </span>
                  </CardDescription>
                </div>
                <Icon
                  name="i-lucide-chevron-down"
                  class="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200"
                  :class="insurabilityStandaloneCollapsibleOpen ? 'rotate-180' : ''"
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent class="space-y-4 pt-0">
              <div
                v-if="showInsurabilityStatusInAsegurabilidadCard"
                class="rounded-md border bg-muted/30 p-4 space-y-3"
              >
                <p class="text-sm text-muted-foreground leading-relaxed">
                  La <span class="font-medium text-foreground">revisión de documentación</span> indicó
                  <span class="font-medium text-foreground">sí requiere asegurabilidad</span>
                  (después del visto bueno del director de agencia). El <span class="font-medium text-foreground">director de crédito</span> (o quien tenga permiso de actualizar estado) registra aquí el estado catalogado y su justificación.
                </p>
                <template v-if="canEditInsurabilityStatusInAsegurabilidadSection">
                  <div class="space-y-3">
                    <div class="space-y-1.5">
                      <Label for="insurability_section_status">Estado asegurabilidad *</Label>
                      <Multiselect
                        id="insurability_section_status"
                        :model-value="documentationInsurabilityStatusValue === '' ? null : documentationInsurabilityStatusValue"
                        :options="documentationInsurabilityStatusOptions"
                        value-prop="value"
                        label="label"
                        mode="single"
                        :can-clear="false"
                        :searchable="false"
                        placeholder="Seleccionar estado"
                        class="multiselect-director w-full max-w-md"
                        @update:model-value="onDocumentationInsurabilityStatusUpdate"
                      />
                    </div>
                    <div v-if="documentationInsurabilityStatusValue !== ''" class="space-y-1.5">
                      <Label for="insurability_section_justification">Justificación del estado *</Label>
                      <textarea
                        id="insurability_section_justification"
                        v-model="documentationInsurabilityStatusJustification"
                        rows="4"
                        class="flex min-h-[100px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Fundamente el estado elegido respecto de la operación."
                      />
                      <p class="text-xs text-muted-foreground">
                        Mínimo 10 caracteres para guardar el cambio.
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 justify-start">
                      <Button
                        type="button"
                        variant="secondary"
                        :disabled="submittingInsurabilityStatusPatch"
                        @click="patchInsurabilityStatusFromSection"
                      >
                        <Icon v-if="submittingInsurabilityStatusPatch" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                        Guardar estado y justificación
                      </Button>
                      <p class="text-xs text-muted-foreground max-w-xl">
                        También puede usar «Registrar decisión final» en la sección de abajo para persistir estado y justificación sin pulsar este botón.
                      </p>
                    </div>
                  </div>
                </template>
                <div v-else class="space-y-3">
                  <div class="space-y-1">
                    <p class="text-sm font-medium text-foreground">
                      Estado asegurabilidad
                    </p>
                    <p class="text-sm">
                      {{ insurabilityStatusLabelForCatalogValue(application?.insurability_status_value) || '—' }}
                    </p>
                  </div>
                  <div v-if="application?.insurability_status_justification" class="space-y-1">
                    <p class="text-sm font-medium text-foreground">
                      Justificación del estado
                    </p>
                    <p class="text-sm whitespace-pre-wrap rounded-md border bg-background/50 p-3">
                      {{ application.insurability_status_justification }}
                    </p>
                  </div>
                </div>
              </div>
              <InsurabilityDocumentsSection
                :applicant="form.debtor"
                :credit-application-id="application?.id ?? null"
                :application-documents="(application?.documents ?? [])"
                :disabled="!hasPermission('radicacion_insurability_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
                :auxiliary-pending-upload-hint="(documentationUploadMode || insurabilityDocumentUploadMode) ? 'immediate' : 'draftSave'"
                :interaction-mode="insurabilityDocumentationInteractionMode"
                @update:applicant="(v) => { form.debtor = v }"
                @document-removed="removeInsurabilityDocumentFromApplicationState"
              />
              <div
                v-if="showFngEmbeddedWithStandaloneInsurability"
                class="rounded-md border border-border/60 bg-muted/10 p-4 space-y-3"
              >
                <div>
                  <p class="text-sm font-medium text-foreground">
                    Documentos FNG (Fondo Nacional de Garantías)
                  </p>
                  <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
                    La solicitud tiene garantía FNG. Revise o complete cargues desde aquí; la subida de archivos nuevos queda habilitada en <span class="font-medium">revisión de documentación</span> (según permisos de FNG o documentos).
                  </p>
                </div>
                <FngDocumentsSection
                  :applicant="form.debtor"
                  :credit-application-id="application?.id ?? null"
                  :application-documents="(application?.documents ?? [])"
                  :disabled="!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
                  :auxiliary-pending-upload-hint="documentationUploadMode ? 'immediate' : 'draftSave'"
                  :interaction-mode="fngDocumentationInteractionMode"
                  @update:applicant="(v) => { form.debtor = v }"
                  @document-removed="removeInsurabilityDocumentFromApplicationState"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card v-if="showFngDocumentsAsStandaloneCard">
        <Collapsible v-model:open="fngStandaloneCollapsibleOpen">
          <CardHeader class="pb-2">
            <CollapsibleTrigger as-child>
              <button
                type="button"
                class="flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring -m-2 p-2"
              >
                <div class="min-w-0 flex-1 space-y-1.5">
                  <CardTitle class="text-left">
                    Documentos FNG
                  </CardTitle>
                  <CardDescription class="text-left">
                    Solo en <span class="font-medium">revisión de documentación</span> se pueden adjuntar ítems obligatorios si la solicitud tiene garantía FNG. Fuera de ese estado puede consultar lo ya cargado.
                  </CardDescription>
                </div>
                <Icon
                  name="i-lucide-chevron-down"
                  class="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200"
                  :class="fngStandaloneCollapsibleOpen ? 'rotate-180' : ''"
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent class="space-y-4 pt-0">
              <FngDocumentsSection
                :applicant="form.debtor"
                :credit-application-id="application?.id ?? null"
                :application-documents="(application?.documents ?? [])"
                :disabled="!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
                :auxiliary-pending-upload-hint="documentationUploadMode ? 'immediate' : 'draftSave'"
                :interaction-mode="fngDocumentationInteractionMode"
                @update:applicant="(v) => { form.debtor = v }"
                @document-removed="removeInsurabilityDocumentFromApplicationState"
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card v-if="canCreditDirectorDecide">
        <Collapsible v-model:open="creditDirectorSectionCollapsibleOpen">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 space-y-1.5">
                <CardTitle>Decisión final — director de crédito</CardTitle>
                <CardDescription>
                  Revise la radicación y el SCORE. Elija <strong>Aprobar para desembolso</strong>, <strong>Rechazar solicitud</strong>,
                  <strong>Modificación</strong> o <strong>Respuesta aseguradora</strong> según corresponda. Debe dejar un concepto claro y estructurado.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="creditDirectorSectionCollapsibleOpen = !creditDirectorSectionCollapsibleOpen"
              >
                <Icon :name="creditDirectorSectionCollapsibleOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="mr-2 h-4 w-4" />
                {{ creditDirectorSectionCollapsibleOpen ? 'Contraer' : 'Expandir' }}
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent class="space-y-4 pt-0">
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
                Por defecto «No». Si elige «Sí», debe indicar la justificación según la parametrización (lista de motivos o texto libre si el catálogo está vacío). Si aprueba, además seleccione el ente aprobador y cargue los documentos del ente cuando aplique.
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
            v-if="creditDirectorDecision === 'approved'"
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
          <div
            v-if="showApproverEntityDocumentsInCreditDirectorCard"
            class="rounded-md border border-border/60 bg-muted/10 p-4 space-y-3"
          >
            <ApproverEntityDocumentsSection
              :applicant="form.debtor"
              :credit-application-id="application?.id ?? null"
              :application-documents="(application?.documents ?? [])"
              :disabled="!hasPermission('radicacion_approver_entity_documentos_subir') && !hasPermission('radicacion_documentos_subir') && !hasPermission('radicacion_approver_entity_ver')"
              :auxiliary-pending-upload-hint="approverEntityDocumentUploadMode ? 'immediate' : 'draftSave'"
              :interaction-mode="approverEntityDocumentationInteractionMode"
              @update:applicant="(v) => { form.debtor = v }"
              @document-removed="removeInsurabilityDocumentFromApplicationState"
            />
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
          </CollapsibleContent>
        </Collapsible>
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
        <Collapsible v-model:open="documentationReviewConceptCollapsibleOpen">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 space-y-1.5">
                <CardTitle>Concepto revisión de documentos</CardTitle>
                <CardDescription>
                  Registra el concepto final de revisión documental y define si la radicación pasa a análisis o se devuelve.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="documentationReviewConceptCollapsibleOpen = !documentationReviewConceptCollapsibleOpen"
              >
                <Icon :name="documentationReviewConceptCollapsibleOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="mr-2 h-4 w-4" />
                {{ documentationReviewConceptCollapsibleOpen ? 'Contraer' : 'Expandir' }}
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent class="space-y-4 pt-0">
          <div class="space-y-1.5">
            <Label for="documentation_insurability">Requiere asegurabilidad</Label>
            <div class="flex justify-start">
              <Multiselect
                id="documentation_insurability"
                :model-value="documentationInsurabilityChoice === 'yes' ? 'yes' : 'no'"
                :options="[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Sí' },
                ]"
                value-prop="value"
                label="label"
                mode="single"
                :can-clear="false"
                :searchable="false"
                placeholder="Seleccionar"
                class="multiselect-director w-full max-w-md"
                @update:model-value="onDocumentationInsurabilityChoiceUpdate"
              />
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Si marca «Sí», complete los documentos del checklist debajo antes de registrar la decisión. El <span class="font-medium">estado catalogado de asegurabilidad</span> y su justificación los registra el <span class="font-medium">director de crédito</span> al aprobar la operación (o quien tenga permiso de actualizar estado en la sección de asegurabilidad). Marque como revisados los del checklist auxiliar.
            </p>
          </div>
          <div
            v-if="inlineInsurabilityDocumentsInDocReviewCard"
            class="rounded-md border border-border/60 bg-muted/10 p-4 space-y-3"
          >
            <div>
              <p class="text-sm font-medium text-foreground">
                Documentos de asegurabilidad
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                Lista en Parametrización → Radicación → Asegurabilidad. Suba los ítems obligatorios del deudor cuando corresponda.
              </p>
            </div>
            <InsurabilityDocumentsSection
              :applicant="form.debtor"
              :credit-application-id="application?.id ?? null"
              :application-documents="(application?.documents ?? [])"
              :disabled="!hasPermission('radicacion_insurability_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
              :auxiliary-pending-upload-hint="(documentationUploadMode || insurabilityDocumentUploadMode) ? 'immediate' : 'draftSave'"
              :interaction-mode="insurabilityDocumentationInteractionMode"
              @update:applicant="(v) => { form.debtor = v }"
              @document-removed="removeInsurabilityDocumentFromApplicationState"
            />
          </div>
          <div
            v-if="inlineFngDocumentsInDocReviewCard"
            class="rounded-md border border-border/60 bg-muted/10 p-4 space-y-3"
          >
            <div>
              <p class="text-sm font-medium text-foreground">
                Documentos FNG (Fondo Nacional de Garantías)
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                Lista en Parametrización → Radicación (plantilla «FNG — documentos»). Los carga <span class="font-medium">revisión de documentos</span>, no el asesor. Obligatorios si en el paso 4 figura garantía FNG.
              </p>
            </div>
            <FngDocumentsSection
              :applicant="form.debtor"
              :credit-application-id="application?.id ?? null"
              :application-documents="(application?.documents ?? [])"
              :disabled="!hasPermission('radicacion_fng_documentos_subir') && !hasPermission('radicacion_documentos_subir')"
              :auxiliary-pending-upload-hint="documentationUploadMode ? 'immediate' : 'draftSave'"
              :interaction-mode="fngDocumentationInteractionMode"
              @update:applicant="(v) => { form.debtor = v }"
              @document-removed="removeInsurabilityDocumentFromApplicationState"
            />
          </div>
          <div
            v-if="documentationReviewFlowActive && canDocumentationDecide"
            class="rounded-md border border-border/60 bg-muted/10 p-4 space-y-3"
          >
            <div class="space-y-1.5">
              <Label for="documentation_credit_mortgage">¿La solicitud de crédito es hipotecario? *</Label>
              <p class="text-xs text-muted-foreground">
                Elija Sí o No. Es obligatorio al aprobar la revisión documental.
              </p>
              <Multiselect
                v-if="hasPermission('radicacion_credit_mortgage_classify')"
                id="documentation_credit_mortgage"
                :model-value="documentationCreditMortgage === '' ? null : documentationCreditMortgage"
                :options="documentationMortgageSelectOptions"
                value-prop="value"
                label="label"
                mode="single"
                :can-clear="true"
                :searchable="false"
                placeholder="Seleccionar Sí o No"
                class="multiselect-director w-full max-w-md"
                @update:model-value="onDocumentationCreditMortgageUpdate"
              />
              <p v-else class="text-sm text-muted-foreground">
                Valor registrado: {{
                  documentationCreditMortgage === 'yes'
                    ? 'Sí'
                    : documentationCreditMortgage === 'no'
                      ? 'No'
                      : '—'
                }}
                <span class="block text-xs mt-1">Indicar hipotecario requiere el permiso correspondiente en el rol.</span>
              </p>
            </div>
          </div>
          <p
            v-if="(application?.documents ?? []).length > 0 && !allDocumentsMarkedReviewed"
            class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          >
            <template v-if="documentationReviewFlowActive">
              Marca «Revisado» en cada documento del checklist auxiliar del deudor y de cada codeudor (pasos del formulario) antes de enviar el concepto.
            </template>
            <template v-else>
              Marca «Revisado» en todos los documentos del deudor y de cada codeudor (pasos del formulario) antes de enviar el concepto.
            </template>
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
          </CollapsibleContent>
        </Collapsible>
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
              :hide-documents-section="!showDocumentationAuxiliaryChecklist"
              :show-co-debtor-concept="false"
              :read-only-form="true"
              :documents-editable-only="documentationUploadMode"
              :show-documentos-auxiliar-checklist="showDocumentationAuxiliaryChecklist"
              :auxiliary-pending-upload-hint="documentationUploadMode ? 'immediate' : 'draftSave'"
              :auxiliary-interaction-mode="documentationAuxiliaryInteractionMode"
              :show-auxiliary-document-review="showAuxiliaryDocumentReviewInChecklist"
              :credit-application-id="application?.id ?? null"
              :credit-application-documents="application?.documents ?? []"
            />
            <div v-if="!documentationReviewFlowActive && getDocumentsForApplicant(debtor.id).length > 0" class="space-y-3 border-t pt-4">
              <div class="space-y-1">
                <p class="text-sm font-semibold">
                  {{ documentationUploadMode ? 'Archivos de la solicitud (descarga y revisión)' : 'Documentos adjuntos' }}
                </p>
                <p
                  v-if="documentationUploadMode"
                  class="text-xs text-muted-foreground leading-snug"
                >
                  Enlaces a los mismos archivos de la solicitud. Si el checklist de arriba ya muestra la carga, use esta zona para abrir el archivo y, si aplica, registrar la revisión documental.
                </p>
              </div>
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
                :hide-documents-section="!documentationUploadMode"
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
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p class="text-sm font-medium">¿Solicitud de crédito hipotecario?</p>
                <p class="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {{ creditMortgageSummaryText(application?.credit_mortgage_options) }}
                </p>
                <p class="text-xs text-muted-foreground">
                  Lo registra revisión de documentación al aprobar el concepto (cuando aplica).
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
                  :hide-documents-section="!showDocumentationAuxiliaryChecklist"
                  :read-only-form="true"
                  :documents-editable-only="documentationUploadMode"
                  :show-documentos-auxiliar-checklist="showDocumentationAuxiliaryChecklist"
                  :auxiliary-pending-upload-hint="documentationUploadMode ? 'immediate' : 'draftSave'"
                  :auxiliary-interaction-mode="documentationAuxiliaryInteractionMode"
                  :show-auxiliary-document-review="showAuxiliaryDocumentReviewInChecklist"
                  :credit-application-id="application?.id ?? null"
                  :credit-application-documents="application?.documents ?? []"
                />
                <div
                  v-if="!documentationReviewFlowActive && getDocumentsForApplicant(coDebtors[selectedCoDebtorIndex]?.id ?? coDebtors[selectedCoDebtorIndex]?.applicant_id).length > 0"
                  class="space-y-3"
                >
                  <div class="space-y-1">
                    <p class="text-sm font-semibold">
                      {{ documentationUploadMode ? 'Archivos de la solicitud (descarga y revisión)' : 'Documentos adjuntos' }}
                    </p>
                    <p
                      v-if="documentationUploadMode"
                      class="text-xs text-muted-foreground leading-snug"
                    >
                      Enlaces a los archivos del codeudor en la solicitud. Complementa el checklist de arriba cuando está en revisión documental.
                    </p>
                  </div>
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
            <template v-else-if="creditDirectorDecision === 'rejected'">
              La solicitud quedará <strong>rechazada</strong> de forma definitiva. Esta acción no se puede deshacer desde aquí.
            </template>
            <template v-else-if="creditDirectorDecision === 'returned_modification'">
              La solicitud pasará a estado <strong>Modificación</strong> para corrección y nuevo flujo hasta una nueva revisión del director de crédito.
            </template>
            <template v-else-if="creditDirectorDecision === 'returned_insurer_response'">
              La solicitud pasará a estado <strong>Respuesta aseguradora</strong>; al reenviar, irá priorizada al analista.
            </template>
            <template v-else>
              Confirme la decisión del director de crédito.
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
