<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { ApplicantForm, ApplicantDocumentForm, FinancialInfoForm } from '~/types/credit-application'

const props = defineProps<{
  modelValue: ApplicantForm
  showSearch?: boolean
  loadingSearch?: boolean
  /** Muestra campo "Concepto" (ej. Codeudor bien raíz) para codeudores */
  showCoDebtorConcept?: boolean
  /** Oculta la sección Datos financieros (ej. cuando está en paso separado) */
  hideFinancialSection?: boolean
  /** Muestra solo la sección Datos financieros (para paso dedicado) */
  showOnlyFinancial?: boolean
  onSearch?: () => void
}>()

const emit = defineEmits<{
  'update:modelValue': [ApplicantForm]
}>()

const local = computed({
  get: () => props.modelValue,
  set: (v: ApplicantForm) => emit('update:modelValue', v),
})

const financial = computed({
  get: () => (props.modelValue.financial_info || {}) as FinancialInfoForm,
  set: (v: FinancialInfoForm) => emit('update:modelValue', { ...props.modelValue, financial_info: v }),
})

function setFinancial<K extends keyof FinancialInfoForm>(key: K, value: FinancialInfoForm[K]) {
  financial.value = { ...financial.value, [key]: value }
}

const { multiselectOptionsByLabel } = useMunicipalities()

const documentTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
]

const residenceTypes = [
  { value: 'Propia', label: 'Propia' },
  { value: 'Familiar', label: 'Familiar' },
  { value: 'Arriendo', label: 'Arriendo' },
]

const maritalStatuses = [
  { value: 'Soltero', label: 'Soltero(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Union Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viudo', label: 'Viudo(a)' },
]

const economicActivityTypes = [
  { value: 'Empleado formal', label: 'Empleado formal' },
  { value: 'Independiente', label: 'Independiente' },
  { value: 'Pensionado', label: 'Pensionado' },
  { value: 'Otro', label: 'Otro' },
]

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

const { formatPesos, parsePesosInput } = usePesosFormat()

/** En inputs de pesos: solo permite dígitos, punto y coma. Permite teclas de control (borrar, flechas, etc.). */
function onKeydownPesosOnly(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) return
  const key = e.key
  if (key == null || key === '' || ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
  if (key.length === 1 && !/[\d.,]/.test(key)) e.preventDefault()
}

/** Total ingresos = salario + pensión + cultivos/negocio (para mostrar en input readonly). */
const incomeTotalDisplay = computed(() => {
  const inc = financial.value.income
  return (inc?.salary ?? 0) + (inc?.pension ?? 0) + (inc?.business ?? 0)
})

/** Total gastos = personales + alimentación + servicios/arriendo (para mostrar en input readonly). */
const expensesTotalDisplay = computed(() => {
  const exp = financial.value.expenses
  return (exp?.personal ?? 0) + (exp?.food ?? 0) + (exp?.rent ?? 0)
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
  if (!isValidFile(file)) {
    toast.error('Archivo no válido. Use PDF, JPG, PNG o DOC. Máx. 10 MB.')
    return
  }
  updateDocument(index, { file })
}

function onDocumentDrop(index: number, e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!isValidFile(file)) {
    toast.error('Archivo no válido. Use PDF, JPG, PNG o DOC. Máx. 10 MB.')
    return
  }
  updateDocument(index, { file })
}

function onDocumentDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
}

function isValidFile(file: File): boolean {
  const valid = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  return valid.includes(file.type) && file.size <= 10 * 1024 * 1024
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
    <section v-if="!showOnlyFinancial && showSearch" :class="sectionClass">
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
              @keyup.enter="onSearch?.()"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="default"
            class="h-9 shrink-0"
            :disabled="loadingSearch || !local.document_number?.trim()"
            @click="onSearch?.()"
          >
            <Icon v-if="loadingSearch" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            <Icon v-else name="i-lucide-search" class="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Ingrese la cédula para cargar los datos del solicitante si ya está registrado.
        </p>
      </div>
    </section>

    <!-- Documento de identidad -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Documento de identidad</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <Label for="doc_type">Tipo documento *</Label>
          <Select v-model="local.document_type">
            <SelectTrigger id="doc_type">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in documentTypes" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="doc_number">Número documento *</Label>
          <Input
            id="doc_number"
            v-model="local.document_number"
            placeholder="Ej: 1234567890"
            inputmode="numeric"
            :readonly="!!showSearch"
            @input="onDigitsOnlyInput($event, v => (local.document_number = v))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_date">Fecha expedición</Label>
          <Input
            id="exp_date"
            v-model="local.expedition_date"
            type="date"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_place">Lugar de expedición</Label>
          <Multiselect
            :model-value="local.expedition_place ?? null"
            :options="multiselectOptionsByLabel"
            value-prop="value"
            label="label"
            :searchable="true"
            placeholder="Municipio"
            no-options-text="No hay municipios"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="local = { ...local, expedition_place: ($event as string) ?? '' }"
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
          <Input id="first_name" v-model="local.first_name" placeholder="Ej: Juan" />
        </div>
        <div :class="fieldClass">
          <Label for="second_name">Segundo nombre</Label>
          <Input id="second_name" v-model="local.second_name" placeholder="Ej: Carlos" />
        </div>
        <div :class="fieldClass">
          <Label for="first_last">Primer apellido *</Label>
          <Input id="first_last" v-model="local.first_last_name" placeholder="Ej: Pérez" />
        </div>
        <div :class="fieldClass">
          <Label for="second_last">Segundo apellido</Label>
          <Input id="second_last" v-model="local.second_last_name" placeholder="Ej: Gómez" />
        </div>
        <div :class="fieldClass">
          <Label for="birth_date">Fecha nacimiento</Label>
          <Input id="birth_date" v-model="local.birth_date" type="date" />
        </div>
        <div :class="fieldClass">
          <Label for="gender">Género</Label>
          <Input id="gender" v-model="local.gender" placeholder="M/F" />
        </div>
        <div :class="fieldClass">
          <Label for="marital">Estado civil</Label>
          <Select v-model="local.marital_status">
            <SelectTrigger id="marital">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in maritalStatuses" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="dependents">Personas a cargo</Label>
          <Input
            id="dependents"
            v-model.number="local.dependents"
            type="number"
            min="0"
            inputmode="numeric"
            @keydown="onKeydownNumeric($event, false)"
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
            v-model="local.mobile_phone"
            placeholder="3001234567"
            inputmode="numeric"
            @input="onDigitsOnlyInput($event, v => (local.mobile_phone = v))"
          />
        </div>
        <div :class="fieldClass">
          <Label for="landline">Teléfono fijo</Label>
          <Input
            id="landline"
            v-model="local.landline"
            placeholder="6011234567"
            inputmode="numeric"
            @input="onDigitsOnlyInput($event, v => (local.landline = v))"
          />
        </div>
        <div class="sm:col-span-2 lg:col-span-1" :class="fieldClass">
          <Label for="email">Email</Label>
          <Input id="email" v-model="local.email" type="email" placeholder="correo@ejemplo.com" />
        </div>
      </div>
    </section>

    <!-- Dirección y residencia -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Dirección y residencia</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="sm:col-span-2 lg:col-span-3" :class="fieldClass">
          <Label for="address">Dirección de residencia</Label>
          <Input id="address" v-model="local.residence_address" placeholder="Calle 123 #45-67, barrio..." />
        </div>
        <div :class="fieldClass">
          <Label for="residence_city">Ciudad / Municipio de residencia</Label>
          <Multiselect
            :model-value="local.residence_city_name ?? null"
            :options="multiselectOptionsByLabel"
            value-prop="value"
            label="label"
            :searchable="true"
            placeholder="Municipio"
            no-options-text="No hay municipios"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="local = { ...local, residence_city_name: ($event as string) ?? '' }"
          />
        </div>
        <div :class="fieldClass">
          <Label for="residence_type">Tipo vivienda</Label>
          <Select v-model="local.residence_type">
            <SelectTrigger id="residence_type">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in residenceTypes" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="time_residence">Tiempo en residencia</Label>
          <Input id="time_residence" v-model="local.time_in_residence" placeholder="Ej: 2 años" />
        </div>
      </div>
    </section>

    <!-- Actividad económica -->
    <section v-if="!showOnlyFinancial" :class="sectionClass">
      <h3 :class="sectionTitleClass">Actividad económica</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="activity_type">Tipo de actividad económica</Label>
          <Select
            :model-value="financial.activity_type ?? null"
            @update:model-value="setFinancial('activity_type', $event != null ? String($event) : undefined)"
          >
            <SelectTrigger id="activity_type">
              <SelectValue placeholder="Seleccionar (ej. Empleado formal)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in economicActivityTypes"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="occupation">Ocupación</Label>
          <Input id="occupation" v-model="local.occupation" placeholder="Ej: Comerciante" />
        </div>
        <div :class="fieldClass">
          <Label for="company">Empresa</Label>
          <Input id="company" v-model="local.company_name" placeholder="Nombre empresa" />
        </div>
        <div :class="fieldClass">
          <Label for="position">Cargo</Label>
          <Input id="position" v-model="local.position" placeholder="Ej: Vendedor" />
        </div>
        <div :class="fieldClass">
          <Label for="contract">Tipo contrato</Label>
          <Input id="contract" v-model="local.contract_type" placeholder="Indefinido, Término fijo..." />
        </div>
        <div :class="fieldClass">
          <Label for="time_job">Tiempo en el trabajo</Label>
          <Input id="time_job" v-model="local.time_in_job" placeholder="Ej: 3 años" />
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
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <Label>Ingreso salario (COP)</Label>
          <Input
            :model-value="formatPesos(financial.income?.salary)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, salary: n, total: (n ?? 0) + (inc.pension ?? 0) + (inc.business ?? 0) }; setFinancial('income', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Ingreso pensión (COP)</Label>
          <Input
            :model-value="formatPesos(financial.income?.pension)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, pension: n, total: (inc.salary ?? 0) + (n ?? 0) + (inc.business ?? 0) }; setFinancial('income', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Ingreso cultivos/negocio (COP)</Label>
          <Input
            :model-value="formatPesos(financial.income?.business)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const inc = financial.income || {}; const n = parsePesosInput(String(v)); const next = { ...inc, business: n, total: (inc.salary ?? 0) + (inc.pension ?? 0) + (n ?? 0) }; setFinancial('income', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Total ingresos (COP)</Label>
          <Input
            :model-value="formatPesos(incomeTotalDisplay)"
            type="text"
            placeholder="0"
            readonly
            class="bg-muted/50 cursor-default"
          />
        </div>
        <div class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <Label>Descripción ingresos</Label>
          <textarea
            :value="financial.income?.description"
            class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Detalle de ingresos (negocio, cultivos, etc.)"
            rows="2"
            @input="setFinancial('income', { ...(financial.income || {}), description: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
        <div :class="fieldClass">
          <Label>Gastos personales (COP)</Label>
          <Input
            :model-value="formatPesos(financial.expenses?.personal)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, personal: n, total: (n ?? 0) + (exp.food ?? 0) + (exp.rent ?? 0) }; setFinancial('expenses', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Gastos alimentación (COP)</Label>
          <Input
            :model-value="formatPesos(financial.expenses?.food)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, food: n, total: (exp.personal ?? 0) + (n ?? 0) + (exp.rent ?? 0) }; setFinancial('expenses', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Gastos servicios/arriendo (COP)</Label>
          <Input
            :model-value="formatPesos(financial.expenses?.rent)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => { const exp = financial.expenses || {}; const n = parsePesosInput(String(v)); const next = { ...exp, rent: n, total: (exp.personal ?? 0) + (exp.food ?? 0) + (n ?? 0) }; setFinancial('expenses', next); }"
          />
        </div>
        <div :class="fieldClass">
          <Label>Total gastos (COP)</Label>
          <Input
            :model-value="formatPesos(expensesTotalDisplay)"
            type="text"
            placeholder="0"
            readonly
            class="bg-muted/50 cursor-default"
          />
        </div>
        <div class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <Label>Descripción gastos</Label>
          <textarea
            :value="financial.expenses?.description"
            class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Detalle de gastos del hogar"
            rows="2"
            @input="setFinancial('expenses', { ...(financial.expenses || {}), description: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
        <div :class="fieldClass" class="sm:col-span-2 lg:col-span-4">
          <Label>Total activos (COP)</Label>
          <Input
            :model-value="formatPesos(assetsTotalDisplay)"
            type="text"
            placeholder="0"
            readonly
            class="bg-muted/50 cursor-default"
          />
        </div>
        <div :class="fieldClass">
          <Label>Pasivos totales (COP)</Label>
          <Input
            :model-value="formatPesos(financial.solvency?.liabilities)"
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
            :model-value="formatPesos(bienRaizFromGarantias)"
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
        <div :class="fieldClass">
          <Label>Endeudamiento (ratio 0-1)</Label>
          <Input
            :model-value="financial.solvency?.debt_ratio"
            type="number"
            min="0"
            max="1"
            step="0.01"
            placeholder="Ej: 0.3"
            inputmode="decimal"
            @keydown="onKeydownNumeric($event, true)"
            @update:model-value="setFinancial('solvency', { ...(financial.solvency || {}), debt_ratio: Number($event) || undefined })"
          />
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
              <span class="font-semibold">{{ formatPesos(bienRaizFromGarantias) || '0' }}</span>
            </div>
            <Button type="button" variant="outline" size="sm" @click="addAsset">
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
                  :model-value="asset.name ?? (asset as { description?: string }).description ?? ''"
                  placeholder="Ej: Casa, Lote, Vehículo..."
                  @update:model-value="updateAsset(idx, 'name', $event ?? '')"
                />
              </div>
              <div :class="fieldClass" class="min-w-0 flex-1 sm:max-w-[180px]">
                <Label :for="`asset_value_${idx}`">Valor (COP)</Label>
                <Input
                  :id="`asset_value_${idx}`"
                  :model-value="formatPesos(asset.value)"
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
                type="button"
                variant="ghost"
                size="icon"
                class="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                title="Eliminar activo"
                @click="removeAsset(idx)"
              >
                <Icon name="i-lucide-trash" class="h-4 w-4" />
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
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 text-destructive hover:text-destructive"
            @click="removeDocument(idx)"
          >
            <Icon name="i-lucide-trash" class="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" @click="addDocument">
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
