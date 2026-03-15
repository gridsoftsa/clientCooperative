<script setup lang="ts">
/**
 * Motor de renderizado de formularios dinámicos a partir de schema JSON.
 * Soporta: money, select, date, number, text, textarea, computed, municipality.
 * Layout especial: eggsTable para clasificación de huevos (aves ponedoras).
 */
import type { FormSchemaInput } from '~/types/credits'
import {
  computeFormula,
  AVES_COST_PCT_DEFAULTS,
  FINAGRO_DEFAULTS,
} from '~/constants/credits-financial-templates'
import {
  CICLO_CORTO_COST_BREAKDOWN_DEFAULT,
  CICLO_CORTO_COST_BREAKDOWN_KEY,
} from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import { SERVICIOS_INGRESOS_ROWS } from '~/constants/servicios-ingresos-table'
import { TRANSPORTE_CARGA_GASTOS_ROWS } from '~/constants/transporte-carga-gastos-table'
import { TRANSPORTE_PASAJEROS_PASAJES_ROWS } from '~/constants/transporte-pasajeros-pasajes-table'
import CreditsServiciosIngresosTable from '~/components/credits/ServiciosIngresosTable.vue'
import CreditsTransporteCargaGastosTable from '~/components/credits/TransporteCargaGastosTable.vue'
import CreditsTransporteCargaOtrosGastosTable from '~/components/credits/TransporteCargaOtrosGastosTable.vue'
import CreditsTransportePasajerosGastosTable from '~/components/credits/TransportePasajerosGastosTable.vue'
import CreditsTransportePasajerosPasajesTable from '~/components/credits/TransportePasajerosPasajesTable.vue'
import { Textarea } from '~/components/ui/textarea'
import Multiselect from '@vueform/multiselect'

const props = withDefaults(
  defineProps<{
    schema: FormSchemaInput
    templateKey?: string
    initialData?: Record<string, unknown>
    /** Campos que vienen de configuración y no deben ser editables en radicación */
    readOnlyFieldKeys?: string[]
  }>(),
  {
    initialData: () => ({}),
    readOnlyFieldKeys: () => [],
  },
)

const readOnlySet = computed(() => new Set(props.readOnlyFieldKeys))
const { multiselectOptionsByLabel } = useMunicipalities()

function isFieldReadOnly(fieldKey: string): boolean {
  return readOnlySet.value.has(fieldKey)
}

const emit = defineEmits<{
  'update:formData': [data: Record<string, unknown>]
}>()

/** Objeto reactivo keyed por field.key; valores por defecto según tipo */
function buildInitialFormData(): Record<string, unknown> {
  const data: Record<string, unknown> = { ...props.initialData }
  for (const section of props.schema.sections) {
    if (section.layout === 'finagroTable') {
      if (props.templateKey === 'cultivo-permanente') {
        for (const [k, v] of Object.entries(FINAGRO_DEFAULTS)) {
          if (data[k] === undefined) data[k] = v
        }
      }
      continue
    }
    if (section.layout === 'referenciaInfo') {
      if (props.templateKey === 'cultivo-permanente' && data.plantas_x_ha === undefined) {
        data.plantas_x_ha = 1111
      }
      continue
    }
    if (section.layout === 'referenciaInfoCeba') {
      continue
    }
    if (section.layout === 'cicloCortoCostBreakdownTable') {
      if (props.templateKey === 'cultivo-ciclo-corto' && (data[CICLO_CORTO_COST_BREAKDOWN_KEY] === undefined || !Array.isArray(data[CICLO_CORTO_COST_BREAKDOWN_KEY]) || (data[CICLO_CORTO_COST_BREAKDOWN_KEY] as unknown[]).length === 0)) {
        data[CICLO_CORTO_COST_BREAKDOWN_KEY] = [...CICLO_CORTO_COST_BREAKDOWN_DEFAULT]
      }
      continue
    }
    if (section.layout === 'eggsTable' && section.tableRows) {
      for (const row of section.tableRows) {
        const pre = `precio_cubeta_${row.suffix}`
        const can = `cantidad_diaria_${row.suffix}`
        if (data[pre] === undefined) data[pre] = null
        if (data[can] === undefined) data[can] = null
      }
      if (data.total_cantidad_diaria === undefined) data.total_cantidad_diaria = null
      if (data.total_valor_diario === undefined) data.total_valor_diario = null
      if (props.templateKey === 'aves-ponedoras') {
        for (const [k, v] of Object.entries(AVES_COST_PCT_DEFAULTS)) {
          if (data[k] === undefined) data[k] = v
        }
      }
      continue
    }
    if (section.layout === 'serviciosIngresosTable') {
      const rows = section.serviciosTableRows ?? SERVICIOS_INGRESOS_ROWS
      for (const row of rows) {
        const valorKey = `dia_${row.suffix}_valor`
        const cantidadKey = `dia_${row.suffix}_cantidad`
        if (data[valorKey] === undefined) data[valorKey] = null
        if (data[cantidadKey] === undefined) data[cantidadKey] = null
      }
      continue
    }
    if (section.layout === 'transporteCargaGastosTable') {
      const rows = section.gastosTableRows ?? TRANSPORTE_CARGA_GASTOS_ROWS
      for (const row of rows) {
        if (data[row.key] === undefined) data[row.key] = null
      }
      const otrosGastosKeys = ['seguro_soat', 'tecnomecanica', 'llantas_anual', 'repuestos', 'cambios_aceite_cantidad', 'precio_cambio_aceite', 'bajadas_rueda_anual']
      for (const k of otrosGastosKeys) {
        if (data[k] === undefined) data[k] = null
      }
      continue
    }
    if (section.layout === 'transportePasajerosPasajesTable') {
      const rows = section.pasajesTableRows ?? TRANSPORTE_PASAJEROS_PASAJES_ROWS
      for (const row of rows) {
        if ((row as { type?: string }).type === 'computed') continue
        if (data[row.key] === undefined) data[row.key] = null
      }
      continue
    }
    if (section.layout === 'transportePasajerosGastosTable') {
      for (const k of ['combustible_ida', 'peajes_ida', 'otros_ida', 'conductor_ida', 'combustible_vuelta', 'peajes_vuelta', 'otros_vuelta', 'conductor_vuelta', 'seguro_soat', 'tecnomecanica', 'llantas_anual', 'repuestos', 'cambios_aceite_cantidad', 'precio_cambio_aceite', 'bajadas_rueda_anual', 'seguro_todo_riesgos', 'rodamiento_mensual']) {
        if (data[k] === undefined) data[k] = null
      }
      continue
    }
    for (const field of section.fields) {
      if (field.type === 'computed') continue
      if (data[field.key] !== undefined) continue
      if (field.type === 'number' || field.type === 'money') {
        data[field.key] = null as unknown
      } else if (field.type === 'select' && field.options?.length) {
        data[field.key] = field.options[0].value
      } else {
        data[field.key] = ''
      }
    }
  }
  return data
}

function formatComputedValue(field: { formulaKey?: string; formulaFormat?: string; key: string }): string {
  if (!field.formulaKey) return '—'
  const v = computeFormula(field.formulaKey, formData)
  if (v == null) return '—'
  if (field.formulaFormat === 'percent') {
    return `${v}%`
  }
  if (field.formulaFormat === 'money') {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
  }
  return v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

const formData = reactive<Record<string, unknown>>(buildInitialFormData())

watch(
  () => [props.schema, props.initialData],
  () => {
    const next = buildInitialFormData()
    Object.keys(next).forEach((k) => {
      formData[k] = next[k]
    })
  },
  { deep: true },
)

function emitFormData() {
  emit('update:formData', { ...formData })
}

watch(
  formData,
  emitFormData,
  { deep: true },
)

onMounted(emitFormData)

/** Clase grid según cols (1 o 2) */
function gridColClass(cols?: number): string {
  if (cols === 2) return 'md:col-span-2'
  return ''
}

/** Indica si un campo debe mostrarse según visibleWhen */
function isFieldVisible(field: { visibleWhen?: { fieldKey: string; value: string | number } }): boolean {
  const vw = field.visibleWhen
  if (!vw) return true
  return formData[vw.fieldKey] === vw.value
}

/** Input nativo estilizado (compartido) */
const inputBaseClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <form class="space-y-6">
    <template v-for="(section, idx) in schema.sections" :key="section.key ?? idx">
      <!-- Tabla FINAGRO (cultivos permanentes) -->
      <fieldset
        v-if="section.layout === 'finagroTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="sr-only">{{ section.title }}</legend>
        <div class="mt-2">
          <CreditsCultivoPermanenteFinagroTable
            :form-data="formData"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
        </div>
      </fieldset>
      <!-- Información de referencia (cultivos permanentes) -->
      <fieldset
        v-else-if="section.layout === 'referenciaInfo'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="sr-only">{{ section.title }}</legend>
        <div class="mt-2">
          <CreditsCultivoPermanenteReferenciaInfo
            :form-data="formData"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
        </div>
      </fieldset>
      <!-- Información de referencia (ganado ceba) -->
      <fieldset
        v-else-if="section.layout === 'referenciaInfoCeba'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="sr-only">{{ section.title }}</legend>
        <div class="mt-2">
          <CreditsGanadoCebaReferenciaInfo :form-data="formData" />
        </div>
      </fieldset>
      <!-- Discriminación de costos (cultivo ciclo corto) -->
      <fieldset
        v-else-if="section.layout === 'cicloCortoCostBreakdownTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="sr-only">{{ section.title }}</legend>
        <div class="mt-2">
          <CreditsCultivoCicloCortoCostBreakdown :form-data="formData" />
        </div>
      </fieldset>
      <!-- Tabla editable Ingresos por Servicio (servicios) -->
      <fieldset
        v-else-if="section.layout === 'serviciosIngresosTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4">
          <CreditsServiciosIngresosTable
            :form-data="formData"
            :table-rows="(section.serviciosTableRows && section.serviciosTableRows.length > 0) ? section.serviciosTableRows : SERVICIOS_INGRESOS_ROWS"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
        </div>
      </fieldset>
      <!-- Tabla Gastos por Viaje Redondo + Otros Gastos Anuales (transporte-carga) -->
      <fieldset
        v-else-if="section.layout === 'transporteCargaGastosTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4 space-y-4">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CreditsTransporteCargaGastosTable
              :form-data="formData"
              :table-rows="(section.gastosTableRows && section.gastosTableRows.length > 0) ? section.gastosTableRows : TRANSPORTE_CARGA_GASTOS_ROWS"
              @update:field="({ key, value }) => (formData[key] = value)"
            />
            <CreditsTransporteCargaOtrosGastosTable
              :form-data="formData"
              @update:field="({ key, value }) => (formData[key] = value)"
            />
          </div>
          <div
            v-if="(section.fields?.length ?? 0) > 0"
            class="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <template v-for="field in section.fields" :key="field.key">
              <div :class="['grid gap-2', gridColClass(field.cols)]">
                <Label :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                  <span v-if="field.meta" class="text-muted-foreground font-normal">({{ field.meta }})</span>
                </Label>
                <div
                  :id="`field-${field.key}`"
                  class="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground select-none cursor-default"
                  tabindex="-1"
                  aria-readonly="true"
                >
                  {{ formatComputedValue(field) }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </fieldset>
      <!-- Tabla Pasajes (transporte-pasajeros) -->
      <fieldset
        v-else-if="section.layout === 'transportePasajerosPasajesTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4">
          <CreditsTransportePasajerosPasajesTable
            :form-data="formData"
            :table-rows="(section.pasajesTableRows && section.pasajesTableRows.length > 0) ? section.pasajesTableRows : TRANSPORTE_PASAJEROS_PASAJES_ROWS"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
        </div>
      </fieldset>
      <!-- Tabla Gastos (transporte-pasajeros) -->
      <fieldset
        v-else-if="section.layout === 'transportePasajerosGastosTable'"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4 space-y-4">
          <CreditsTransportePasajerosGastosTable
            :form-data="formData"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
          <div
            v-if="(section.fields?.length ?? 0) > 0"
            class="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <template v-for="field in section.fields" :key="field.key">
              <div :class="['grid gap-2', gridColClass(field.cols)]">
                <Label :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                  <span v-if="field.meta" class="text-muted-foreground font-normal">({{ field.meta }})</span>
                </Label>
                <div
                  :id="`field-${field.key}`"
                  class="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground select-none cursor-default"
                  tabindex="-1"
                  aria-readonly="true"
                >
                  {{ formatComputedValue(field) }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </fieldset>
      <!-- Tabla de clasificación de huevos + desglose de costos (aves ponedoras) -->
      <fieldset
        v-else-if="section.layout === 'eggsTable' && section.tableRows"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4 space-y-4">
          <CreditsEggClassificationTable
            :form-data="formData"
            :table-rows="section.tableRows"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
          <CreditsAvesCostBreakdown
            :form-data="formData"
            @update:field="({ key, value }) => (formData[key] = value)"
          />
        </div>
      </fieldset>
      <!-- Sección estándar (con fields) -->
      <fieldset
        v-else-if="(section.fields?.length ?? 0) > 0"
        class="rounded-lg border border-border p-4"
      >
        <legend class="text-sm font-semibold text-foreground">
          {{ section.title }}
        </legend>
        <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <template v-for="field in (section.fields ?? [])" :key="field.key">
          <div v-if="isFieldVisible(field)" :class="['grid gap-2', gridColClass(field.cols)]">
            <!-- money -->
            <template v-if="field.type === 'money'">
              <CreditsBaseMoneyInput
                :model-value="(formData[field.key] as number | null) ?? null"
                :label="field.label"
                :disabled="isFieldReadOnly(field.key)"
                @update:model-value="(v) => (formData[field.key] = v)"
              />
            </template>
            <!-- select -->
            <template v-else-if="field.type === 'select'">
              <div class="space-y-1.5">
                <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                </Label>
                <Select
                  :model-value="formData[field.key]"
                  :disabled="isFieldReadOnly(field.key)"
                  @update:model-value="(v) => (formData[field.key] = v)"
                >
                  <SelectTrigger :id="`field-${field.key}`" class="w-full">
                    <SelectValue :placeholder="field.label ? `Seleccionar ${field.label.toLowerCase()}` : 'Seleccionar'" />
                  </SelectTrigger>
                  <SelectContent class="bg-popover text-popover-foreground">
                    <SelectItem
                      v-for="opt in (field.options ?? [])"
                      :key="String(opt.value)"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </template>
            <!-- municipality (selector de municipios como lugar de expedición) -->
            <template v-else-if="field.type === 'municipality'">
              <div class="space-y-1.5">
                <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                </Label>
                <Multiselect
                  :model-value="(formData[field.key] as string) ?? null"
                  :options="multiselectOptionsByLabel"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :strict="false"
                  placeholder="Municipio"
                  no-options-text="No hay municipios"
                  no-results-text="No hay resultados. Escribe para filtrar."
                  class="multiselect-municipality"
                  @update:model-value="(v) => (formData[field.key] = (v as string) ?? '')"
                />
              </div>
            </template>
            <!-- computed (solo lectura, no modificable) -->
            <template v-else-if="field.type === 'computed'">
              <div class="space-y-1.5">
                <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                  <span v-if="field.meta" class="text-muted-foreground font-normal">({{ field.meta }})</span>
                </Label>
                <div
                  :id="`field-${field.key}`"
                  class="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground select-none cursor-default"
                  tabindex="-1"
                  aria-readonly="true"
                >
                  {{ formatComputedValue(field) }}
                </div>
              </div>
            </template>
            <!-- date -->
            <template v-else-if="field.type === 'date'">
              <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                {{ field.label }}
              </Label>
              <input
                :id="`field-${field.key}`"
                v-model="formData[field.key]"
                type="date"
                :disabled="isFieldReadOnly(field.key)"
                :class="inputBaseClass"
              >
            </template>
            <!-- number -->
            <template v-else-if="field.type === 'number'">
              <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                {{ field.label }}
                <span v-if="field.meta" class="text-muted-foreground font-normal">({{ field.meta }})</span>
              </Label>
              <input
                :id="`field-${field.key}`"
                v-model.number="formData[field.key]"
                type="number"
                step="any"
                :disabled="isFieldReadOnly(field.key)"
                :class="inputBaseClass"
              >
            </template>
            <!-- textarea -->
            <template v-else-if="field.type === 'textarea'">
              <div class="space-y-1.5">
                <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                  {{ field.label }}
                  <span v-if="field.meta" class="text-muted-foreground font-normal">({{ field.meta }})</span>
                </Label>
                <Textarea
                  :id="`field-${field.key}`"
                  :model-value="(formData[field.key] as string) ?? ''"
                  :placeholder="field.meta"
                  rows="6"
                  :disabled="isFieldReadOnly(field.key)"
                  class="min-h-36 resize-y"
                  @update:model-value="(v) => (formData[field.key] = v)"
                />
              </div>
            </template>
            <!-- text (default) -->
            <template v-else>
              <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                {{ field.label }}
              </Label>
              <input
                :id="`field-${field.key}`"
                v-model="formData[field.key]"
                type="text"
                :disabled="isFieldReadOnly(field.key)"
                :class="inputBaseClass"
              >
            </template>
          </div>
        </template>
        </div>
      </fieldset>
    </template>
  </form>
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
  min-height: 2.25rem;
  width: 100%;
}
</style>
