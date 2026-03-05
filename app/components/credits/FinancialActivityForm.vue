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
import { getConfigFieldKeys } from '~/constants/template-config-schemas'

const { cultivoPermanenteOptions, cultivoCicloCortoOptions, fetchCategories } = useTemplateCategories()
const { fetchFlatData } = useTemplateFlatData()

const props = withDefaults(
  defineProps<{
    modelValue?: ActivityTemplateData | null
  }>(),
  {
    modelValue: () => null,
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

const templateOptions = computed(() => {
  if (!sectorSelected.value) return []
  return sectorsConfig.find((s) => s.value === sectorSelected.value)?.templates ?? []
})

const currentSchema = computed<FormSchemaInput | null>(() => {
  if (!templateSelected.value) return null
  return getTemplateSchema(templateSelected.value, {
    cultivoPermanente: cultivoPermanenteOptions.value,
    cultivoCicloCorto: cultivoCicloCortoOptions.value,
  })
})

const hasProductSelect = computed(() =>
  templateSelected.value ? templateHasProductSelect(templateSelected.value) : false,
)

function setFormData(data: Record<string, unknown>) {
  formData.value = data
  emitActivityTemplate()
}

function emitActivityTemplate() {
  if (!sectorSelected.value || !templateSelected.value) {
    emit('update:modelValue', null)
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
    formDataVersion.value++ // Forzar que DynamicFormRenderer reciba los datos en su mount
    // Plantillas con esquema de config (ganado-ceba, etc.): valores estandarizados siempre son solo lectura
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
    if (templateSelected.value && templateHasProductSelect(templateSelected.value) && product) {
      const flatData = await fetchFlatData(templateSelected.value, product)
      formData.value = { ...formData.value, ...flatData }
      configuredFieldKeys.value = getConfigFieldKeys(templateSelected.value)
      emitActivityTemplate()
    }
  },
)

watch(sectorSelected, () => {
  templateSelected.value = ''
})

watch(
  () => props.modelValue,
  (val) => {
    isSyncingFromProps.value = true
    sectorSelected.value = val?.sector ?? ''
    templateSelected.value = val?.template ?? ''
    formData.value = { ...(val?.data ?? {}) }
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
      <ClientOnly>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="sector" class="text-sm font-medium">Sector</Label>
            <Select
              v-model="sectorSelected"
              @update:model-value="templateSelected = ''"
            >
              <SelectTrigger id="sector" class="w-full">
                <SelectValue placeholder="Seleccionar sector" />
              </SelectTrigger>
              <SelectContent class="bg-popover text-popover-foreground">
                <SelectItem
                  v-for="s in sectorsConfig"
                  :key="s.value"
                  :value="s.value"
                >
                  {{ s.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="template" class="text-sm font-medium">Plantilla</Label>
            <Select v-model="templateSelected">
              <SelectTrigger id="template" class="w-full">
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent class="bg-popover text-popover-foreground">
                <SelectItem
                  v-for="t in templateOptions"
                  :key="t.value"
                  :value="t.value"
                >
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ClientOnly>
      <p
        v-if="hasProductSelect"
        class="mt-3 text-xs text-muted-foreground"
      >
        La plantilla incluye selector de producto (ej. Café, Cacao, Bananito).
      </p>
    </div>

    <div v-if="currentSchema" class="rounded-lg border border-border p-4">
      <div v-if="loadingFlatData" class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
        Cargando valores configurados...
      </div>
      <CreditsDynamicFormRenderer
        v-else
        :key="`${templateSelected}-${formDataVersion}`"
        :schema="currentSchema"
        :template-key="templateSelected"
        :initial-data="formData"
        :read-only-field-keys="configuredFieldKeys"
        @update:form-data="setFormData"
      />
    </div>
    <div v-else class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      Elige un sector y una plantilla para cargar el formulario de actividad económica.
    </div>
  </div>
</template>
