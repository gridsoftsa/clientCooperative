<script setup lang="ts">
const props = defineProps<{
  applicant: any
  documents?: any[]
  applicationId: number
  /** Monto solicitado del crédito (para recalcular solvencia/endeudamiento en vista) */
  amountRequested?: number
}>()

const { formatPesosConSimbolo } = usePesosFormat()
const { downloadDocument } = useDocumentDownload()
const downloadingId = ref<number | null>(null)

function fullName(a: any): string {
  return [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean).join(' ') || '-'
}

function cityName(a: any): string {
  if (typeof a.residence_city_name === 'string' && a.residence_city_name.trim()) return a.residence_city_name
  return a.residence_city?.name ?? a.residenceCity?.name ?? '-'
}

async function handleDownload(doc: { id: number; title?: string; original_name?: string }) {
  if (downloadingId.value) return
  downloadingId.value = doc.id
  try {
    await downloadDocument(
      props.applicationId,
      doc.id,
      doc.title || doc.original_name || 'documento',
    )
  } catch (e) {
    console.error('Error descargando:', e)
    const { toast } = await import('vue-sonner')
    toast.error('No se pudo descargar el documento. Verifica tu sesión.')
  } finally {
    downloadingId.value = null
  }
}

const financial = computed(() => props.applicant?.financial_info || {})
const income = computed(() => financial.value.income || {})
const expenses = computed(() => financial.value.expenses || {})
const solvency = computed(() => financial.value.solvency || {})

const amountForMetrics = computed(() => Number(props.amountRequested) || 0)

/** (Pasivos + monto) ÷ Activos × 100 */
const solvenciaDisplayPct = computed(() => {
  const pasivos = solvency.value.liabilities ?? 0
  const activos = assetsList.value.length ? assetsTotal.value : (solvency.value.assets ?? 0)
  const monto = amountForMetrics.value
  if (!activos || activos <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / activos) * 100 * 100) / 100
})

/** (Pasivos + monto) ÷ Bien raíz × 100 */
const endeudamientoDisplayPct = computed(() => {
  const pasivos = solvency.value.liabilities ?? 0
  const br = solvency.value.real_estate ?? 0
  const monto = amountForMetrics.value
  if (!br || br <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / br) * 100 * 100) / 100
})
const assetsList = computed(() => financial.value.assets ?? [])
const assetsTotal = computed(() =>
  assetsList.value.reduce((sum: number, a: { value?: number | null }) => sum + (a.value ?? 0), 0)
)
const incomeTotal = computed(() =>
  (income.value.salary ?? 0) + (income.value.pension ?? 0) + (income.value.business ?? income.value.crops ?? 0)
    + (income.value.rental ?? 0) + (income.value.other ?? 0)
)
const expensesTotal = computed(() =>
  (expenses.value.personal ?? 0) + (expenses.value.food ?? 0) + (expenses.value.rent ?? expenses.value.services ?? 0)
    + (expenses.value.health ?? 0) + (expenses.value.pension ?? 0) + (expenses.value.arl ?? 0) + (expenses.value.other ?? 0)
)

const sectionClass = 'space-y-3'
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2'
const fieldClass = 'space-y-1'
const labelClass = 'text-xs font-medium text-muted-foreground'

const { labelForValue: genderLabel, fetchOptions: fetchGenderOptions } = useGenderCatalogOptions()
const { labelForValue: documentTypeLabel, fetchOptions: fetchDocumentTypeOptions } = useTemplateFlatCatalogOptions('tipo-documento', [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
])
const { labelForValue: residenceTypeLabel, fetchOptions: fetchResidenceTypeOptions } = useTemplateFlatCatalogOptions('tipo-vivienda', [
  { value: 'Propia', label: 'Propia' },
  { value: 'Familiar', label: 'Familiar' },
  { value: 'Arriendo', label: 'Arriendo' },
])
const { labelForValue: maritalStatusLabel, fetchOptions: fetchMaritalStatusOptions } = useTemplateFlatCatalogOptions('estado-civil', [
  { value: 'Soltero', label: 'Soltero(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Union Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viudo', label: 'Viudo(a)' },
])
const { labelForValue: economicActivityLabel, fetchOptions: fetchEconomicActivityOptions } = useTemplateFlatCatalogOptions('actividad-economica', [
  { value: 'Empleado formal', label: 'Empleado formal' },
  { value: 'Independiente', label: 'Independiente' },
  { value: 'Pensionado', label: 'Pensionado' },
  { value: 'Otro', label: 'Otro' },
])

onMounted(() => {
  void Promise.all([
    fetchGenderOptions(),
    fetchDocumentTypeOptions(),
    fetchResidenceTypeOptions(),
    fetchMaritalStatusOptions(),
    fetchEconomicActivityOptions(),
  ])
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Documento de identidad</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <p :class="labelClass">Tipo documento</p>
          <p>{{ documentTypeLabel(applicant.document_type) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Número documento</p>
          <p>{{ applicant.document_number || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Fecha expedición</p>
          <p>{{ applicant.expedition_date ? new Date(applicant.expedition_date).toLocaleDateString('es-CO') : '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Lugar expedición</p>
          <p>{{ applicant.expedition_place || '-' }}</p>
        </div>
      </div>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Datos personales</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <p :class="labelClass">Nombre completo</p>
          <p>{{ fullName(applicant) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Fecha nacimiento</p>
          <p>{{ applicant.birth_date ? new Date(applicant.birth_date).toLocaleDateString('es-CO') : '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Género</p>
          <p>{{ genderLabel(applicant.gender) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Estado civil</p>
          <p>{{ maritalStatusLabel(applicant.marital_status) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Personas a cargo</p>
          <p>{{ applicant.dependents ?? '-' }}</p>
        </div>
      </div>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Contacto</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <p :class="labelClass">Celular</p>
          <p>{{ applicant.mobile_phone || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Teléfono fijo</p>
          <p>{{ applicant.landline || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Email</p>
          <p>{{ applicant.email || '-' }}</p>
        </div>
      </div>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Dirección y residencia</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="sm:col-span-2 lg:col-span-3" :class="fieldClass">
          <p :class="labelClass">Dirección</p>
          <p>{{ applicant.residence_address || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Ciudad</p>
          <p>{{ cityName(applicant) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Tipo vivienda</p>
          <p>{{ residenceTypeLabel(applicant.residence_type) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Tiempo en residencia</p>
          <p>{{ applicant.time_in_residence || '-' }}</p>
        </div>
      </div>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Actividad económica</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <p :class="labelClass">Tipo actividad</p>
          <p>{{ economicActivityLabel(financial.activity_type) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Ocupación</p>
          <p>{{ applicant.occupation || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Empresa</p>
          <p>{{ applicant.company_name || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Cargo</p>
          <p>{{ applicant.position || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Tipo contrato</p>
          <p>{{ applicant.contract_type || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Tiempo en el trabajo</p>
          <p>{{ applicant.time_in_job || '-' }}</p>
        </div>
      </div>
    </section>

    <section v-if="financial.concept" :class="sectionClass">
      <h3 :class="sectionTitleClass">Concepto codeudor</h3>
      <p>{{ financial.concept }}</p>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Datos financieros</h3>

      <div class="mb-6 flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:justify-center">
        <!-- Ingresos (tabla) -->
        <div class="flex flex-col">
          <h4 class="mb-2 text-sm font-semibold text-foreground">Ingresos</h4>
          <div class="flex-1 overflow-hidden rounded-lg border border-border sm:w-fit sm:max-w-sm">
        <table class="w-full table-fixed text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/40">
              <th class="w-44 px-3 py-2.5 text-left font-medium text-foreground">Concepto</th>
              <th class="w-36 px-3 py-2.5 text-right font-medium text-foreground">Valor (COP)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso salario</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(income.salary) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso pensión</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(income.pension) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso cultivos/negocio</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(income.business ?? income.crops) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso arriendos</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(income.rental) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingresos otros</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(income.other) }}</td>
            </tr>
            <tr class="border-t-2 border-border bg-muted/30 font-semibold">
              <td class="px-3 py-3 text-foreground">Total ingresos</td>
              <td class="px-3 py-3 text-right">{{ formatPesosConSimbolo(incomeTotal) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="income.description" class="border-t border-border px-3 py-2" :class="fieldClass">
          <p :class="labelClass">Descripción ingresos</p>
          <p class="whitespace-pre-wrap text-sm">{{ income.description }}</p>
        </div>
          </div>
        </div>

        <!-- Gastos (tabla) -->
        <div class="flex flex-col">
          <h4 class="mb-2 text-sm font-semibold text-foreground">Gastos</h4>
          <div class="flex-1 overflow-hidden rounded-lg border border-border sm:w-fit sm:max-w-sm">
        <table class="w-full table-fixed text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/40">
              <th class="w-44 px-3 py-2.5 text-left font-medium text-foreground">Concepto</th>
              <th class="w-36 px-3 py-2.5 text-right font-medium text-foreground">Valor (COP)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Gastos personales</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.personal) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Gastos alimentación</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.food) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Gastos servicios/arriendo</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.rent ?? expenses.services) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Salud</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.health) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Pensión</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.pension) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">ARL</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.arl) }}</td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Otros</td>
              <td class="px-3 py-2.5 text-right">{{ formatPesosConSimbolo(expenses.other) }}</td>
            </tr>
            <tr class="border-t-2 border-border bg-muted/30 font-semibold">
              <td class="px-3 py-3 text-foreground">Total gastos</td>
              <td class="px-3 py-3 text-right">{{ formatPesosConSimbolo(expensesTotal) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="expenses.description" class="border-t border-border px-3 py-2" :class="fieldClass">
          <p :class="labelClass">Descripción gastos</p>
          <p class="whitespace-pre-wrap text-sm">{{ expenses.description }}</p>
        </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div :class="fieldClass">
          <p :class="labelClass">Solvencia</p>
          <p>{{ solvenciaDisplayPct != null ? `${solvenciaDisplayPct.toFixed(2)} %` : '—' }}</p>
          <p class="text-[10px] text-muted-foreground">(Pasivos + monto solicitado) ÷ Activos</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Endeudamiento</p>
          <p>{{ endeudamientoDisplayPct != null ? `${endeudamientoDisplayPct.toFixed(2)} %` : '—' }}</p>
          <p class="text-[10px] text-muted-foreground">(Pasivos + monto solicitado) ÷ Bien raíz</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Total activos</p>
          <p>{{ formatPesosConSimbolo(assetsList.length ? assetsTotal : solvency.assets) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Pasivos totales</p>
          <p>{{ formatPesosConSimbolo(solvency.liabilities) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Bien raíz valor</p>
          <p>{{ formatPesosConSimbolo(solvency.real_estate) }}</p>
        </div>
        <div v-if="assetsList.length" class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <p :class="labelClass">Activos reportados</p>
          <div class="space-y-2">
            <div
              v-for="(asset, i) in assetsList"
              :key="i"
              class="rounded-lg border border-border p-3"
            >
              <p class="font-medium">{{ asset.name || (asset as any).description || 'Sin nombre' }}</p>
              <p class="text-sm text-muted-foreground">
                Valor: {{ formatPesosConSimbolo(asset.value) }}
                <template v-if="asset.matricula_inmobiliaria">
                  · Matrícula: {{ asset.matricula_inmobiliaria }}
                </template>
                <template v-if="(asset as any).garantia">
                  · <span class="font-medium text-primary">Garantía</span>
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="(applicant.references ?? []).length" :class="sectionClass">
      <h3 :class="sectionTitleClass">Referencias</h3>
      <div class="space-y-2">
        <div
          v-for="(ref, i) in applicant.references"
          :key="i"
          class="rounded-lg border border-border p-3"
        >
          <p class="font-medium">{{ ref.name || 'Sin nombre' }}</p>
          <p class="text-sm text-muted-foreground">{{ ref.relationship }} - {{ ref.phone }}</p>
        </div>
      </div>
    </section>

    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Documentos adjuntos</h3>
      <div v-if="documents?.length" class="flex flex-wrap gap-2">
        <Button
          v-for="doc in documents"
          :key="doc.id"
          variant="outline"
          size="sm"
          class="h-auto gap-2 py-2"
          :disabled="downloadingId === doc.id"
          @click="handleDownload(doc)"
        >
          <Icon
            :name="downloadingId === doc.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
            class="h-4 w-4 shrink-0"
            :class="{ 'animate-spin': downloadingId === doc.id }"
          />
          {{ doc.title || doc.original_name || 'Documento' }}
          <Icon name="i-lucide-download" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        Ningún documento adjunto
      </p>
    </section>
  </div>
</template>
