<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const id = computed(() => route.params.id as string)
const application = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const { formatPesos } = usePesosFormat()

/**
 * Deudor y codeudores vienen del API (debtor, co_debtors) o se construyen desde applicants/pivots.
 */
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

const debtor = computed(() => {
  const app = application.value
  if (!app) return null

  // 1. API retorna debtor explícito
  if (app.debtor && typeof app.debtor === 'object') {
    return {
      ...app.debtor,
      financial_info: parseJsonField(app.debtor.financial_info),
      references: parseReferences(app.debtor.references),
    }
  }

  // 2. applicants + application_applicants
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

  // 3. applicants con pivot (cada applicant tiene pivot.role)
  const withPivot = apps.find((a: any) => (a.pivot?.role ?? a.pivot?.Role) === 'DEUDOR')
  if (withPivot) {
    return {
      ...withPivot,
      financial_info: parseJsonField(withPivot.pivot?.financial_info),
      references: parseReferences(withPivot.pivot?.references),
    }
  }

  // 4. Primer applicant como deudor (legacy)
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

  // 1. API retorna co_debtors
  if (Array.isArray(app.co_debtors) && app.co_debtors.length) {
    return app.co_debtors.map((c: any) => ({
      ...c,
      financial_info: parseJsonField(c.financial_info),
      references: parseReferences(c.references),
    }))
  }

  // 2. application_applicants con role CODEUDOR
  const apps = app.applicants ?? []
  const pivots = app.application_applicants ?? app.applicationApplicants ?? []
  const coPivots = pivots.filter((p: any) => (p.role ?? p.Role) === 'CODEUDOR')
  if (coPivots.length) {
    return coPivots
      .map((pivot: any) => {
        const applicant = apps.find((a: any) => a.id === pivot.applicant_id)
        return applicant
          ? { ...applicant, financial_info: parseJsonField(pivot.financial_info), references: parseReferences(pivot.references) }
          : null
      })
      .filter(Boolean)
  }

  // 3. applicants con pivot role CODEUDOR
  return apps
    .filter((a: any) => (a.pivot?.role ?? a.pivot?.Role) === 'CODEUDOR')
    .map((a: any) => ({
      ...a,
      financial_info: parseJsonField(a.pivot?.financial_info),
      references: parseReferences(a.pivot?.references),
    }))
})

/** Documentos agrupados por applicant_id (usa claves numéricas y string para lookup) */
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

/** Obtiene documentos de un solicitante (deudor o codeudor) por su id */
function getDocumentsForApplicant(applicantId: number | string | null | undefined): any[] {
  if (applicantId == null) return []
  const key = String(applicantId)
  return documentsByApplicant.value[key] ?? []
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    Draft: 'Borrador',
    Submitted: 'Enviada',
    In_Analysis: 'En análisis',
    Approved: 'Aprobada',
    Rejected: 'Rechazada',
  }
  return map[status] ?? status
}

function getStatusBadgeVariant(status: string) {
  const map: Record<string, string> = {
    Draft: 'secondary',
    Submitted: 'default',
    In_Analysis: 'outline',
    Approved: 'default',
    Rejected: 'destructive',
  }
  return map[status] || 'outline'
}

function fullName(a: any): string {
  return [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean).join(' ') || '-'
}

async function fetchApplication() {
  loading.value = true
  error.value = null
  try {
    const res = await $api<{ data: any }>(`/credit-applications/${id.value}`)
    // API retorna { data: { id, debtor, co_debtors, ... } }
    application.value = res?.data ?? res
  } catch (e) {
    console.error('Error cargando solicitud:', e)
    error.value = 'No se pudo cargar la solicitud'
    application.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchApplication()
})
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
        Ir a lista
      </Button>
    </div>

    <template v-else-if="application">
      <!-- Encabezado: código, estado, datos principales -->
      <Card>
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle class="text-xl">
                {{ application.code || `Solicitud #${application.id}` }}
              </CardTitle>
              <CardDescription>
                Creada el {{ new Date(application.created_at).toLocaleDateString('es-CO', { dateStyle: 'long' }) }}
              </CardDescription>
            </div>
            <Badge :variant="getStatusBadgeVariant(application.status) as any" class="text-sm px-4 py-1.5">
              {{ getStatusLabel(application.status) }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">Monto solicitado</p>
              <p class="text-lg font-semibold">{{ formatPesos(Number(application.amount_requested)) }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">Plazo</p>
              <p class="text-lg font-semibold">{{ application.term_months }} meses</p>
            </div>
            <div class="space-y-1 sm:col-span-2">
              <p class="text-sm font-medium text-muted-foreground">Sucursal / Agencia</p>
              <p class="text-lg font-semibold">
                {{ application.sucursal?.name ?? application.agency?.name ?? '-' }}
              </p>
            </div>
            <div class="space-y-1 sm:col-span-2">
              <p class="text-sm font-medium text-muted-foreground">Destino del crédito</p>
              <p>{{ application.destination || '-' }}</p>
            </div>
            <div v-if="application.destination_description" class="space-y-1 sm:col-span-2">
              <p class="text-sm font-medium text-muted-foreground">Descripción del destino</p>
              <p class="whitespace-pre-wrap">{{ application.destination_description }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Deudor -->
      <Card>
        <CardHeader>
          <CardTitle>Datos del Deudor</CardTitle>
          <CardDescription>
            {{ debtor ? fullName(debtor) : 'Información del solicitante principal' }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicantViewFields
            v-if="debtor"
            :key="`debtor-${debtor.id}`"
            :applicant="debtor"
            :documents="getDocumentsForApplicant(debtor.id)"
            :application-id="application.id"
          />
          <p v-else class="text-muted-foreground py-4">
            No se encontraron datos del solicitante para esta radicación.
          </p>
        </CardContent>
      </Card>

      <!-- Codeudores -->
      <Card v-if="coDebtors.length > 0">
        <CardHeader>
          <CardTitle>Codeudores</CardTitle>
          <CardDescription>Personas que respaldan la solicitud</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div
            v-for="(co, idx) in coDebtors"
            :key="co.id"
            class="rounded-lg border border-border p-4"
          >
            <h4 class="mb-4 font-semibold">
              Codeudor {{ idx + 1 }}: {{ fullName(co) }}
            </h4>
            <ApplicantViewFields
              :key="`co-${co.id}`"
              :applicant="co"
              :documents="getDocumentsForApplicant(co.id)"
              :application-id="application.id"
            />
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
