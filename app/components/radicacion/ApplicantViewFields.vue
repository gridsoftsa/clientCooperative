<script setup lang="ts">
const props = defineProps<{
  applicant: any
  documents?: any[]
  applicationId: number
}>()

const { formatPesos } = usePesosFormat()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000'

function fullName(a: any): string {
  return [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean).join(' ') || '-'
}

function cityName(a: any): string {
  return a.residence_city?.name ?? a.residenceCity?.name ?? '-'
}

function getDownloadUrl(documentId: number): string {
  return `${apiBase}/api/credit-applications/${props.applicationId}/documents/${documentId}/download`
}

const financial = computed(() => props.applicant?.financial_info || {})
const income = computed(() => financial.value.income || {})
const expenses = computed(() => financial.value.expenses || {})
const solvency = computed(() => financial.value.solvency || {})
const incomeTotal = computed(() =>
  (income.value.salary ?? 0) + (income.value.pension ?? 0) + (income.value.business ?? income.value.crops ?? 0)
)
const expensesTotal = computed(() =>
  (expenses.value.personal ?? 0) + (expenses.value.food ?? 0) + (expenses.value.rent ?? expenses.value.services ?? 0)
)

const sectionClass = 'space-y-3'
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2'
const fieldClass = 'space-y-1'
const labelClass = 'text-xs font-medium text-muted-foreground'
</script>

<template>
  <div class="flex flex-col gap-8">
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Documento de identidad</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <p :class="labelClass">Tipo documento</p>
          <p>{{ applicant.document_type || '-' }}</p>
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
          <p>{{ applicant.gender || '-' }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Estado civil</p>
          <p>{{ applicant.marital_status || '-' }}</p>
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
          <p>{{ applicant.residence_type || '-' }}</p>
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
          <p>{{ financial.activity_type || '-' }}</p>
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
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <p :class="labelClass">Ingreso salario</p>
          <p>{{ formatPesos(income.salary) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Ingreso pensión</p>
          <p>{{ formatPesos(income.pension) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Ingreso cultivos/negocio</p>
          <p>{{ formatPesos(income.business ?? income.crops) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Total ingresos</p>
          <p class="font-medium">{{ formatPesos(incomeTotal) }}</p>
        </div>
        <div v-if="income.description" class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <p :class="labelClass">Descripción ingresos</p>
          <p class="whitespace-pre-wrap">{{ income.description }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Gastos personales</p>
          <p>{{ formatPesos(expenses.personal) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Gastos alimentación</p>
          <p>{{ formatPesos(expenses.food) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Gastos servicios/arriendo</p>
          <p>{{ formatPesos(expenses.rent ?? expenses.services) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Total gastos</p>
          <p class="font-medium">{{ formatPesos(expensesTotal) }}</p>
        </div>
        <div v-if="expenses.description" class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <p :class="labelClass">Descripción gastos</p>
          <p class="whitespace-pre-wrap">{{ expenses.description }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Activos totales</p>
          <p>{{ formatPesos(solvency.assets) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Pasivos totales</p>
          <p>{{ formatPesos(solvency.liabilities) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Bien raíz valor</p>
          <p>{{ formatPesos(solvency.real_estate) }}</p>
        </div>
        <div :class="fieldClass">
          <p :class="labelClass">Endeudamiento (ratio)</p>
          <p>{{ solvency.debt_ratio != null ? solvency.debt_ratio : '-' }}</p>
        </div>
        <div v-if="financial.assets?.[0]?.description" class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <p :class="labelClass">Descripción propiedades</p>
          <p class="whitespace-pre-wrap">{{ financial.assets[0].description }}</p>
        </div>
        <div v-if="financial.assets?.[0]?.value != null" :class="fieldClass">
          <p :class="labelClass">Valor propiedades</p>
          <p>{{ formatPesos(financial.assets[0].value) }}</p>
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

    <section v-if="documents?.length" :class="sectionClass">
      <h3 :class="sectionTitleClass">Documentos adjuntos</h3>
      <div class="flex flex-wrap gap-2">
        <a
          v-for="doc in documents"
          :key="doc.id"
          :href="getDownloadUrl(doc.id)"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
        >
          <Icon name="i-lucide-file-text" class="h-4 w-4" />
          {{ doc.title || doc.original_name || 'Documento' }}
        </a>
      </div>
    </section>
  </div>
</template>
