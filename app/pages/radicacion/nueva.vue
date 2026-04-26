<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import {
  sumUtilidadMensualFromTemplates,
  validateAllActivityTemplates,
} from '~/constants/credits-financial-templates'
import {
  clearLocalDraft,
  useAutoSaveCreditApplication,
} from '~/composables/useAutoSaveCreditApplication'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { mergeApplicantFromApi } from '~/utils/merge-applicant-search'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_crear',
})

const { $api, $csrf } = useNuxtApp()
const router = useRouter()

/** Siempre inicia en deudor; 'codeudor' solo al agregar codeudor a solicitud existente por URL */
const mode = ref<'deudor' | 'codeudor'>('deudor')
const currentStep = ref(1)
const saving = ref(false)
const loadingSearch = ref(false)
const loadingApplication = ref(false)
const agencies = ref<Array<{ id: number; name: string; code?: string }>>([])
/** Solicitud existente cargada para agregar codeudor (por numero_radicado_externo) */
const existingApplication = ref<Record<string, unknown> | null>(null)
/** Dentro del paso Codeudores del deudor: mostrando el flujo de 3 pasos para agregar uno */
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

const steps = computed(() => (mode.value === 'codeudor' ? stepsCodeudor : stepsDeudor))
const maxStep = computed(() => steps.value.length)

async function fetchCatalogs() {
  try {
    const agenciesRes = await $api<{ data: typeof agencies.value }>('/catalogs/agencies')
    agencies.value = agenciesRes.data
    if (agencies.value.length && !form.value.agency_id) {
      form.value.agency_id = agencies.value[0]?.id ?? 0
    }
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

function addCoDebtor() {
  form.value.co_debtors.push(emptyCodeudor())
}

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

const { formatPesosConSimbolo, parsePesosInput, onKeydownPesosOnly } = usePesosFormat()

function formatTimeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return 'hace un momento'
  if (sec < 120) return 'hace 1 min'
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`
  if (sec < 7200) return 'hace 1 h'
  return `hace ${Math.floor(sec / 3600)} h`
}

/** Sincroniza activity_templates en financial_info desde el formulario de actividad económica. */
function setActivityTemplates(val: ActivityTemplateData[]): void {
  setActivityTemplatesFor(form.value.debtor, val)
}

function ensureFinancialInfo() {
  const d = form.value.debtor
  if (!d.financial_info || typeof d.financial_info !== 'object') {
    d.financial_info = {}
  }
}

/** Obtiene la lista de plantillas; migra activity_template (antiguo) si existe. */
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
  // Sincroniza utilidad mensual de plantillas → Ingreso cultivos/negocio (suma de todas las plantillas)
  const sumUtilidad = sumUtilidadMensualFromTemplates(val)
  const income = (fi.income ?? {}) as Record<string, unknown>
  fi.income = { ...income, business: sumUtilidad }
}

/** Valida plantillas de actividad (deudor y codeudores) antes de guardar o enviar solicitud. */
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

/** Asegura que financial_info.solvency exista y devuelve referencia. */
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

/** Aplicante actual para resumen financiero (codeudor en edición o deudor) */
const applicantForFinancialSummary = computed(() =>
  (addingCodeudor.value ? codeudorBeingAdded.value : form.value.debtor),
)

/** Total de activos (suma de todos los valores en la lista) */
const totalActivosFromAssets = computed(() => {
  const assets = (applicantForFinancialSummary.value.financial_info as any)?.assets ?? []
  return assets.reduce((sum: number, a: { value?: number }) => sum + (a.value ?? 0), 0)
})

/** Bien raíz (suma de activos marcados como garantía) */
const bienRaizFromGarantias = computed(() => {
  const assets = (applicantForFinancialSummary.value.financial_info as any)?.assets ?? []
  return assets.reduce((sum: number, a: { garantia?: boolean; value?: number }) =>
    (a.garantia ? sum + (a.value ?? 0) : sum), 0)
})

/** Sincroniza Activos y Bien raíz en el resumen desde la lista de activos */
watch([totalActivosFromAssets, bienRaizFromGarantias], ([total, bienRaiz]) => {
  const s = ensureSolvency()
  s.assets = total as number
  s.real_estate = bienRaiz as number
}, { immediate: true })

/** Monto solicitado para cálculo de solvencia (en codeudor viene de la solicitud existente) */
const amountForSolvencia = computed(() => {
  if (mode.value === 'codeudor' && existingApplication.value) {
    return Number((existingApplication.value as any).amount_requested) || 0
  }
  return form.value.amount_requested
})

/** Solvencia % = ((Pasivos + monto solicitado) ÷ Activos) × 100. Menor % = mejor cobertura de activos. */
const solvenciaPercentage = computed(() => {
  const pasivos = getSolvencyField('liabilities') ?? 0
  const activos = totalActivosFromAssets.value
  const monto = amountForSolvencia.value
  if (!activos || activos <= 0 || !monto || monto <= 0) return null
  const pct = ((pasivos + monto) / activos) * 100
  return Math.round(pct * 100) / 100
})

/** Endeudamiento % = ((Pasivos + monto solicitado) ÷ Bien raíz) × 100. Menor % = mejor. */
const endeudamientoPercentage = computed(() => {
  const pasivos = getSolvencyField('liabilities') ?? 0
  const bienRaiz = bienRaizFromGarantias.value
  const monto = amountForSolvencia.value
  if (!bienRaiz || bienRaiz <= 0 || !monto || monto <= 0) return null
  const pct = ((pasivos + monto) / bienRaiz) * 100
  return Math.round(pct * 100) / 100
})

/** Color según ratio de apalancamiento (menor % = mejor): <50 verde, 50-100 ámbar, ≥100 rojo */
function solvenciaColorClass(pct: number | null): string {
  if (pct == null) return 'bg-muted text-muted-foreground'
  if (pct < 50) return 'bg-green-600/20 text-green-700 dark:text-green-400 border-green-600/40'
  if (pct < 100) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
  return 'bg-destructive/20 text-destructive border-destructive/40'
}

/** Sincroniza solvencia y endeudamiento calculados para persistir al guardar */
watch([solvenciaPercentage, endeudamientoPercentage], () => {
  setSolvencyField('solvency', solvenciaPercentage.value ?? undefined)
  setSolvencyField('endeudamiento', endeudamientoPercentage.value ?? undefined)
}, { immediate: true })

/** Evita teclas no numéricas en inputs type="number". allowDecimal: permitir punto. */
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
  if (mode.value === 'codeudor') {
    return !!(form.value.numero_radicado_externo?.trim())
  }
  return form.value.amount_requested > 0
    && form.value.term_months > 0
    && form.value.agency_id > 0
}

/** Carga la solicitud existente por numero_radicado_externo o código (para flujo codeudor) */
async function fetchApplicationByRadicado(): Promise<boolean> {
  const search = form.value.numero_radicado_externo?.trim()
  if (!search) return false
  loadingApplication.value = true
  try {
    const isCode = /^RAD-\d{4}-\d+$/i.test(search)
    const res = await $api<{ data: any[] }>('/credit-applications', {
      query: isCode ? { code: search, per_page: 1 } : { numero_radicado_externo: search, per_page: 1 },
    })
    const app = res.data?.[0]
    if (!app) {
      toast.error(isCode
        ? 'No se encontró ninguna solicitud con ese código'
        : 'No se encontró ninguna solicitud con ese número de radicado externo')
      return false
    }
    const full = await $api<{ data: any }>(`/credit-applications/${app.id}`)
    existingApplication.value = full.data
    return true
  } catch (e) {
    console.error('Error buscando solicitud:', e)
    toast.error('Error al buscar la solicitud')
    return false
  } finally {
    loadingApplication.value = false
  }
}

/** Documentos con archivo deben tener título (deudor y codeudores). */
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
  const radicado = form.value.numero_radicado_externo?.trim() || null
  return {
    ...rest,
    debtor: debtorWithoutDocs,
    co_debtors: coDebtorsWithoutDocs,
    numero_radicado_externo: radicado,
    status,
  }
}

/** Payload para auto-guardado: usa valores por defecto si faltan (permite crear borrador temprano) */
function payloadForAutoSave(): Record<string, unknown> {
  const base = payloadWithoutDocuments('Draft')
  const agencyId = form.value.agency_id > 0 ? form.value.agency_id : (agencies.value[0]?.id ?? 0)
  return {
    ...base,
    amount_requested: form.value.amount_requested > 0 ? form.value.amount_requested : 1,
    term_months: form.value.term_months > 0 ? form.value.term_months : 12,
    agency_id: agencyId,
  }
}

/** Puede crear borrador para auto-guardado (mínimo: deudor básico + agencias cargadas). Radicado externo es opcional. */
function canCreateDraft(): boolean {
  if (mode.value !== 'deudor' || addingCodeudor.value) return false
  if (!canProceedStep1()) return false
  if (!agencies.value.length) return false
  return true
}

const autoSaveEnabled = computed(() => mode.value === 'deudor' && !addingCodeudor.value)

const {
  draftId,
  saveStatus,
  lastSavedAt,
  hasLocalDraft,
} = useAutoSaveCreditApplication(form, {
  canCreate: canCreateDraft,
  payloadWithoutDocuments: payloadForAutoSave,
  api: $api as (url: string, opts: { method: string; body?: unknown }) => Promise<{ data: { id: number } }>,
  csrf: async () => { await $csrf() },
  enabled: autoSaveEnabled,
})

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10 MB

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
  application: {
    application_applicants?: Array<{ applicant_id: number; role: string }>
    co_debtors?: Array<{ applicant_id: number }>
  },
) {
  const sizeErr = validateAllDocumentsBeforeUpload()
  if (sizeErr) throw new Error(sizeErr)

  const pivots = application.application_applicants ?? []
  const debtorPivot = pivots.find((p: { role: string }) => p.role === 'DEUDOR')
  const codeudorApplicantIds = (application.co_debtors ?? []).map((c: { applicant_id: number }) => c.applicant_id)

  // Deudor
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

  // Codeudores (desde tabla co_debtors)
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

async function saveCodeudor() {
  if (!form.value.numero_radicado_externo?.trim()) {
    toast.error('Ingresa el código (RAD-XXX) o radicado externo para vincular el codeudor')
    return
  }
  if (!canProceedStep1()) {
    toast.error('Completa documento, primer nombre y primer apellido del codeudor')
    return
  }
  if (hasDocumentsWithoutTitle()) {
    toast.error('Todos los documentos adjuntos deben tener un título')
    return
  }
  if (!existingApplication.value) {
    const ok = await fetchApplicationByRadicado()
    if (!ok) return
  }
  const app = existingApplication.value as any
  if (!app?.id) {
    toast.error('No se encontró la solicitud')
    return
  }
  if (app.status !== 'Draft') {
    toast.error('Solo se pueden agregar codeudores a solicitudes en borrador')
    return
  }

  saving.value = true
  try {
    await $csrf()
    const existingCoDebtors = (app.co_debtors ?? []).map((c: any) => {
      const { documents: _d, ...rest } = c
      return rest
    })
    const codeudorFormData = form.value.debtor
    const { documents: _dd, ...coWithoutDocs } = codeudorFormData
    const payload = {
      debtor: app.debtor,
      co_debtors: [...existingCoDebtors, coWithoutDocs],
      amount_requested: app.amount_requested,
      term_months: app.term_months,
      agency_id: app.agency_id,
      destination: app.destination ?? '',
      destination_description: app.destination_description ?? '',
      destination_activity_templates: Array.isArray(app.destination_activity_templates)
        ? app.destination_activity_templates
        : [],
      numero_radicado_externo: app.numero_radicado_externo ?? form.value.numero_radicado_externo,
      status: 'Draft',
    }
    const { data: updated } = await $api<{ data: { id: number; co_debtors?: Array<{ applicant_id: number }> } }>(
      `/credit-applications/${app.id}`,
      { method: 'PUT', body: payload },
    )
    const coDebtorsList = (updated.co_debtors ?? []) as Array<{ applicant_id: number }>
    const createdCoDebtor = coDebtorsList[coDebtorsList.length - 1]
    if (createdCoDebtor) {
      const docs = form.value.debtor.documents ?? []
      for (const d of docs) {
        if (d.file && d.file.size > MAX_DOCUMENT_SIZE) {
          throw new Error(`"${d.file.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.`)
        }
      }
      for (const doc of docs) {
        if (!doc.file || !doc.title?.trim()) continue
        const fd = new FormData()
        fd.append('title', doc.title.trim())
        fd.append('file', doc.file)
        fd.append('applicant_id', String(createdCoDebtor.applicant_id))
        await $api(`/credit-applications/${updated.id}/documents`, { method: 'POST', body: fd })
      }
    }
    toast.success('Codeudor agregado correctamente')
    router.push('/radicacion')
  } catch (e: any) {
    console.error('Error guardando codeudor:', e)
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

async function saveDraft() {
  if (mode.value === 'codeudor') {
    await saveCodeudor()
    return
  }
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
    let application: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }>; co_debtors?: Array<{ applicant_id: number }> }
    if (draftId.value) {
      const { data } = await $api<{ data: typeof application }>(`/credit-applications/${draftId.value}`, {
        method: 'PUT',
        body: payloadWithoutDocuments('Draft'),
      })
      application = data
    } else {
      const { data } = await $api<{ data: typeof application }>('/credit-applications', {
        method: 'POST',
        body: payloadWithoutDocuments('Draft'),
      })
      application = data
    }
    await uploadAllDocuments(application.id, application)
    clearLocalDraft()
    toast.success('Borrador guardado. Puedes retomarlo más tarde.')
    await navigateTo(`/radicacion/editar/${application.id}`)
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

async function submitApplication() {
  if (mode.value === 'codeudor') {
    await saveCodeudor()
    return
  }
  if (!canProceedStep1()) {
    toast.error('Completa los datos obligatorios del deudor')
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
  const errTemplatesSubmit = validateActivityTemplatesBeforeSave()
  if (errTemplatesSubmit) {
    toast.error(errTemplatesSubmit)
    return
  }

  saving.value = true
  try {
    await $csrf()
    let application: { id: number; code?: string; application_applicants?: Array<{ applicant_id: number; role: string }>; co_debtors?: Array<{ applicant_id: number }> }
    if (draftId.value) {
      const { data } = await $api<{ data: typeof application }>(`/credit-applications/${draftId.value}`, {
        method: 'PUT',
        body: payloadWithoutDocuments('Draft'),
      })
      application = data
    } else {
      const { data } = await $api<{ data: typeof application }>('/credit-applications', {
        method: 'POST',
        body: payloadWithoutDocuments('Draft'),
      })
      application = data
    }
    await uploadAllDocuments(application.id, application)
    clearLocalDraft()
    toast.success(
      'Solicitud guardada (estado: Borrador). Cuando quieras, descarga el PDF desde la vista o el listado de radicación.',
    )
    await navigateTo(`/radicacion/editar/${application.id}`)
  } catch (e: any) {
    console.error('Error enviando:', e)
    let msg = 'Error al enviar'
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

async function nextStep() {
  if (mode.value === 'codeudor' && currentStep.value === 1) {
    if (!form.value.numero_radicado_externo?.trim()) {
      toast.error('Ingresa el código (RAD-XXX) o radicado externo para buscar la solicitud')
      return
    }
    const ok = await fetchApplicationByRadicado()
    if (!ok) return
  }
  if (currentStep.value < maxStep.value) currentStep.value++
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

function selectMode(m: 'deudor' | 'codeudor') {
  mode.value = m
  currentStep.value = 1
  existingApplication.value = null
  if (m === 'codeudor') {
    form.value.co_debtors = []
    form.value.debtor = {
      document_type: 'CC',
      document_number: '',
      first_name: '',
      first_last_name: '',
      dependents: 0,
      documents: [],
    }
  }
}


onMounted(() => {
  fetchCatalogs()
})
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col gap-4 px-0">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva Entrevista de Crédito
        </h2>
        <p class="text-muted-foreground">
          Radicación - Módulo 1
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Indicador de auto-guardado (solo flujo deudor) -->
        <div
          v-if="mode === 'deudor' && !addingCodeudor"
          class="flex items-center gap-2 text-sm"
          :class="{
            'text-muted-foreground': saveStatus === 'idle' || saveStatus === 'saved',
            'text-amber-600 dark:text-amber-400': saveStatus === 'saving',
            'text-destructive': saveStatus === 'error',
          }"
        >
          <Icon
            v-if="saveStatus === 'saving'"
            name="i-lucide-loader-2"
            class="h-4 w-4 animate-spin"
          />
          <Icon
            v-else-if="saveStatus === 'saved'"
            name="i-lucide-check-circle"
            class="h-4 w-4 text-green-600 dark:text-green-400"
          />
          <Icon
            v-else-if="saveStatus === 'error'"
            name="i-lucide-alert-circle"
            class="h-4 w-4"
          />
          <span v-if="saveStatus === 'saving'">Guardando...</span>
          <span v-else-if="saveStatus === 'saved'">
            Guardado {{ lastSavedAt ? `hace ${formatTimeAgo(lastSavedAt)}` : '' }}
          </span>
          <span v-else-if="saveStatus === 'error'">Error al guardar (datos en copia local)</span>
        </div>
        <Button variant="outline" @click="router.push('/radicacion')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>

    <!-- Formulario Deudor (o Codeudor si se llegó por query/estado) -->
    <!-- Número de radicado externo: siempre visible (deudor y codeudor) -->
    <div class="rounded-xl border bg-card p-4">
      <div class="space-y-1.5 max-w-2xl">
        <Label for="numero_radicado_externo" class="text-sm font-semibold">
          {{ mode === 'codeudor' ? 'Código o radicado externo *' : 'Número de radicado externo' }}
        </Label>
        <Input
          id="numero_radicado_externo"
          v-model="form.numero_radicado_externo"
          type="text"
          maxlength="100"
          :placeholder="mode === 'codeudor' ? 'Ej: RAD-2026-000001 o RAD-EXT-2025-001234' : 'Ej: RAD-EXT-2025-001234 (se asigna al pasar a análisis)'"
          :required="mode === 'codeudor'"
          class="max-w-2xl font-mono"
        />
        <p class="text-xs text-muted-foreground">
          {{ mode === 'codeudor'
            ? 'Código interno (RAD-XXX) o radicado externo para vincular este codeudor a la solicitud.'
            : 'Opcional al crear. Se asigna al enviar al sistema externo y pasar la solicitud a análisis.' }}
        </p>
      </div>
    </div>

    <!-- Resumen financiero del deudor o codeudor (oculto p. ej. para rol asesor: sin permiso radicacion_ver_resumen_financiero) -->
    <template v-if="mode">
      <PermissionGate permission="radicacion_ver_resumen_financiero" strict>
        <div
          class="rounded-xl border-2 border-primary/30 bg-primary/5 p-4"
        >
      <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Resumen financiero {{ mode === 'codeudor' ? 'del codeudor' : 'del deudor' }}
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
    </template>

    <!-- Stepper (cada paso es clickeable para navegar) - oculto al agregar codeudor -->
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
          :aria-label="`Ir a paso ${step.num}: ${step.title}`"
          @click="currentStep = step.num"
        >
          <div
            class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors shrink-0 ring-1 ring-border/50"
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
          aria-hidden
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
                ? 'Datos personales y concepto del codeudor'
                : codeudorStep === 2
                  ? 'Plantillas agropecuarias según la actividad económica'
                  : 'Ingresos, gastos y solvencia del codeudor')
            : mode === 'codeudor'
              ? (currentStep === 1
                  ? 'Busca por cédula o completa el formulario del codeudor'
                  : currentStep === 2
                    ? 'Plantillas agropecuarias según la actividad económica del codeudor'
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
        <!-- Paso 1: Datos del Deudor o Codeudor -->
        <div
          v-if="(mode === 'deudor' && currentStep === 1) || (mode === 'codeudor' && currentStep === 1)"
          class="space-y-4"
        >
          <ApplicantFormFields
            v-model="form.debtor"
            :show-search="true"
            :loading-search="loadingSearch"
            :hide-financial-section="true"
            :show-co-debtor-concept="mode === 'codeudor'"
            @search="searchApplicant"
          />
        </div>

        <!-- Paso 2: Actividad económica -->
        <div
          v-else-if="(mode === 'deudor' && currentStep === 2) || (mode === 'codeudor' && currentStep === 2)"
          class="space-y-4"
        >
          <CreditsFinancialActivityFormList
            :model-value="getActivityTemplates()"
            @update:model-value="setActivityTemplates"
          />
        </div>

        <!-- Paso 3: Datos financieros -->
        <div
          v-else-if="(mode === 'deudor' && currentStep === 3) || (mode === 'codeudor' && currentStep === 3)"
          class="space-y-4"
        >
          <ApplicantFormFields
            v-model="form.debtor"
            :show-only-financial="true"
          />
        </div>

        <!-- Paso 4 Deudor: Solicitud (solo deudor) -->
        <div v-else-if="mode === 'deudor' && currentStep === 4" class="space-y-8">
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
                placeholder="Describa en detalle el uso que se le dará al crédito (inversión, gastos a cubrir, etc.)"
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
                Misma herramienta que en el paso 2 para describir en detalle el proyecto o rubro; los ingresos y cifras aquí son solo informativos y no alteran el perfil financiero del deudor.
              </p>
            </div>
            <CreditsFinancialActivityFormList
              v-model="form.destination_activity_templates"
              list-hint="Añade plantillas que ilustren cómo se invertirá o destinará el crédito. Valores referenciales: no se sincronizan con ingresos del paso 2 ni con el paso 3."
            />
          </div>
        </div>

        <!-- Paso 5 Deudor: Codeudores - subflujo agregar codeudor (3 pasos) -->
        <div
          v-else-if="mode === 'deudor' && currentStep === 5 && addingCodeudor"
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

          <!-- Paso 1: Datos del Codeudor -->
          <div v-if="codeudorStep === 1" class="space-y-4">
            <ApplicantFormFields
              v-model="codeudorBeingAdded"
              :show-search="true"
              :loading-search="loadingSearch"
              :show-co-debtor-concept="true"
              :hide-financial-section="true"
              @search="searchApplicantForCodeudor"
            />
          </div>
          <!-- Paso 2: Actividad económica -->
          <div v-else-if="codeudorStep === 2" class="space-y-4">
            <CreditsFinancialActivityFormList
              :model-value="getActivityTemplatesFor(codeudorBeingAdded)"
              @update:model-value="(v) => setActivityTemplatesFor(codeudorBeingAdded, v)"
            />
          </div>
          <!-- Paso 3: Datos financieros -->
          <div v-else-if="codeudorStep === 3" class="space-y-4">
            <ApplicantFormFields
              v-model="codeudorBeingAdded"
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
              @click="confirmAddCodeudor"
            >
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Agregar codeudor
            </Button>
          </div>
        </div>

        <!-- Paso 5 Deudor: Codeudores - lista y botón -->
        <div v-else-if="mode === 'deudor' && currentStep === 5" class="space-y-6">
          <div class="flex items-center justify-between">
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
                    @search="() => searchApplicantForCoDebtor(idx)"
                    @update:model-value="form.co_debtors[idx] = $event"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <!-- Navegación (oculta al agregar codeudor) -->
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
              v-if="mode === 'codeudor'"
              type="button"
              variant="outline"
              :disabled="saving"
              @click="saveDraft"
            >
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar codeudor
            </Button>
            <Button
              v-if="mode === 'deudor'"
              :disabled="saving"
              @click="submitApplication"
            >
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Enviar solicitud
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
