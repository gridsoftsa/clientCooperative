<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import type { ApplicantForm, FinancialInfoForm } from '~/types/credit-application'

const props = defineProps<{
  modelValue: ApplicantForm
  showSearch?: boolean
  loadingSearch?: boolean
  /** Muestra campo "Concepto" (ej. Codeudor bien raíz) para codeudores */
  showCoDebtorConcept?: boolean
  /** @deprecated Usar catálogo local useMunicipalities(); se mantiene por compatibilidad */
  cities?: Array<{ id: number; name: string; department?: string }>
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

const { multiselectOptionsByCity, multiselectOptionsByLabel } = useMunicipalities()

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
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  if (e.key.length === 1 && !/[\d.,]/.test(e.key)) e.preventDefault()
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
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Búsqueda por cédula (solo para deudor) -->
    <section v-if="showSearch" :class="sectionClass">
      <h3 :class="sectionTitleClass">Buscar por documento</h3>
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <div class="flex flex-wrap items-end gap-3">
          <div :class="fieldClass" class="min-w-0 flex-1 sm:max-w-[280px]">
            <Label for="search_doc" class="block">Número de documento</Label>
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
    <section :class="sectionClass">
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
    <section :class="sectionClass">
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
    <section :class="sectionClass">
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
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Dirección y residencia</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="sm:col-span-2 lg:col-span-3" :class="fieldClass">
          <Label for="address">Dirección de residencia</Label>
          <Input id="address" v-model="local.residence_address" placeholder="Calle 123 #45-67, barrio..." />
        </div>
        <div :class="fieldClass">
          <Label for="residence_city">Ciudad</Label>
          <Multiselect
            :model-value="local.residence_city_id ?? null"
            :options="multiselectOptionsByCity"
            value-prop="value"
            label="label"
            :searchable="true"
            placeholder="Ciudad"
            no-options-text="No hay ciudades"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="local = { ...local, residence_city_id: ($event as number) ?? undefined }"
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
    <section :class="sectionClass">
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
    <section :class="sectionClass">
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
        <div :class="fieldClass">
          <Label>Activos totales (COP)</Label>
          <Input
            :model-value="formatPesos(financial.solvency?.assets)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => setFinancial('solvency', { ...(financial.solvency || {}), assets: parsePesosInput(String(v)) })"
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
          <Label>Bien raíz valor (COP)</Label>
          <Input
            :model-value="formatPesos(financial.solvency?.real_estate)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => setFinancial('solvency', { ...(financial.solvency || {}), real_estate: parsePesosInput(String(v)) })"
          />
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
        <div class="sm:col-span-2 lg:col-span-4" :class="fieldClass">
          <Label>Descripción propiedades e inversiones</Label>
          <textarea
            :value="financial.assets?.[0]?.description ?? ''"
            class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Describa propiedades, inversiones y valores"
            rows="2"
            @input="setFinancial('assets', [{ ...(financial.assets?.[0] || {}), description: ($event.target as HTMLTextAreaElement).value }])"
          />
        </div>
        <div :class="fieldClass">
          <Label>Valor propiedades/inversiones (COP)</Label>
          <Input
            :model-value="formatPesos(financial.assets?.[0]?.value)"
            type="text"
            inputmode="decimal"
            placeholder="0"
            @keydown="onKeydownPesosOnly"
            @update:model-value="(v) => setFinancial('assets', [{ ...(financial.assets?.[0] || {}), value: parsePesosInput(String(v)) }])"
          />
        </div>
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
