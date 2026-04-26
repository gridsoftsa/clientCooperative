<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import CreditsFinancialActivityFormList from '~/components/credits/FinancialActivityFormList.vue'
import {
  sumUtilidadMensualFromTemplates,
  validateAllActivityTemplates,
} from '~/constants/credits-financial-templates'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { parseActivityTemplateList } from '~/types/credit-application'
import { mergeApplicantFromApi } from '~/utils/merge-applicant-search'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  /** Misma capacidad que crear borradores: quien puede crear puede retomar el formulario */
  permissions: ['radicacion_crear', 'radicacion_editar'],
})

const route = useRoute()
const router = useRouter()
const { $api, $csrf } = useNuxtApp()
const id = computed(() => route.params.id as string)
const application = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const loadingSearch = ref(false)
const agencies = ref<Array<{ id: number; name: string; code?: string }>>([])
const currentStep = ref(1)

const addingCodeudor = ref(false)
const codeudorStep = ref(1)
const codeudorBeingAdded = ref<ApplicantForm>({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
  documents: [],
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

const steps = computed(() => (addingCodeudor.value ? stepsCodeudor : stepsDeudor))
const maxStep = computed(() => steps.value.length)

const canEdit = computed(() => application.value?.status === 'Draft')

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
  const fi = parseJsonField(api?.financial_info)
  const residenceName = (typeof api?.residence_city_name === 'string' && api.residence_city_name?.trim())
    ? api.residence_city_name
    : (api?.residence_city as { name?: string } | null)?.name ?? ''
  return {
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
    documents: docs.map((d) => ({ title: d.title || d.original_name || 'Documento' })),
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
    destination_activity_templates: parseActivityTemplateList(app.destination_activity_templates),
    agency_id: app.agency_id ?? 0,
    status: 'Draft',
    numero_radicado_externo: app.numero_radicado_externo ?? '',
    co_debtors: coDebtors.value.map((c) => {
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
    await nextTick()
    syncFormFromApplication()
  } catch (e) {
    console.error('Error cargando solicitud:', e)
    error.value = 'No se pudo cargar la solicitud'
    application.value = null
  } finally {
    loading.value = false
  }
}

async function fetchCatalogs() {
  try {
    const agenciesRes = await $api<{ data: typeof agencies.value }>('/catalogs/agencies')
    agencies.value = agenciesRes.data
  } catch (e) {
    console.error('Error cargando catálogos:', e)
    toast.error('Error al cargar catálogos')
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
  codeudorStep.value = 1
  codeudorBeingAdded.value = { ...emptyCodeudor() }
}

function cancelAddingCodeudor() {
  addingCodeudor.value = false
  codeudorStep.value = 1
}

function confirmAddCodeudor() {
  if (!codeudorBeingAdded.value.document_number?.trim()
    || !codeudorBeingAdded.value.first_name?.trim()
    || !codeudorBeingAdded.value.first_last_name?.trim()) {
    toast.error('Completa documento, primer nombre y primer apellido del codeudor')
    return
  }
  if (hasDocumentsWithoutTitleInApplicant(codeudorBeingAdded.value)) {
    toast.error('Todos los documentos adjuntos deben tener un título')
    return
  }
  form.value.co_debtors.push({ ...codeudorBeingAdded.value })
  toast.success('Codeudor agregado')
  cancelAddingCodeudor()
}

function hasDocumentsWithoutTitleInApplicant(app: ApplicantForm): boolean {
  for (const d of app.documents ?? []) {
    if (d.file && !d.title?.trim()) return true
  }
  return false
}

function nextCodeudorStep() {
  if (codeudorStep.value < 3) codeudorStep.value++
}

function prevCodeudorStep() {
  if (codeudorStep.value > 1) codeudorStep.value--
}

function removeCoDebtor(index: number) {
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

function validateActivityTemplatesBeforeSave(): string | null {
  const debtorT = getActivityTemplates()
  let r = validateAllActivityTemplates(debtorT)
  if (!r.valid) {
    return r.errors.join(' ')
  }
  const cos = form.value.co_debtors ?? []
  for (let i = 0; i < cos.length; i++) {
    const co = cos[i]
    if (!co) continue
    r = validateAllActivityTemplates(getActivityTemplatesFor(co))
    if (!r.valid) {
      return `Codeudor ${i + 1}: ${r.errors.join(' ')}`
    }
  }
  const destT = form.value.destination_activity_templates ?? []
  r = validateAllActivityTemplates(destT)
  if (!r.valid) {
    return `Destino del crédito (actividades de referencia): ${r.errors.join(' ')}`
  }
  return null
}

const applicantForFinancialSummary = computed(() =>
  (addingCodeudor.value ? codeudorBeingAdded.value : form.value.debtor),
)

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
  const d = form.value.debtor
  return !!(d.document_number?.trim() && d.first_name?.trim() && d.first_last_name?.trim())
}

function canProceedStep2(): boolean {
  return form.value.amount_requested > 0
    && form.value.term_months > 0
    && form.value.agency_id > 0
}

function hasDocumentsWithoutTitle(): boolean {
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
  const { documents: _d, ...debtorWithoutDocs } = debtor
  const coDebtorsWithoutDocs = (co_debtors ?? []).map(({ documents: _doc, ...co }) => co)
  return {
    ...rest,
    debtor: debtorWithoutDocs,
    co_debtors: coDebtorsWithoutDocs,
    status,
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
  const sizeErr = validateAllDocumentsBeforeUpload()
  if (sizeErr) throw new Error(sizeErr)

  const pivots = app.application_applicants ?? app.applicationApplicants ?? []
  const debtorPivot = pivots.find((p: { role: string }) => (p.role ?? (p as any).Role) === 'DEUDOR')
  const coDebtorsList = app.co_debtors ?? app.coDebtors ?? []
  const codeudorApplicantIds = coDebtorsList.map((c: any) => c.applicant_id ?? c.applicantId)

  if (debtorPivot) {
    const docs = form.value.debtor.documents ?? []
    for (const doc of docs) {
      if (!doc.file || !doc.title?.trim()) continue
      const fd = new FormData()
      fd.append('title', doc.title.trim())
      fd.append('file', doc.file)
      await $api(`/credit-applications/${applicationId}/documents`, { method: 'POST', body: fd })
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
      const fd = new FormData()
      fd.append('title', doc.title.trim())
      fd.append('file', doc.file)
      fd.append('applicant_id', String(applicantId))
      await $api(`/credit-applications/${applicationId}/documents`, { method: 'POST', body: fd })
    }
  }
}

async function saveChanges() {
  if (!canProceedStep1()) {
    toast.error('Completa al menos documento, primer nombre y primer apellido del deudor')
    return
  }
  if (!canProceedStep2()) {
    toast.error('Completa monto, plazo y agencia')
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

  saving.value = true
  try {
    await $csrf()
    const { data: updated } = await $api<{ data: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }>; co_debtors?: Array<{ applicant_id: number }> } }>(
      `/credit-applications/${id.value}`,
      { method: 'PUT', body: payloadWithoutDocuments('Draft') },
    )
    await uploadAllDocuments(updated.id, updated)
    toast.success('Cambios guardados correctamente')
    router.push('/radicacion')
  } catch (e: any) {
    console.error('Error guardando:', e)
    let msg = 'Error al guardar'
    if (e?.status === 413 || e?.statusCode === 413 || e?.response?.status === 413 || String(e?.message || '').includes('413')) {
      msg = 'Uno o más archivos superan el límite de 10 MB. Por favor, sube documentos más pequeños.'
    } else if (e?.data?.errors && typeof e.data.errors === 'object') {
      msg = Object.values(e.data.errors as Record<string, string[]>).flat().join(', ')
    } else if (e?.data?.message) {
      msg = e.data.message
    } else if (e?.message) {
      msg = e.message
    }
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

function nextStep() {
  if (currentStep.value < maxStep.value) currentStep.value++
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

watch([application, debtor, coDebtors], () => {
  if (application.value && debtor.value && canEdit.value) {
    syncFormFromApplication()
  }
}, { deep: true })

onMounted(() => {
  fetchApplication()
  fetchCatalogs()
})
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col gap-4 px-0">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Radicación
        </h2>
        <p class="text-muted-foreground">
          Radicación - Borrador
        </p>
      </div>
      <Button variant="outline" @click="router.push('/radicacion')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
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
      v-else-if="application && !canEdit"
      class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
    >
      <p class="text-destructive font-medium">
        Solo se pueden editar solicitudes en estado Borrador (Draft). Esta solicitud tiene estado: {{ application.status }}.
      </p>
      <Button variant="outline" class="mt-4" @click="router.push('/radicacion')">
        Volver
      </Button>
    </div>

    <template v-else-if="application && canEdit">
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

      <div class="rounded-xl border bg-card p-4">
        <div class="space-y-1.5 max-w-2xl">
          <Label for="numero_radicado_externo" class="text-sm font-semibold">
            Número de radicado externo
          </Label>
          <Input
            id="numero_radicado_externo"
            v-model="form.numero_radicado_externo"
            type="text"
            maxlength="100"
            placeholder="Ej: RAD-EXT-2025-001234 (se asigna al pasar a análisis)"
            class="max-w-2xl font-mono"
          />
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
            {{ addingCodeudor ? `Agregar Codeudor - ${stepsCodeudor[codeudorStep - 1]?.title ?? ''}` : (steps[currentStep - 1]?.title ?? '') }}
          </CardTitle>
          <CardDescription>
            {{ addingCodeudor
              ? (codeudorStep === 1
                  ? 'Busca por cédula o completa el formulario (datos personales y concepto del codeudor)'
                  : codeudorStep === 2
                    ? 'Plantillas agropecuarias según la actividad económica'
                    : 'Ingresos, gastos y solvencia del codeudor')
              : (currentStep === 1
                ? 'Busca por cédula o completa el formulario del deudor principal'
                : currentStep === 2
                  ? 'Plantillas agropecuarias según la actividad económica del deudor'
                  : currentStep === 3
                    ? 'Ingresos, gastos y solvencia del deudor'
                    : currentStep === 4
                      ? 'Monto, plazo y destino del crédito'
                      : 'Agrega codeudores si aplica') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div
            v-if="!addingCodeudor && currentStep === 1"
            class="space-y-4"
          >
            <ApplicantFormFields
              v-model="form.debtor"
              :show-search="true"
              :loading-search="loadingSearch"
              :hide-financial-section="true"
              :readonly="false"
              @search="searchApplicant"
            />
          </div>

          <div
            v-else-if="!addingCodeudor && currentStep === 2"
            class="space-y-4"
          >
            <CreditsFinancialActivityFormList
              :model-value="getActivityTemplates()"
              @update:model-value="setActivityTemplates"
            />
          </div>

          <div
            v-else-if="!addingCodeudor && currentStep === 3"
            class="space-y-4"
          >
            <ApplicantFormFields
              v-model="form.debtor"
              :show-only-financial="true"
              :readonly="false"
            />
          </div>

          <div v-else-if="!addingCodeudor && currentStep === 4" class="space-y-8">
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
                <Label for="agency">Sucursal *</Label>
                <Select v-model="form.agency_id">
                  <SelectTrigger id="agency">
                    <SelectValue placeholder="Seleccionar agencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="a in agencies"
                      :key="a.id"
                      :value="a.id"
                    >
                      {{ a.name }}{{ a.code ? ` (${a.code})` : '' }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label for="destination">Destino del crédito</Label>
                <Input
                  id="destination"
                  v-model="form.destination"
                  placeholder="Ej: Capital de trabajo, vivienda..."
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
                />
              </div>
            </div>
            <div class="space-y-4 border-t border-border pt-6">
              <div>
                <p class="text-sm font-medium">
                  Actividades económicas del destino (referencia)
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Los valores aquí son solo informativos y no alteran ingresos ni datos financieros del deudor.
                </p>
              </div>
              <CreditsFinancialActivityFormList
                v-model="form.destination_activity_templates"
                list-hint="Añade plantillas que ilustren cómo se invertirá o destinará el crédito. No se sincronizan con el paso 2 ni el 3."
              />
            </div>
          </div>

          <div
            v-else-if="currentStep === 5 && !addingCodeudor"
            class="space-y-6"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <p class="text-sm text-muted-foreground">
                Agrega codeudores si el crédito lo requiere
              </p>
              <Button type="button" variant="outline" size="sm" @click="startAddingCodeudor">
                <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                Agregar Codeudor
              </Button>
            </div>

            <div v-if="form.co_debtors.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay codeudores. Haz clic en "Agregar Codeudor" si aplica.
            </div>

            <Accordion v-else type="multiple" collapsible class="space-y-2">
              <AccordionItem
                v-for="(co, idx) in form.co_debtors"
                :key="idx"
                :value="`codeudor-${idx}`"
                class="relative rounded-lg border border-border px-4 pr-12 data-[state=open]:border-primary/30"
              >
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  class="absolute right-2 top-2.5 h-8 gap-1.5 px-2 text-xs"
                  title="Eliminar codeudor"
                  @click="removeCoDebtor(idx)"
                >
                  <Icon name="i-lucide-trash" class="h-3.5 w-3.5 shrink-0" />
                  Eliminar
                </Button>
                <AccordionTrigger class="py-3 pr-8 hover:no-underline">
                  <span class="font-medium">
                    Codeudor {{ idx + 1 }}
                    <span v-if="co.first_name || co.first_last_name" class="ml-2 text-muted-foreground font-normal">
                      ({{ [co.first_name, co.first_last_name].filter(Boolean).join(' ') || 'Sin nombre' }})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div class="border-t border-border px-4 pt-4 pb-2">
                    <ApplicantFormFields
                      :model-value="co"
                      :show-search="true"
                      :loading-search="loadingSearch"
                      :show-co-debtor-concept="true"
                      :readonly="false"
                      @search="() => searchApplicantForCoDebtor(idx)"
                      @update:model-value="form.co_debtors[idx] = $event"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

            <div v-if="codeudorStep === 1" class="space-y-4">
              <ApplicantFormFields
                v-model="codeudorBeingAdded"
                :show-search="true"
                :loading-search="loadingSearch"
                :show-co-debtor-concept="true"
                :hide-financial-section="true"
                :readonly="false"
                @search="searchApplicantForCodeudor"
              />
            </div>
            <div v-else-if="codeudorStep === 2" class="space-y-4">
              <CreditsFinancialActivityFormList
                :model-value="getActivityTemplatesFor(codeudorBeingAdded)"
                @update:model-value="(v) => setActivityTemplatesFor(codeudorBeingAdded, v)"
              />
            </div>
            <div v-else-if="codeudorStep === 3" class="space-y-4">
              <ApplicantFormFields
                v-model="codeudorBeingAdded"
                :show-only-financial="true"
                :readonly="false"
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
                @click="confirmAddCodeudor"
              >
                <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                Agregar codeudor
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
            <Button
              :disabled="saving"
              @click="saveChanges"
            >
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
