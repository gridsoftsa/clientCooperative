<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { ApplicantForm, ApplicantDocumentForm, FinancialInfoForm } from '~/types/credit-application'

const props = withDefaults(
  defineProps<{
    modelValue: ApplicantForm
    showSearch?: boolean
    loadingSearch?: boolean
    /** Muestra campo "Concepto" (ej. Codeudor bien raíz) para codeudores */
    showCoDebtorConcept?: boolean
    /** Oculta la sección Datos financieros (ej. cuando está en paso separado) */
    hideFinancialSection?: boolean
    /** Muestra solo la sección Datos financieros (para paso dedicado) */
    showOnlyFinancial?: boolean
    /** Modo solo lectura (sin edición) */
    readOnlyForm?: boolean
    /**
     * Si true, «Ingreso cultivos/negocio» no se edita a mano: lo calculan las plantillas de actividad económica.
     */
    incomeBusinessReadonly?: boolean
    onSearch?: () => void
  }>(),
  { readOnlyForm: false, incomeBusinessReadonly: true },
)

const emit = defineEmits<{
  'update:modelValue': [ApplicantForm]
  /** Clic/Enter en «Buscar» (los padres suelen vincular con @search) */
  search: []
}>()

function runSearch() {
  emit('search')
  props.onSearch?.()
}

const local = computed({
  get: () => props.modelValue,
  set: (v: ApplicantForm) => emit('update:modelValue', v),
})

/** Actualiza un campo del solicitante y emite al padre (evita problemas de mutación/reactividad). */
function updateField<K extends keyof ApplicantForm>(key: K, value: ApplicantForm[K] | string | number | unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value as ApplicantForm[K] })
}

const financial = computed({
  get: () => (props.modelValue.financial_info || {}) as FinancialInfoForm,
  set: (v: FinancialInfoForm) => emit('update:modelValue', { ...props.modelValue, financial_info: v }),
})

function setFinancial<K extends keyof FinancialInfoForm>(key: K, value: FinancialInfoForm[K]) {
  financial.value = { ...financial.value, [key]: value }
}

const { multiselectOptionsByLabel } = useMunicipalities()
const { options: genderOptions, fetchOptions: fetchGenderOptions } = useGenderCatalogOptions()
const { options: documentTypeOptions, fetchOptions: fetchDocumentTypeOptions } = useTemplateFlatCatalogOptions('tipo-documento', [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
])
const { options: residenceTypeOptions, fetchOptions: fetchResidenceTypeOptions } = useTemplateFlatCatalogOptions('tipo-vivienda', [
  { value: 'Propia', label: 'Propia' },
  { value: 'Familiar', label: 'Familiar' },
  { value: 'Arriendo', label: 'Arriendo' },
])
const { options: maritalStatusOptions, fetchOptions: fetchMaritalStatusOptions } = useTemplateFlatCatalogOptions('estado-civil', [
  { value: 'Soltero', label: 'Soltero(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Union Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viudo', label: 'Viudo(a)' },
])
const { options: economicActivityOptions, fetchOptions: fetchEconomicActivityOptions } = useTemplateFlatCatalogOptions('actividad-economica', [
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

const coDebtorConcepts = [
  { value: 'Bien raíz', label: 'Codeudor bien raíz' },
  { value: 'Solidario', label: 'Solidario' },
  { value: 'Otro', label: 'Otro' },
]

const sectionClass = 'space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-1'
const fieldClass = 'space-y-1.5'

/** Restringe input a solo dígitos (documento, teléfonos). */
function onDigitsOnlyInput(e: Event, setValue: (v: string) => void) {
  const el = e.target as HTMLInputElement
  const filtered = el.value.replace(/\D/g, '')
  setValue(filtered)
  el.value = filtered
}

/** Evita teclas no numéricas en inputs type="number" (e, E, +, -). Opcional: bloquear punto para enteros. */
function onKeydownNumeric(e: KeyboardEvent, allowDecimal = false) {
  if (['e', 'E', '+', '-'].includes(e.key) || (!allowDecimal && e.key === '.')) {
    e.preventDefault()
  }
}

const { formatPesosConSimbolo, parsePesosInput } = usePesosFormat()

/** En inputs de pesos: solo permite dígitos, punto y coma. Permite teclas de control (borrar, flechas, etc.). */
function onKeydownPesosOnly(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) return
  const key = e.key
  if (key == null || key === '' || ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
  if (key.length === 1 && !/[\d.,]/.test(key)) e.preventDefault()
}

/** Cultivos/negocio: solo lectura si el formulario es readonly o si viene fijado por plantillas. */
const incomeBusinessInputReadonly = computed(
  () => props.readOnlyForm || props.incomeBusinessReadonly,
)

/** Total ingresos = salario + pensión + cultivos/negocio + arriendos + otros (para mostrar en input readonly). */
const incomeTotalDisplay = computed(() => {
  const inc = financial.value.income
  return (inc?.salary ?? 0) + (inc?.pension ?? 0) + (inc?.business ?? 0) + (inc?.rental ?? 0) + (inc?.other ?? 0)
})

/** Total gastos = personales + alimentación + servicios/arriendo + salud + pensión + ARL + otros (para mostrar en input readonly). */
const expensesTotalDisplay = computed(() => {
  const exp = financial.value.expenses
  return (exp?.personal ?? 0) + (exp?.food ?? 0) + (exp?.rent ?? 0) + (exp?.health ?? 0) + (exp?.pension ?? 0) + (exp?.arl ?? 0) + (exp?.other ?? 0)
})

/** Lista de activos (permite agregar/remover). */
const assetsList = computed({
  get: () => financial.value.assets ?? [],
  set: (v) => setFinancial('assets', v),
})

/** Total de activos (suma de valores). */
const assetsTotalDisplay = computed(() => {
  const list = assetsList.value ?? []
  return list.reduce((sum, a) => sum + (a.value ?? 0), 0)
})

function addAsset() {
  assetsList.value = [...(assetsList.value ?? []), { name: '', value: undefined, matricula_inmobiliaria: '', garantia: false }]
}

function removeAsset(index: number) {
  const next = [...(assetsList.value ?? [])]
  next.splice(index, 1)
  assetsList.value = next
}

function updateAsset(index: number, field: 'name' | 'value' | 'matricula_inmobiliaria' | 'garantia', value: string | number | boolean | undefined) {
  const next = [...(assetsList.value ?? [])]
  const current = next[index] ?? {}
  next[index] = { ...current, [field]: value }
  assetsList.value = next
}

/** Nombre legado `description` en algunos datos; `as` en template rompe vue-tsc. */
function assetNameForInput(asset: { name?: string, description?: string }): string {
  return asset.name ?? asset.description ?? ''
}

/** Suma de activos marcados como garantía → Bien raíz (se muestra en el input y se sincroniza a solvency). */
const bienRaizFromGarantias = computed(() => {
  const list = assetsList.value ?? []
  return list.reduce((sum, a) => (a.garantia ? sum + (a.value ?? 0) : sum), 0)
})

watch(bienRaizFromGarantias, (v) => {
  setFinancial('solvency', { ...(financial.value.solvency || {}), real_estate: v })
}, { immediate: true })

const documents = computed({
  get: () => props.modelValue.documents ?? [],
  set: (v: ApplicantDocumentForm[]) => emit('update:modelValue', { ...props.modelValue, documents: v }),
})

function addDocument() {
  documents.value = [...(documents.value || []), { title: '', file: undefined }]
}

function removeDocument(index: number) {
  documents.value = documents.value.filter((_, i) => i !== index)
}

function updateDocument(index: number, updates: Partial<ApplicantDocumentForm>) {
  const next = [...documents.value]
  const current = next[index] ?? { title: '', file: undefined }
  next[index] = { title: current.title ?? '', file: current.file, ...updates }
  documents.value = next
}

function onDocumentFileChange(index: number, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const { valid, message } = validateDocumentFile(file)
  if (!valid) {
    toast.error(message)
    return
  }
  updateDocument(index, { file })
}

function onDocumentDrop(index: number, e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const { valid, message } = validateDocumentFile(file)
  if (!valid) {
    toast.error(message)
    return
  }
  updateDocument(index, { file })
}

function onDocumentDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const VALID_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

function validateDocumentFile(file: File): { valid: boolean; message: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: `El archivo "${file.name}" supera el límite de 10 MB. Por favor, sube uno más pequeño.` }
  }
  if (!VALID_MIMES.includes(file.type)) {
    return { valid: false, message: 'Archivo no válido. Use PDF, JPG, PNG o DOC.' }
  }
  return { valid: true, message: '' }
}

function isValidFile(file: File): boolean {
  return validateDocumentFile(file).valid
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Búsqueda por cédula (solo para deudor) -->
    <section v-if="!showOnlyFinancial && showSearch && !readOnlyForm" :class="sectionClass">
      <h3 :class="sectionTitleClass">Buscar por documento</h3>
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <div class="flex flex-wrap items-end gap-3">
          <div :class="fieldClass" class="min-w-0 flex-1 sm:max-w-[280px]">
            <Input
              id="search_doc"
              v-model="local.document_number"
              placeholder="Ej: 1234567890"
              inputmode="numeric"
              autocomplete="off"
              class="h-9 w-full"
              @input="onDigitsOnlyInput($event, v => (local.document_number = v))"
              @keyup.enter="runSearch"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="default"
            class="h-9 shrink-0"
            :disabled="loadingSearch || !local.document_number?.trim()"
            @click="runSearch"
          >
            <Icon v-if="loadingSearch" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            <Icon v-else name="i-lucide-search" class="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>
    </section>

    <!-- Documento de identidad -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Documento de identidad</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <Label for="doc_type">Tipo documento *</Label>
          <Multiselect
            id="doc_type"
            :model-value="local.document_type ? local.document_type : null"
            :options="documentTypeOptions"
            :disabled="readOnlyForm"
            mode="single"
            value-prop="value"
            label="label"
            :searchable="true"
            :can-clear="false"
            placeholder="Seleccionar"
            no-options-text="Sin opciones. Configura «Tipo de documento» en Parametrización → Radicación."
            no-results-text="Sin coincidencias"
            class="multiselect-municipality"
            @update:model-value="updateField('document_type', ($event != null && $event !== '') ? String($event) : '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="doc_number">Número documento *</Label>
          <Input
            id="doc_number"
            :model-value="local.document_number"
            placeholder="Ej: 1234567890"
            inputmode="numeric"
            :disabled="readOnlyForm"
            :readonly="readOnlyForm"
            @input="onDigitsOnlyInput($event, v => updateField('document_number', v))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_date">Fecha expedición</Label>
          <Input
            id="exp_date"
            :model-value="local.expedition_date"
            type="date"
            :disabled="readOnlyForm"
            @update:model-value="updateField('expedition_date', $event ?? '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_place">Lugar de expedición</Label>
          <Multiselect
            :model-value="local.expedition_place ?? null"
            :options="multiselectOptionsByLabel"
            :disabled="readOnlyForm"
            value-prop="value"
            label="label"
            :searchable="true"
            :strict="false"
            placeholder="Municipio"
            no-options-text="No hay municipios"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="updateField('expedition_place', ($event as string) ?? '')"
          />
        </div>
      </div>
    </section>

    <!-- Nombres y datos personales -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Datos personales</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="first_name">Primer nombre *</Label>
          <Input
            id="first_name"
            :model-value="local.first_name"
            placeholder="Ej: Juan"
            :disabled="readOnlyForm"
            @update:model-value="updateField('first_name', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="second_name">Segundo nombre</Label>
          <Input
            id="second_name"
            :model-value="local.second_name"
            placeholder="Ej: Carlos"
            :disabled="readOnlyForm"
            @update:model-value="updateField('second_name', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="first_last">Primer apellido *</Label>
          <Input
            id="first_last"
            :model-value="local.first_last_name"
            placeholder="Ej: Pérez"
            :disabled="readOnlyForm"
            @update:model-value="updateField('first_last_name', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="second_last">Segundo apellido</Label>
          <Input
            id="second_last"
            :model-value="local.second_last_name"
            placeholder="Ej: Gómez"
            :disabled="readOnlyForm"
            @update:model-value="updateField('second_last_name', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="birth_date">Fecha nacimiento</Label>
          <Input
            id="birth_date"
            :model-value="local.birth_date"
            type="date"
            :disabled="readOnlyForm"
            @update:model-value="updateField('birth_date', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="gender">Género</Label>
          <Multiselect
            id="gender"
            :model-value="local.gender ? local.gender : null"
            :options="genderOptions"
            :disabled="readOnlyForm"
            mode="single"
            value-prop="value"
            label="label"
            :searchable="true"
            :can-clear="true"
            placeholder="Seleccionar"
            no-options-text="Sin opciones. Configura «Género» en Parametrización → Radicación."
            no-results-text="Sin coincidencias"
            class="multiselect-municipality"
            @update:model-value="updateField('gender', ($event != null && $event !== '') ? String($event) : '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="marital">Estado civil</Label>
          <Multiselect
            id="marital"
            :model-value="local.marital_status ? local.marital_status : null"
            :options="maritalStatusOptions"
            :disabled="readOnlyForm"
            mode="single"
            value-prop="value"
            label="label"
            :searchable="true"
            :can-clear="true"
            placeholder="Seleccionar"
            no-options-text="Sin opciones. Configura «Estado civil» en Parametrización → Radicación."
            no-results-text="Sin coincidencias"
            class="multiselect-municipality"
            @update:model-value="updateField('marital_status', ($event != null && $event !== '') ? String($event) : '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="dependents">Personas a cargo</Label>
          <Input
            id="dependents"
            :model-value="local.dependents"
            type="number"
            min="0"
            inputmode="numeric"
            :disabled="readOnlyForm"
            @keydown="onKeydownNumeric($event, false)"
            @update:model-value="updateField('dependents', Number($event) ?? 0)"
          />
        </div>
      </div>
    </section>

    <!-- Contacto -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Contacto</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="mobile">Celular</Label>
          <Input
            id="mobile"
            :model-value="local.mobile_phone"
            placeholder="3001234567"
            inputmode="numeric"
            :disabled="readOnlyForm"
            @input="onDigitsOnlyInput($event, v => updateField('mobile_phone', v))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="landline">Teléfono fijo</Label>
          <Input
            id="landline"
            :model-value="local.landline"
            placeholder="6011234567"
            inputmode="numeric"
            :disabled="readOnlyForm"
            @input="onDigitsOnlyInput($event, v => updateField('landline', v))"
          />
        </div>
        <div class="sm:col-span-2 lg:col-span-1" :class="fieldClass">
          <Label for="email">Email</Label>
          <Input
            id="email"
            :model-value="local.email"
            type="email"
            placeholder="correo@ejemplo.com"
            :disabled="readOnlyForm"
            @update:model-value="updateField('email', String($event ?? ''))"
          />
        </div>
      </div>
    </section>

    <!-- Dirección y residencia -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Dirección y residencia</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="sm:col-span-2 lg:col-span-3" :class="fieldClass">
          <Label for="address">Dirección de residencia</Label>
          <Input
            id="address"
            :model-value="local.residence_address"
            placeholder="Calle 123 #45-67, barrio..."
            :disabled="readOnlyForm"
            @update:model-value="updateField('residence_address', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="residence_city">Ciudad / Municipio de residencia</Label>
          <Multiselect
            :model-value="local.residence_city_name ?? null"
            :options="multiselectOptionsByLabel"
            :disabled="readOnlyForm"
            value-prop="value"
            label="label"
            :searchable="true"
            :strict="false"
            placeholder="Municipio"
            no-options-text="No hay municipios"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="updateField('residence_city_name', ($event as string) ?? '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="residence_type">Tipo vivienda</Label>
          <Multiselect
            id="residence_type"
            :model-value="local.residence_type ? local.residence_type : null"
            :options="residenceTypeOptions"
            :disabled="readOnlyForm"
            mode="single"
            value-prop="value"
            label="label"
            :searchable="true"
            :can-clear="true"
            placeholder="Seleccionar"
            no-options-text="Sin opciones. Configura «Tipo de vivienda» en Parametrización → Radicación."
            no-results-text="Sin coincidencias"
            class="multiselect-municipality"
            @update:model-value="updateField('residence_type', ($event != null && $event !== '') ? String($event) : '')"
          />
        </div>
        <div :class="fieldClass">
          <Label for="time_residence">Tiempo en residencia</Label>
          <Input
            id="time_residence"
            :model-value="local.time_in_residence"
            placeholder="Ej: 2 años"
            :disabled="readOnlyForm"
            @update:model-value="updateField('time_in_residence', String($event ?? ''))"
          />
        </div>
      </div>
    </section>

    <!-- Actividad económica -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Actividad económica</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="activity_type">Tipo de actividad económica</Label>
          <Multiselect
            id="activity_type"
            :model-value="financial.activity_type ? financial.activity_type : null"
            :options="economicActivityOptions"
            :disabled="readOnlyForm"
            mode="single"
            value-prop="value"
            label="label"
            :searchable="true"
            :can-clear="true"
            placeholder="Seleccionar (ej. Empleado formal)"
            no-options-text="Sin opciones. Configura «Tipo de actividad económica» en Parametrización → Radicación."
            no-results-text="Sin coincidencias"
            class="multiselect-municipality"
            @update:model-value="setFinancial('activity_type', ($event != null && $event !== '') ? String($event) : undefined)"
          />
        </div>
        <div :class="fieldClass">
          <Label for="occupation">Ocupación</Label>
          <Input
            id="occupation"
            :model-value="local.occupation"
            placeholder="Ej: Comerciante"
            :disabled="readOnlyForm"
            @update:model-value="updateField('occupation', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="company">Empresa</Label>
          <Input
            id="company"
            :model-value="local.company_name"
            placeholder="Nombre empresa"
            :disabled="readOnlyForm"
            @update:model-value="updateField('company_name', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="position">Cargo</Label>
          <Input
            id="position"
            :model-value="local.position"
            placeholder="Ej: Vendedor"
            :disabled="readOnlyForm"
            @update:model-value="updateField('position', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="contract">Tipo contrato</Label>
          <Input
            id="contract"
            :model-value="local.contract_type"
            placeholder="Indefinido, Término fijo..."
            :disabled="readOnlyForm"
            @update:model-value="updateField('contract_type', String($event ?? ''))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="time_job">Tiempo en el trabajo</Label>
          <Input
            id="time_job"
            :model-value="local.time_in_job"
            placeholder="Ej: 3 años"
            :disabled="readOnlyForm"
            @update:model-value="updateField('time_in_job', String($event ?? ''))"
          />
        </div>
      </div>
    </section>

    <!-- Concepto codeudor (solo cuando aplica) -->
    <section v-if="showCoDebtorConcept" :class="sectionClass">
      <h3 :class="sectionTitleClass">Concepto del codeudor</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <div :class="fieldClass">
          <Label for="co_debtor_concept">Concepto</Label>
          <Select
            :model-value="financial.concept ?? null"
            :disabled="readOnlyForm"
            @update:model-value="setFinancial('concept', $event != null ? String($event) : undefined)"
          >
            <SelectTrigger id="co_debtor_concept">
              <SelectValue placeholder="Ej. Codeudor bien raíz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in coDebtorConcepts"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>

    <!-- Datos financieros (ingresos, gastos, solvencia) -->
    <section v-if="showOnlyFinancial || !hideFinancialSection" :class="sectionClass">
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
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.income?.salary)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, salary: n, total: (n ?? 0) + (inc.pension ?? 0) + (inc.business ?? 0) + (inc.rental ?? 0) + (inc.other ?? 0) }; setFinancial('income', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso pensión</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.income?.pension)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, pension: n, total: (inc.salary ?? 0) + (n ?? 0) + (inc.business ?? 0) + (inc.rental ?? 0) + (inc.other ?? 0) }; setFinancial('income', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">
                Ingreso cultivos/negocio
                <span
                  v-if="incomeBusinessInputReadonly && !readOnlyForm"
                  class="mt-0.5 block text-[10px] font-normal leading-tight text-muted-foreground/90"
                >
                  Calculado desde actividad económica
                </span>
              </td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.income?.business)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  title="Valor calculado a partir de las plantillas de actividad económica"
                  :readonly="incomeBusinessInputReadonly"
                  :class="[
                    'h-8 w-full text-right',
                    incomeBusinessInputReadonly ? 'cursor-default bg-muted/50' : '',
                  ]"
                  @keydown="(e: KeyboardEvent) => { if (!incomeBusinessInputReadonly) onKeydownPesosOnly(e) }"
                  @update:model-value="(v) => {
                    if (incomeBusinessInputReadonly) return
                    const inc = financial.income || {}
                    const n = parsePesosInput(String(v))
                    const next = {
                      ...inc,
                      business: n,
                      total: (inc.salary ?? 0) + (inc.pension ?? 0) + (n ?? 0) + (inc.rental ?? 0) + (inc.other ?? 0),
                    }
                    setFinancial('income', next)
                  }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingreso arriendos</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.income?.rental)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, rental: n, total: (inc.salary ?? 0) + (inc.pension ?? 0) + (inc.business ?? 0) + (n ?? 0) + (inc.other ?? 0) }; setFinancial('income', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Ingresos otros</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.income?.other)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, other: n, total: (inc.salary ?? 0) + (inc.pension ?? 0) + (inc.business ?? 0) + (inc.rental ?? 0) + (n ?? 0) }; setFinancial('income', next); }"
                />
              </td>
            </tr>
            <tr class="border-t-2 border-border bg-muted/30 font-semibold">
              <td class="px-3 py-3 text-foreground">Total ingresos</td>
              <td class="px-3 py-3 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(incomeTotalDisplay)"
                  type="text"
                  placeholder="0"
                  readonly
                  class="h-8 w-full text-right font-medium bg-muted/50 cursor-default"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="border-t border-border px-3 py-2" :class="fieldClass">
          <Label class="text-xs">Descripción ingresos</Label>
          <textarea
            :value="financial.income?.description"
            class="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Detalle de ingresos (negocio, cultivos, etc.)"
            rows="2"
            @input="setFinancial('income', { ...(financial.income || {}), description: ($event.target as HTMLTextAreaElement).value })"
          />
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
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.personal)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, personal: n, total: (n ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) + (exp.health ?? 0) + (exp.pension ?? 0) + (exp.arl ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Gastos alimentación</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.food)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, food: n, total: (exp.personal ?? 0) + (n ?? 0) + (exp.rent ?? 0) + (exp.health ?? 0) + (exp.pension ?? 0) + (exp.arl ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Gastos servicios/arriendo</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.rent)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, rent: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (n ?? 0) + (exp.health ?? 0) + (exp.pension ?? 0) + (exp.arl ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Salud</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.health)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, health: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) + (n ?? 0) + (exp.pension ?? 0) + (exp.arl ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Pensión</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.pension)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, pension: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) + (exp.health ?? 0) + (n ?? 0) + (exp.arl ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">ARL</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.arl)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, arl: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) + (exp.health ?? 0) + (exp.pension ?? 0) + (n ?? 0) + (exp.other ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr>
              <td class="px-3 py-2.5 text-muted-foreground">Otros</td>
              <td class="px-3 py-2 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(financial.expenses?.other)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="h-8 w-full text-right"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, other: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) + (exp.health ?? 0) + (exp.pension ?? 0) + (exp.arl ?? 0) + (n ?? 0) }; setFinancial('expenses', next); }"
                />
              </td>
            </tr>
            <tr class="border-t-2 border-border bg-muted/30 font-semibold">
              <td class="px-3 py-3 text-foreground">Total gastos</td>
              <td class="px-3 py-3 text-right">
                <Input
                  :model-value="formatPesosConSimbolo(expensesTotalDisplay)"
                  type="text"
                  placeholder="0"
                  readonly
                  class="h-8 w-full text-right font-medium bg-muted/50 cursor-default"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="border-t border-border px-3 py-2" :class="fieldClass">
          <Label class="text-xs">Descripción gastos</Label>
          <textarea
            :value="financial.expenses?.description"
            class="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Detalle de gastos del hogar"
            rows="2"
            @input="setFinancial('expenses', { ...(financial.expenses || {}), description: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass" class="sm:col-span-2 lg:col-span-4">
          <Label>Total activos (COP)</Label>
          <Input
            :model-value="formatPesosConSimbolo(assetsTotalDisplay)"
            type="text"
            placeholder="0"
            readonly
            class="bg-muted/50 cursor-default"
          />
        </div>
        <div :class="fieldClass">
          <Label>Pasivos totales (COP)</Label>
          <Input
            :model-value="formatPesosConSimbolo(financial.solvency?.liabilities)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => setFinancial('solvency', { ...(financial.solvency || {}), liabilities: parsePesosInput(String(v)) })"
          />
        </div>
        <div :class="fieldClass">
          <Label>Bien raíz (COP)</Label>
          <Input
            :model-value="formatPesosConSimbolo(bienRaizFromGarantias)"
            type="text"
            placeholder="0"
            readonly
            class="bg-muted/50 cursor-default"
            title="Suma de valores de activos marcados como garantía para pagar el crédito"
          />
          <p class="text-[10px] text-muted-foreground">
            Suma de activos marcados como garantía para el crédito
          </p>
        </div>
        <div class="sm:col-span-2 lg:col-span-4 flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Activos reportados</Label>
              <p class="text-[10px] text-muted-foreground">
                Marca "Garantía" en los activos que se darán en garantía para el crédito
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Bien raíz:</span>
              <span class="font-semibold">{{ formatPesosConSimbolo(bienRaizFromGarantias ?? 0) }}</span>
            </div>
            <Button v-if="!readOnlyForm" type="button" variant="outline" size="sm" @click="addAsset">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Agregar activo
            </Button>
          </div>
          <div v-if="!(assetsList?.length)" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay activos. Haz clic en "Agregar activo" para registrar propiedades, inversiones, etc.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(asset, idx) in assetsList"
              :key="idx"
              class="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4"
            >
              <div :class="fieldClass" class="min-w-0 flex-1 sm:min-w-[200px]">
                <Label :for="`asset_name_${idx}`">Nombre del activo</Label>
                <Input
                  :id="`asset_name_${idx}`"
                  :model-value="assetNameForInput(asset)"
                  placeholder="Ej: Casa, Lote, Vehículo..."
                  @update:model-value="updateAsset(idx, 'name', $event ?? '')"
                />
              </div>
              <div :class="fieldClass" class="min-w-0 flex-1 sm:max-w-[180px]">
                <Label :for="`asset_value_${idx}`">Valor (COP)</Label>
                <Input
                  :id="`asset_value_${idx}`"
                  :model-value="formatPesosConSimbolo(asset.value)"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="(v) => updateAsset(idx, 'value', parsePesosInput(String(v)))"
                />
              </div>
              <div :class="fieldClass" class="min-w-0 flex-1 sm:max-w-[200px]">
                <Label :for="`asset_matricula_${idx}`">Matrícula inmobiliaria</Label>
                <Input
                  :id="`asset_matricula_${idx}`"
                  :model-value="asset.matricula_inmobiliaria ?? ''"
                  placeholder="Ej: 001-123456"
                  @update:model-value="updateAsset(idx, 'matricula_inmobiliaria', $event ?? '')"
                />
              </div>
              <div :class="fieldClass" class="flex min-w-0 flex-1 flex-col items-center sm:max-w-[140px]">
                <Label :for="`asset_garantia_${idx}`" class="cursor-pointer text-sm font-medium">
                  Garantía
                </Label>
                <div class="flex w-full justify-center pt-1">
                  <Checkbox
                    :id="`asset_garantia_${idx}`"
                    :model-value="!!asset.garantia"
                    @update:model-value="updateAsset(idx, 'garantia', !!$event)"
                  />
                </div>
                <p class="text-[10px] text-muted-foreground text-center">
                  Marcar si se dará en garantía
                </p>
              </div>
              <Button
                v-if="!readOnlyForm"
                type="button"
                variant="destructive"
                size="sm"
                class="h-9 shrink-0 gap-1.5 px-2.5"
                title="Eliminar activo"
                @click="removeAsset(idx)"
              >
                <Icon name="i-lucide-trash" class="h-4 w-4 shrink-0" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Documentos adjuntos (deudor y codeudores) -->
    <section v-if="!showOnlyFinancial && (showSearch || showCoDebtorConcept)" class="space-y-3">
      <h3 :class="sectionTitleClass">Documentos adjuntos</h3>
      <p class="text-xs text-muted-foreground">
        Adjunte documentos con título descriptivo. Formatos: PDF, JPG, PNG, DOC, DOCX. Máx. 10 MB cada uno.
      </p>
      <div class="space-y-3">
        <div
          v-for="(doc, idx) in documents"
          :key="idx"
          class="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-3"
        >
          <div :class="fieldClass" class="flex min-w-0 flex-1 flex-col justify-center sm:max-w-[220px]">
            <Label :for="`doc_title_${idx}`" class="block text-center">Título del documento *</Label>
            <Input
              :id="`doc_title_${idx}`"
              :model-value="doc.title"
              placeholder="Ej: Cédula, Certificado laboral..."
              @update:model-value="updateDocument(idx, { title: String($event ?? '') })"
            />
          </div>
          <div :class="fieldClass" class="min-w-0 flex-1 sm:basis-0">
            <Label :for="`doc_file_${idx}`" class="block text-center">Archivo</Label>
            <input
              :id="`doc_file_${idx}`"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              class="sr-only"
              @change="onDocumentFileChange(idx, $event)"
            >
            <label
              :for="`doc_file_${idx}`"
              class="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              @dragover="onDocumentDragOver"
              @drop="onDocumentDrop(idx, $event)"
            >
              <template v-if="doc.file">
                <Icon name="i-lucide-file-check" class="h-8 w-8 text-green-600 dark:text-green-500" />
                <span class="max-w-full truncate text-center text-sm font-medium text-foreground">
                  {{ doc.file.name }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ formatFileSize(doc.file.size) }}
                </span>
                <span class="text-xs text-primary">Clic para cambiar</span>
              </template>
              <template v-else-if="doc.original_name">
                <Icon name="i-lucide-file-text" class="h-8 w-8 text-primary" />
                <span class="max-w-full truncate text-center text-sm font-medium text-foreground">
                  {{ doc.original_name }}
                </span>
                <span class="text-xs text-muted-foreground">Archivo existente</span>
                <span class="text-xs text-primary">Clic para reemplazar</span>
              </template>
              <template v-else>
                <Icon name="i-lucide-upload" class="h-8 w-8 text-muted-foreground" />
                <span class="text-center text-sm font-medium text-muted-foreground">
                  Arrastra aquí o clic para seleccionar
                </span>
                <span class="text-xs text-muted-foreground">PDF, JPG, PNG, DOC</span>
              </template>
            </label>
          </div>
          <Button
            v-if="!readOnlyForm"
            type="button"
            variant="destructive"
            size="sm"
            class="h-9 shrink-0 gap-1.5 px-2.5"
            @click="removeDocument(idx)"
          >
            <Icon name="i-lucide-trash" class="h-4 w-4 shrink-0" />
            Quitar
          </Button>
        </div>
        <Button v-if="!readOnlyForm" type="button" variant="outline" size="sm" @click="addDocument">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Agregar documento
        </Button>
      </div>
    </section>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-municipality {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  min-height: 2.25rem; /* h-9: igual que Input y Select del formulario */
  width: 100%;
  min-width: 0;
}
</style>
