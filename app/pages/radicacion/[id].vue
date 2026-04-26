<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import CreditsFinancialActivityFormList from '~/components/credits/FinancialActivityFormList.vue'
import type { ActivityTemplateData, ApplicantForm, CreditApplicationForm } from '~/types/credit-application'
import { parseActivityTemplateList } from '~/types/credit-application'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_ver',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { hasPermission, hasAnyPermission } = usePermissions()
const id = computed(() => route.params.id as string)
const application = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

/** Borradores editables: redirige a /editar (también si el permiso llega un tick después del fetch). */
const shouldRedirectDraftToEdit = computed(() =>
  Boolean(
    !loading.value
      && application.value?.status === 'Draft'
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

const { formatPesosConSimbolo } = usePesosFormat()
const { downloadDocument, downloadApplicationPdf } = useDocumentDownload()
const downloadingPdf = ref(false)
const downloadingId = ref<number | null>(null)
const deactivating = ref(false)
const deactivateDialogOpen = ref(false)
const deleteWithReason = useApiDeleteWithReason()

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
  const fi = parseJsonField(api?.financial_info)
  const residenceName = (typeof api?.residence_city_name === 'string' && api.residence_city_name?.trim())
    ? api.residence_city_name
    : (api?.residence_city as { name?: string } | null)?.name ?? ''
  return {
    document_type: api?.document_type ?? 'CC',
    document_number: api?.document_number ?? '',
    expedition_date: api?.expedition_date,
    expedition_place: api?.expedition_place,
    first_name: api?.first_name ?? '',
    second_name: api?.second_name,
    first_last_name: api?.first_last_name ?? '',
    second_last_name: api?.second_last_name,
    birth_date: api?.birth_date,
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

const solvenciaPercentage = computed(() => {
  const d = debtor.value
  if (!d?.financial_info || !application.value) return null
  const fi = d.financial_info as any
  const sol = fi?.solvency ?? {}
  const assetsArr = fi?.assets ?? []
  const activos = Array.isArray(assetsArr)
    ? assetsArr.reduce((s: number, a: any) => s + (a?.value ?? 0), 0)
    : 0
  const pasivos = sol?.liabilities ?? 0
  const monto = Number(application.value.amount_requested) || 0
  if (!activos || activos <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / activos) * 100 * 100) / 100
})

const endeudamientoPercentage = computed(() => {
  const d = debtor.value
  if (!d?.financial_info || !application.value) return null
  const sol = (d.financial_info as any)?.solvency ?? {}
  const bienRaiz = sol?.real_estate ?? 0
  const pasivos = sol?.liabilities ?? 0
  const monto = Number(application.value.amount_requested) || 0
  if (!bienRaiz || bienRaiz <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / bienRaiz) * 100 * 100) / 100
})

/** Menor % = mejor */
function solvenciaColorClass(pct: number | null): string {
  if (pct == null) return 'bg-muted text-muted-foreground'
  if (pct < 50) return 'bg-green-600/20 text-green-700 dark:text-green-400 border-green-600/40'
  if (pct < 100) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
  return 'bg-destructive/20 text-destructive border-destructive/40'
}

function fullName(a: any): string {
  return [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean).join(' ') || '-'
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
  deactivateDialogOpen.value = true
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

async function handleDownload(doc: { id: number; title?: string; original_name?: string }) {
  if (downloadingId.value) return
  downloadingId.value = doc.id
  try {
    await downloadDocument(application.value.id, doc.id, doc.title || doc.original_name || 'documento')
  } catch (e) {
    console.error('Error descargando:', e)
    const { toast } = await import('vue-sonner')
    toast.error('No se pudo descargar el documento.')
  } finally {
    downloadingId.value = null
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
    destination_activity_templates: parseActivityTemplateList(app.destination_activity_templates),
    agency_id: app.agency_id ?? 0,
    status: app.status ?? 'Draft',
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
    if (application.value?.status === 'Draft' && hasAnyPermission(['radicacion_crear', 'radicacion_editar'])) {
      await navigateTo(`/radicacion/editar/${id.value}`, { replace: true })
      return
    }
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
  }
}

onMounted(() => {
  fetchApplication()
  fetchCatalogs()
})

watch([application, debtor, coDebtors], () => {
  if (application.value && debtor.value) syncFormFromApplication()
}, { deep: true })
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col gap-4 px-0">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Ver Radicación
        </h2>
        <p class="text-muted-foreground">
          Solicitud de crédito - Solo lectura
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar']">
          <Button
            v-if="application?.status === 'Draft' && application?.id"
            variant="warning"
            as-child
          >
            <NuxtLink :to="`/radicacion/editar/${application.id}`">
              <Icon name="i-lucide-pencil" class="mr-2 h-4 w-4" />
              Editar
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
        <PermissionGate permission="radicacion_desactivar">
          <Button
            variant="destructive"
            :disabled="deactivating"
            @click="openDeactivateDialog"
          >
            <Icon :name="deactivating ? 'i-lucide-loader-2' : 'i-lucide-ban'" class="mr-2 h-4 w-4" :class="{ 'animate-spin': deactivating }" />
            {{ deactivating ? 'Desactivando...' : 'Desactivar' }}
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
        Ir a lista
      </Button>
    </div>

    <template v-else-if="application && debtor">
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
        <div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resumen financiero del deudor
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div class="space-y-1">
              <p class="text-sm font-bold uppercase">Solvencia</p>
              <div
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
              <p class="text-sm font-bold uppercase">Endeudamiento</p>
              <div
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
              <p class="text-sm font-bold uppercase">Activos</p>
              <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                {{ formatPesosConSimbolo((debtor.financial_info as any)?.solvency?.assets ?? (debtor.financial_info as any)?.assets?.reduce((s: number, a: any) => s + (a?.value ?? 0), 0) ?? 0) }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-bold uppercase">Pasivos</p>
              <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                {{ formatPesosConSimbolo((debtor.financial_info as any)?.solvency?.liabilities) }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-bold uppercase">Bien raíz</p>
              <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
                {{ formatPesosConSimbolo((debtor.financial_info as any)?.solvency?.real_estate) }}
              </p>
            </div>
          </div>
        </div>
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
              readonly
            />
            <div v-if="getDocumentsForApplicant(debtor.id).length > 0" class="space-y-3 border-t pt-4">
              <p class="text-sm font-semibold">Documentos adjuntos</p>
              <div class="flex flex-wrap gap-2">
                <PermissionGate v-for="doc in getDocumentsForApplicant(debtor.id)" :key="doc.id" permission="radicacion_descargar_documentos">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-auto gap-2 py-2"
                    :disabled="downloadingId === doc.id"
                    @click="handleDownload(doc)"
                  >
                    <Icon :name="downloadingId === doc.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'" class="h-4 w-4 shrink-0" :class="{ 'animate-spin': downloadingId === doc.id }" />
                    {{ doc.title || doc.original_name || 'Documento' }}
                    <Icon name="i-lucide-download" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                </PermissionGate>
              </div>
            </div>
          </div>

          <!-- Paso 2: Actividad económica -->
          <div v-else-if="currentStep === 2" class="space-y-4">
            <CreditsFinancialActivityFormList
              :model-value="getActivityTemplates(debtor)"
              readonly
            />
          </div>

          <!-- Paso 3: Datos financieros -->
          <div v-else-if="currentStep === 3" class="space-y-4">
            <ApplicantFormFields
              v-model="form.debtor"
              :show-only-financial="true"
              readonly
            />
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
                  {{ form.destination || '-' }}
                </p>
              </div>
              <div v-if="form.destination_description" class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p class="text-sm font-medium">Descripción del destino</p>
                <p class="whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2">
                  {{ form.destination_description }}
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
                readonly
                list-hint="Detalle de actividades asociadas al uso del crédito; valores informativos respecto al perfil financiero."
              />
            </div>
          </div>

          <!-- Paso 5: Codeudores -->
          <div v-else-if="currentStep === 5" class="space-y-6">
            <div v-if="form.co_debtors.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay codeudores en esta solicitud.
            </div>
            <Accordion v-else type="multiple" collapsible class="space-y-2">
              <AccordionItem
                v-for="(co, idx) in form.co_debtors"
                :key="idx"
                :value="`codeudor-${idx}`"
                class="relative rounded-lg border border-border px-4 pr-12 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger class="py-3 pr-8 hover:no-underline">
                  <span class="font-medium">
                    Codeudor {{ idx + 1 }}
                    <span class="ml-2 text-muted-foreground font-normal">
                      ({{ [co.first_name, co.first_last_name].filter(Boolean).join(' ') || 'Sin nombre' }})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div class="border-t border-border px-4 pt-4 pb-2 space-y-4">
                    <ApplicantFormFields
                      :model-value="co"
                      :show-co-debtor-concept="true"
                      readonly
                      @update:model-value="() => {}"
                    />
                    <div v-if="getDocumentsForApplicant(coDebtors[idx]?.id ?? coDebtors[idx]?.applicant_id).length > 0" class="space-y-3">
                      <p class="text-sm font-semibold">Documentos adjuntos</p>
                      <div class="flex flex-wrap gap-2">
                        <PermissionGate v-for="doc in getDocumentsForApplicant(coDebtors[idx]?.id ?? coDebtors[idx]?.applicant_id)" :key="doc.id" permission="radicacion_descargar_documentos">
                          <Button
                            variant="outline"
                            size="sm"
                            class="h-auto gap-2 py-2"
                            :disabled="downloadingId === doc.id"
                            @click="handleDownload(doc)"
                          >
                            <Icon :name="downloadingId === doc.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'" class="h-4 w-4 shrink-0" :class="{ 'animate-spin': downloadingId === doc.id }" />
                            {{ doc.title || doc.original_name || 'Documento' }}
                            <Icon name="i-lucide-download" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
  </div>
</template>
