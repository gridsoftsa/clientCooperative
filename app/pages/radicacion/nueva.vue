<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import type { ApplicantForm, CreditApplicationForm } from '~/types/credit-application'

definePageMeta({
  layout: 'default',
})

const { $api, $csrf } = useNuxtApp()
const router = useRouter()

const currentStep = ref(1)
const saving = ref(false)
const loadingSearch = ref(false)
const agencies = ref<Array<{ id: number; name: string; code?: string }>>([])

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
  agency_id: 0,
  status: 'Draft',
  co_debtors: [],
})

const steps = [
  { num: 1, title: 'Datos del Deudor' },
  { num: 2, title: 'Datos de la Solicitud' },
  { num: 3, title: 'Codeudores' },
]

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
      form.value.debtor = {
        ...form.value.debtor,
        ...res.data,
        document_number: res.data.document_number,
      }
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

function addCoDebtor() {
  form.value.co_debtors.push({
    document_type: 'CC',
    document_number: '',
    first_name: '',
    first_last_name: '',
    dependents: 0,
    documents: [],
  })
}

function removeCoDebtor(index: number) {
  form.value.co_debtors.splice(index, 1)
}

const { formatPesos, parsePesosInput, onKeydownPesosOnly } = usePesosFormat()

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
  return form.value.amount_requested > 0
    && form.value.term_months > 0
    && form.value.agency_id > 0
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

async function uploadAllDocuments(applicationId: number, application: { application_applicants?: Array<{ applicant_id: number; role: string }> }) {
  const pivots = application.application_applicants ?? []
  const debtorPivot = pivots.find((p: { role: string }) => p.role === 'DEUDOR')
  const codeudorPivots = pivots.filter((p: { role: string }) => p.role === 'CODEUDOR')

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

  // Codeudores
  const coDebtors = form.value.co_debtors ?? []
  for (let i = 0; i < coDebtors.length && i < codeudorPivots.length; i++) {
    const co = coDebtors[i]
    const pivot = codeudorPivots[i]
    if (!co || !pivot) continue
    const docs = co.documents ?? []
    const applicantId = pivot.applicant_id
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

async function saveDraft() {
  if (!canProceedStep1()) {
    toast.error('Completa al menos documento, primer nombre y primer apellido del deudor')
    return
  }
  if (!canProceedStep2()) {
    toast.error('Completa monto, plazo y agencia')
    return
  }

  saving.value = true
  try {
    await $csrf()
    const { data: application } = await $api<{ data: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }> } }>('/credit-applications', {
      method: 'POST',
      body: payloadWithoutDocuments('Draft'),
    })
    await uploadAllDocuments(application.id, application)
    toast.success('Borrador guardado. Puedes retomarlo más tarde.')
    router.push('/radicacion')
  } catch (e: any) {
    console.error('Error guardando:', e)
    const msg = e?.data?.message || e?.data?.errors
      ? Object.values(e.data.errors as Record<string, string[]>).flat().join(', ')
      : 'Error al guardar'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

async function submitApplication() {
  if (!canProceedStep1()) {
    toast.error('Completa los datos obligatorios del deudor')
    return
  }
  if (!canProceedStep2()) {
    toast.error('Completa monto, plazo y agencia')
    return
  }

  saving.value = true
  try {
    await $csrf()
    const { data: application } = await $api<{ data: { id: number; application_applicants?: Array<{ applicant_id: number; role: string }> } }>('/credit-applications', {
      method: 'POST',
      body: payloadWithoutDocuments('Submitted'),
    })
    await uploadAllDocuments(application.id, application)
    toast.success('Solicitud enviada correctamente')
    router.push('/radicacion')
  } catch (e: any) {
    console.error('Error enviando:', e)
    const msg = e?.data?.message || e?.data?.errors
      ? Object.values(e.data.errors as Record<string, string[]>).flat().join(', ')
      : 'Error al enviar'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

function nextStep() {
  if (currentStep.value === 1 && !canProceedStep1()) {
    toast.error('Completa documento, primer nombre y primer apellido del deudor')
    return
  }
  if (currentStep.value === 2 && !canProceedStep2()) {
    toast.error('Completa monto, plazo y agencia')
    return
  }
  if (currentStep.value < 3) currentStep.value++
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
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
      <Button variant="outline" @click="router.push('/radicacion')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <!-- Stepper -->
    <div class="flex items-center gap-2">
      <div
        v-for="step in steps"
        :key="step.num"
        class="flex items-center gap-2"
      >
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors"
          :class="currentStep === step.num
            ? 'bg-primary text-primary-foreground'
            : currentStep > step.num
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'"
        >
          {{ step.num }}
        </div>
        <span
          class="text-sm font-medium hidden sm:inline"
          :class="currentStep === step.num ? 'text-foreground' : 'text-muted-foreground'"
        >
          {{ step.title }}
        </span>
        <Icon
          v-if="step.num < 3"
          name="i-lucide-chevron-right"
          class="h-4 w-4 text-muted-foreground"
        />
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ steps[currentStep - 1]?.title ?? '' }}</CardTitle>
        <CardDescription>
          {{ currentStep === 1
            ? 'Busca por cédula o completa el formulario del deudor principal'
            : currentStep === 2
              ? 'Monto, plazo y destino del crédito'
              : 'Agrega codeudores si aplica' }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Paso 1: Deudor -->
        <div v-if="currentStep === 1" class="space-y-4">
          <ApplicantFormFields
            v-model="form.debtor"
            :show-search="true"
            :loading-search="loadingSearch"
            @search="searchApplicant"
          />
        </div>

        <!-- Paso 2: Solicitud -->
        <div v-else-if="currentStep === 2" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="space-y-1.5">
            <Label for="amount">Monto solicitado * (COP)</Label>
            <Input
              id="amount"
              :model-value="formatPesos(form.amount_requested)"
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

        <!-- Paso 3: Codeudores -->
        <div v-else-if="currentStep === 3" class="space-y-6">
          <div class="flex items-center justify-between">
            <p class="text-sm text-muted-foreground">
              Agrega codeudores si el crédito lo requiere
            </p>
            <Button type="button" variant="outline" size="sm" @click="addCoDebtor">
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
                variant="ghost"
                size="icon"
                class="absolute right-2 top-3 h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Eliminar codeudor"
                @click="removeCoDebtor(idx)"
              >
                <Icon name="i-lucide-trash" class="h-4 w-4" />
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
                    :show-co-debtor-concept="true"
                    @update:model-value="form.co_debtors[idx] = $event"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <!-- Navegación -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
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
              v-if="currentStep < 3"
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
              @click="saveDraft"
            >
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar borrador
            </Button>
            <Button
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
