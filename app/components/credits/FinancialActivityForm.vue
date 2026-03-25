<script setup lang="ts">
/**
 * Formulario de actividad económica agropecuaria.
 * Se usa dentro de FinancialActivityFormList; los datos se guardan en debtor.financial_info.activity_templates.
 */
import type { FormSchemaInput } from '~/types/credits'
import type { ActivityTemplateData } from '~/types/credit-application'
import {
  sectorsConfig,
  getTemplateSchema,
  templateHasProductSelect,
} from '~/constants/credits-financial-templates'
import {
  getConfigFieldKeys,
  CERDOS_CEBA_DURACION_CICLO_MESES_DEFAULT,
  CERDOS_CRIA_DURACION_CICLO_DIAS_DEFAULT,
  GANADO_DOBLE_CICLO_LECHE_MESES_DEFAULT,
  GANADO_DOBLE_CICLO_TERNEROS_MESES_DEFAULT,
  GANADO_DOBLE_TASA_MORTALIDAD_PCT_DEFAULT,
} from '~/constants/template-config-schemas'

const { cultivoPermanenteOptions, cultivoCicloCortoOptions, pecesTipoOptions, serviciosTipoOptions, fetchCategories } = useTemplateCategories()
const { fetchFlatData } = useTemplateFlatData()

const props = withDefaults(
  defineProps<{
    modelValue?: ActivityTemplateData | null
    readonly?: boolean
  }>(),
  {
    modelValue: () => null,
    readonly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ActivityTemplateData | null]
}>()

const sectorSelected = ref<string>(props.modelValue?.sector ?? '')
const templateSelected = ref<string>(props.modelValue?.template ?? '')
const formData = ref<Record<string, unknown>>({ ...(props.modelValue?.data ?? {}) })
/** Evita cargar flat data al hidratar desde props (ej. borrador guardado) */
const isSyncingFromProps = ref(false)
/** Incrementa al recibir flat data para forzar reinicio del formulario con los valores correctos */
const formDataVersion = ref(0)
/** True mientras se cargan los datos del catálogo (evita mostrar formulario vacío) */
const loadingFlatData = ref(false)
/** Claves de campos que vienen de configuración y deben ser solo lectura (cuando se cargó flat data) */
const configuredFieldKeys = ref<string[]>([])

const templateOptions = ref<Array<{ value: string; label: string }>>([])

const currentSchema = computed<FormSchemaInput | null>(() => {
  if (!templateSelected.value) return null
  return getTemplateSchema(templateSelected.value, {
    cultivoPermanente: cultivoPermanenteOptions.value,
    cultivoCicloCorto: cultivoCicloCortoOptions.value,
    pecesTipo: pecesTipoOptions.value,
    serviciosTipo: serviciosTipoOptions.value,
  })
})

const hasProductSelect = computed(() =>
  templateSelected.value ? templateHasProductSelect(templateSelected.value) : false,
)

function setFormData(data: Record<string, unknown>) {
  // No sobrescribir mientras cargamos la config del producto (evita arrastrar config de Maíz al elegir Papa)
  if (loadingFlatData.value) return
  formData.value = data
  emitActivityTemplate()
}

function emitActivityTemplate() {
  if (!sectorSelected.value) {
    emit('update:modelValue', null)
    return
  }
  if (!templateSelected.value) {
    emit('update:modelValue', {
      sector: sectorSelected.value,
      template: '',
      product: null,
      data: {},
    })
    return
  }
  emit('update:modelValue', {
    sector: sectorSelected.value,
    template: templateSelected.value,
    product: formData.value.tipo_producto as string | undefined ?? null,
    data: { ...formData.value },
  })
}

async function loadFlatDataForTemplate(template: string, product: string | null) {
  loadingFlatData.value = true
  try {
    const flatData = await fetchFlatData(template, product)
    formData.value = { ...flatData, ...formData.value }
    if (template === 'ganado-doble-proposito') {
      const d = formData.value
      const cTern = d.ciclo_produccion_terneros_meses
      if (cTern === undefined || cTern === null || cTern === '') {
        d.ciclo_produccion_terneros_meses = GANADO_DOBLE_CICLO_TERNEROS_MESES_DEFAULT
      }
      const cLeche = d.ciclo_produccion_leche
      if (cLeche === undefined || cLeche === null || cLeche === '') {
        d.ciclo_produccion_leche = GANADO_DOBLE_CICLO_LECHE_MESES_DEFAULT
      }
      const tasaMort = d.pct_tasa_mortalidad
      if (tasaMort === undefined || tasaMort === null || tasaMort === '') {
        d.pct_tasa_mortalidad = GANADO_DOBLE_TASA_MORTALIDAD_PCT_DEFAULT
      }
    }
    if (template === 'cerdos-cria') {
      const d = formData.value
      const dias = d.duracion_ciclo_dias
      if (dias === undefined || dias === null || dias === '') {
        d.duracion_ciclo_dias = CERDOS_CRIA_DURACION_CICLO_DIAS_DEFAULT
      }
    }
    if (template === 'cerdos-ceba') {
      const d = formData.value
      const meses = d.duracion_ciclo_meses
      if (meses === undefined || meses === null || meses === '') {
        d.duracion_ciclo_meses = CERDOS_CEBA_DURACION_CICLO_MESES_DEFAULT
      }
    }
    formDataVersion.value++ // Forzar que DynamicFormRenderer reciba los datos en su mount
    // Plantillas con esquema de config: campos marcados en el schema como “solo desde plantilla” quedan solo lectura
    configuredFieldKeys.value = getConfigFieldKeys(template)
    emitActivityTemplate()
  } finally {
    loadingFlatData.value = false
  }
}

watch(templateSelected, async (newTemplate) => {
  if (isSyncingFromProps.value) return // No cargar al hidratar borrador
  if (!newTemplate) {
    formData.value = {}
    configuredFieldKeys.value = []
    emitActivityTemplate()
    return
  }
  formData.value = {}
  const productKey = templateHasProductSelect(newTemplate)
    ? ((formData.value.tipo_producto ?? props.modelValue?.product) as string | null) ?? null
    : null
  await loadFlatDataForTemplate(newTemplate, productKey)
})

watch(
  () => formData.value.tipo_producto,
  async (product) => {
    if (!templateSelected.value || !templateHasProductSelect(templateSelected.value) || !product || isSyncingFromProps.value) return
    loadingFlatData.value = true
    try {
      const flatData = await fetchFlatData(templateSelected.value, product)
      // Reemplazar por completo con la config del producto seleccionado (evita arrastrar config de Maíz al elegir Papa).
      // Usar flatData como única fuente para ciclo_corto_cost_breakdown, kg_x_ha, etc.
      formData.value = { ...flatData, tipo_producto: product }
      formDataVersion.value++
      configuredFieldKeys.value = getConfigFieldKeys(templateSelected.value)
      emitActivityTemplate()
    } finally {
      loadingFlatData.value = false
    }
  },
)

watch(sectorSelected, (newSector) => {
  const templates = sectorsConfig.find((s) => s.value === newSector)?.templates ?? []
  templateOptions.value = templates
  if (isSyncingFromProps.value) return
  // Si el sector tiene solo una plantilla, auto-seleccionarla
  if (templates.length === 1) {
    templateSelected.value = templates[0].value
  } else {
    templateSelected.value = ''
  }
}, { immediate: true })

watch(
  () => props.modelValue,
  (val) => {
    // No sobrescribir si ya tenemos los mismos valores (evita deselección al cambiar plantilla)
    const newSector = val?.sector ?? ''
    const newTemplate = val?.template ?? ''
    if (newSector === sectorSelected.value && newTemplate === templateSelected.value) {
      return
    }
    isSyncingFromProps.value = true
    sectorSelected.value = newSector
    templateSelected.value = newTemplate
    formData.value = { ...(val?.data ?? {}) }
    if (newTemplate === 'ganado-doble-proposito') {
      const d = formData.value
      const cTern = d.ciclo_produccion_terneros_meses
      if (cTern === undefined || cTern === null || cTern === '') {
        d.ciclo_produccion_terneros_meses = GANADO_DOBLE_CICLO_TERNEROS_MESES_DEFAULT
      }
      const cLeche = d.ciclo_produccion_leche
      if (cLeche === undefined || cLeche === null || cLeche === '') {
        d.ciclo_produccion_leche = GANADO_DOBLE_CICLO_LECHE_MESES_DEFAULT
      }
      const tasaMort = d.pct_tasa_mortalidad
      if (tasaMort === undefined || tasaMort === null || tasaMort === '') {
        d.pct_tasa_mortalidad = GANADO_DOBLE_TASA_MORTALIDAD_PCT_DEFAULT
      }
    }
    if (newTemplate === 'cerdos-cria') {
      const d = formData.value
      const dias = d.duracion_ciclo_dias
      if (dias === undefined || dias === null || dias === '') {
        d.duracion_ciclo_dias = CERDOS_CRIA_DURACION_CICLO_DIAS_DEFAULT
      }
    }
    if (newTemplate === 'cerdos-ceba') {
      const d = formData.value
      const meses = d.duracion_ciclo_meses
      if (meses === undefined || meses === null || meses === '') {
        d.duracion_ciclo_meses = CERDOS_CEBA_DURACION_CICLO_MESES_DEFAULT
      }
    }
    configuredFieldKeys.value = val?.template ? getConfigFieldKeys(val.template) : []
    nextTick(() => { isSyncingFromProps.value = false })
  },
  { immediate: true },
)

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-border p-4">
      <h3 class="mb-4 text-sm font-semibold">
        Sector y plantilla
      </h3>
      <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="sector" class="text-sm font-medium">Sector</Label>
            <select
              id="sector"
              v-model="sectorSelected"
              :disabled="readonly"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">
                Seleccionar sector
              </option>
              <option
                v-for="s in sectorsConfig"
                :key="s.value"
                :value="s.value"
              >
                {{ s.label }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label :for="`template-${sectorSelected || 'none'}`" class="text-sm font-medium">Plantilla</Label>
            <select
              :id="`template-${sectorSelected || 'none'}`"
              :key="sectorSelected"
              v-model="templateSelected"
              :disabled="readonly"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">
                Seleccionar plantilla
              </option>
              <option
                v-for="t in templateOptions"
                :key="t.value"
                :value="t.value"
              >
                {{ t.label }}
              </option>
            </select>
          </div>
        </div>
      <p
        v-if="hasProductSelect"
        class="mt-3 text-xs text-muted-foreground"
      >
        La plantilla incluye selector (ej. Café, Cacao, Tipo de pez).
      </p>
    </div>

    <div v-if="currentSchema" class="rounded-lg border border-border p-4">
      <div v-if="loadingFlatData" class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
        Cargando valores configurados...
      </div>
      <ClientOnly v-else>
        <CreditsDynamicFormRenderer
          :key="`${templateSelected}-${formData.tipo_producto ?? 'default'}-${formDataVersion}`"
          :schema="currentSchema"
          :template-key="templateSelected"
          :initial-data="formData"
          :read-only-field-keys="configuredFieldKeys"
          :readonly="readonly"
          @update:form-data="setFormData"
        />
        <template #fallback>
          <div class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            Cargando formulario...
          </div>
        </template>
      </ClientOnly>
    </div>
    <div v-else class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      Elige un sector y una plantilla para cargar el formulario de actividad económica.
    </div>
  </div>
</template>
