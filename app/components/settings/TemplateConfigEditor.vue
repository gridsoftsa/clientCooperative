<script setup lang="ts">
import type { Ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  getTemplateConfigSchema,
  computeFormulaForConfig,
  EXCLUDED_CONFIG_KEYS,
  CERDOS_CEBA_DURACION_CICLO_MESES_DEFAULT,
  CERDOS_CRIA_DURACION_CICLO_DIAS_DEFAULT,
  CULTIVO_PERMANENTE_DURACION_MESES_DEFAULT,
  GANADO_DOBLE_CICLO_LECHE_MESES_DEFAULT,
  GANADO_DOBLE_CICLO_TERNEROS_MESES_DEFAULT,
  GANADO_DOBLE_TASA_MORTALIDAD_PCT_DEFAULT,
  SERVICIOS_PCT_CONTRIBUCION_DEFAULT,
  type TemplateConfigField,
} from '~/constants/template-config-schemas'
import {
  AVES_COST_BREAKDOWN,
  AVES_MORTALITY_KEY,
  AVES_MORTALITY_PCT,
} from '~/constants/aves-cost-breakdown'
import {
  CICLO_CORTO_COST_BREAKDOWN_DEFAULT,
  CICLO_CORTO_COST_BREAKDOWN_KEY,
} from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import { validateTemplateConfigPctSums } from '~/utils/template-config-percent-sums'
import {
  isRadicacionOptionCatalogTemplate,
  RADICACION_OPTION_CATALOG_FIELD_LABELS,
} from '~/constants/radicacion-catalog-templates'

interface FlatDataRecord {
  id: number
  template_key: string
  product_key: string | null
  config_data: Record<string, unknown>
  updated_at: string
}

const props = defineProps<{
  record: FlatDataRecord
  templateLabel: string
  productLabel: string
  saving: boolean
  canEdit: boolean
  canDelete?: boolean
  categoryId?: number
}>()

const emit = defineEmits<{
  save: [data: Record<string, unknown>]
  delete: []
}>()

const editing = ref(false)
const editedData = ref<Record<string, unknown>>({ ...props.record.config_data })
/** Misma ref: tipado ancho solo para v-model de `<Input />` (string | number) */
const cfgInputModel = editedData as Ref<Record<string, string | number | undefined>>

watch(() => props.record.config_data, (newVal) => {
  editedData.value = { ...newVal }
  if (props.record.template_key === 'ganado-doble-proposito') {
    const c = editedData.value.ciclo_produccion_terneros_meses
    if (c === undefined || c === null || c === '') {
      editedData.value.ciclo_produccion_terneros_meses = GANADO_DOBLE_CICLO_TERNEROS_MESES_DEFAULT
    }
    const cl = editedData.value.ciclo_produccion_leche
    if (cl === undefined || cl === null || cl === '') {
      editedData.value.ciclo_produccion_leche = GANADO_DOBLE_CICLO_LECHE_MESES_DEFAULT
    }
    const tm = editedData.value.pct_tasa_mortalidad
    if (tm === undefined || tm === null || tm === '') {
      editedData.value.pct_tasa_mortalidad = GANADO_DOBLE_TASA_MORTALIDAD_PCT_DEFAULT
    }
  }
  if (props.record.template_key === 'cerdos-cria') {
    const dd = editedData.value.duracion_ciclo_dias
    if (dd === undefined || dd === null || dd === '') {
      editedData.value.duracion_ciclo_dias = CERDOS_CRIA_DURACION_CICLO_DIAS_DEFAULT
    }
  }
  if (props.record.template_key === 'cerdos-ceba') {
    const dm = editedData.value.duracion_ciclo_meses
    if (dm === undefined || dm === null || dm === '') {
      editedData.value.duracion_ciclo_meses = CERDOS_CEBA_DURACION_CICLO_MESES_DEFAULT
    }
  }
  if (props.record.template_key === 'cultivo-permanente') {
    const du = editedData.value.duracion_meses
    if (du === undefined || du === null || du === '') {
      editedData.value.duracion_meses = CULTIVO_PERMANENTE_DURACION_MESES_DEFAULT
    }
  }
  if (props.record.template_key === 'servicios') {
    const pc = editedData.value.pct_contribucion
    if (pc === undefined || pc === null || pc === '') {
      const legacy = editedData.value.pct_contribucion_estandar
      editedData.value.pct_contribucion = legacy !== undefined && legacy !== null && legacy !== ''
        ? Number(legacy)
        : SERVICIOS_PCT_CONTRIBUCION_DEFAULT
    }
  }
  if (isRadicacionOptionCatalogTemplate(props.record.template_key) && !Array.isArray(editedData.value.options)) {
    editedData.value.options = []
  }
}, { immediate: true })

const schema = computed(() => getTemplateConfigSchema(props.record.template_key))

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function isNumericValue(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'number') return true
  if (typeof val === 'string') return /^-?\d*\.?\d*$/.test(val.trim()) || val === ''
  return false
}

function getComputedFormulaValue(field: TemplateConfigField): string {
  if (field.type !== 'formula' || !field.formulaKey) return '—'
  const val = computeFormulaForConfig(field.formulaKey, editedData.value)
  return val != null ? String(val) : '—'
}

function isMoneyKey(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('precio') || k.includes('costo') || k.includes('valor')
}

function isExcludedConfigKey(templateKey: string, key: string): boolean {
  return EXCLUDED_CONFIG_KEYS[templateKey]?.includes(key) ?? false
}

const visibleConfigEntries = computed(() =>
  Object.entries(editedData.value).filter(
    ([key]) => !isExcludedConfigKey(props.record.template_key, key),
  ),
)

/** Suma de % de discriminación no puede superar 100 % */
const pctSumValidation = computed(() =>
  validateTemplateConfigPctSums(props.record.template_key, editedData.value),
)

function handleSave() {
  let data = { ...editedData.value }
  const pctCheck = validateTemplateConfigPctSums(props.record.template_key, data)
  if (!pctCheck.ok) {
    toast.error(pctCheck.message)
    return
  }
  if (props.record.template_key === 'aves-ponedoras') {
    for (const group of AVES_COST_BREAKDOWN) {
      for (const item of group.items) {
        if (data[item.key] === undefined) data[item.key] = item.pct
      }
    }
    if (data[AVES_MORTALITY_KEY] === undefined) data[AVES_MORTALITY_KEY] = AVES_MORTALITY_PCT
  }
  if (props.record.template_key === 'cultivo-ciclo-corto') {
    const arr = data[CICLO_CORTO_COST_BREAKDOWN_KEY]
    if (!Array.isArray(arr) || arr.length === 0) {
      data[CICLO_CORTO_COST_BREAKDOWN_KEY] = [...CICLO_CORTO_COST_BREAKDOWN_DEFAULT]
    }
  }
  if (props.record.template_key === 'servicios') {
    delete data.pct_contribucion_estandar
  }
  if (isRadicacionOptionCatalogTemplate(props.record.template_key)) {
    const raw = Array.isArray(data.options) ? data.options : []
    const cleaned = raw
      .map((o) => {
        const row = o as Record<string, unknown>
        const label = String(row?.label ?? '').trim()
        let value = String(row?.value ?? '').trim()
        if (label === '')
          return null
        if (value === '')
          value = label
        return { value, label }
      })
      .filter((o): o is { value: string, label: string } => o != null)
    if (cleaned.length === 0) {
      toast.error('Añade al menos una opción con texto.')
      return
    }
    data = { options: cleaned }
  }
  emit('save', data)
  editing.value = false
}

function addRadicacionCatalogOption() {
  if (!Array.isArray(editedData.value.options)) {
    editedData.value.options = []
  }
  (editedData.value.options as Array<{ value: string; label: string }>).push({ value: '', label: '' })
}

function removeRadicacionCatalogOption(idx: number) {
  const opts = editedData.value.options
  if (!Array.isArray(opts)) {
    return
  }
  opts.splice(idx, 1)
}

const radicacionCatalogFieldTitle = computed(() => {
  const key = props.record.template_key
  return isRadicacionOptionCatalogTemplate(key) ? RADICACION_OPTION_CATALOG_FIELD_LABELS[key] : ''
})

/** Filtro local solo en parametrización de bancos (lista larga). */
const bancosCatalogSearch = ref('')

watch(
  () => props.record.template_key,
  () => {
    bancosCatalogSearch.value = ''
  },
)

const radicacionCatalogDisplayRows = computed(() => {
  const opts = Array.isArray(editedData.value.options)
    ? (editedData.value.options as Array<{ value: string, label: string }>)
    : []
  const key = props.record.template_key
  const rows = opts.map((opt, index) => ({ opt, index }))
  if (key !== 'bancos') {
    return rows
  }
  const q = bancosCatalogSearch.value.trim().toLowerCase()
  if (q === '') {
    return rows
  }
  return rows.filter(({ opt }) => {
    const label = String(opt?.label ?? '').toLowerCase()
    const value = String(opt?.value ?? '').toLowerCase()
    return label.includes(q) || value.includes(q)
  })
})

const bancosSearchHasNoResults = computed(() => {
  if (props.record.template_key !== 'bancos' || bancosCatalogSearch.value.trim() === '') {
    return false
  }
  const total = Array.isArray(editedData.value.options) ? editedData.value.options.length : 0
  return total > 0 && radicacionCatalogDisplayRows.value.length === 0
})

function handleCancel() {
  editedData.value = { ...props.record.config_data }
  bancosCatalogSearch.value = ''
  editing.value = false
}
</script>

<template>
  <div class="rounded-lg border bg-muted/30 p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium text-sm">
          {{ templateLabel }}
          <Badge v-if="productLabel !== 'Default (plantilla)'" variant="outline" class="ml-2 text-xs">
            {{ productLabel }}
          </Badge>
        </h4>
        <p class="text-xs text-muted-foreground">
          Última actualización: {{ new Date(record.updated_at).toLocaleString('es-CO') }}
        </p>
      </div>
      <div v-if="canEdit || canDelete" class="flex gap-2">
        <Button
          v-if="categoryId && canDelete"
          variant="destructive"
          size="sm"
          @click="emit('delete')"
        >
          <Icon name="i-lucide-trash-2" class="mr-1 h-4 w-4" />
          Eliminar
        </Button>
        <Button
          v-if="!editing"
          variant="warning"
          size="sm"
          @click="editing = true"
        >
          <Icon name="i-lucide-pencil" class="mr-1 h-4 w-4" />
          Editar
        </Button>
        <template v-else>
          <Button variant="outline" size="sm" :disabled="saving" @click="handleCancel">
            Cancelar
          </Button>
          <Button variant="default" size="sm" :disabled="saving || !pctSumValidation.ok" @click="handleSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 h-4 w-4 animate-spin" />
            Guardar
          </Button>
        </template>
      </div>
    </div>

    <Alert v-if="editing && !pctSumValidation.ok" variant="destructive">
      <AlertDescription>
        {{ pctSumValidation.message }}
      </AlertDescription>
    </Alert>

    <!-- Catálogos (radicación): una columna, mismo texto que en el desplegable -->
    <div v-if="isRadicacionOptionCatalogTemplate(record.template_key)" class="space-y-3">
      <p class="text-sm text-muted-foreground">
        Mismo texto que aparece en el desplegable de «{{ radicacionCatalogFieldTitle }}» al radicar.
      </p>
      <div
        v-if="record.template_key === 'bancos'"
        class="relative"
      >
        <Icon
          name="i-lucide-search"
          class="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="bancosCatalogSearch"
          type="search"
          class="h-9 pl-9"
          placeholder="Buscar banco…"
          autocomplete="off"
        />
      </div>
      <div class="overflow-x-auto rounded-md border bg-background">
        <div
          class="grid min-w-[12rem] grid-cols-[1fr_auto] gap-2 border-b bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Texto en el formulario de radicación</span>
          <span v-if="editing && canEdit" class="w-9 shrink-0" />
        </div>
        <div
          :class="record.template_key === 'bancos' ? 'max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain' : ''"
        >
          <div
            v-for="{ opt, index: idx } in radicacionCatalogDisplayRows"
            :key="idx"
            class="grid min-w-[12rem] grid-cols-[1fr_auto] items-center gap-2 border-b border-border/80 px-3 py-2 last:border-b-0"
          >
            <Input
              v-model="opt.label"
              class="h-9"
              :disabled="!editing || !canEdit"
              :placeholder="record.template_key === 'bancos' ? 'Nombre del banco' : 'Ej.: Masculino'"
            />
            <Button
              v-if="editing && canEdit"
              type="button"
              variant="ghost"
              size="icon"
              class="shrink-0"
              :aria-label="`Eliminar opción ${idx + 1}`"
              @click="removeRadicacionCatalogOption(idx)"
            >
              <Icon name="i-lucide-trash-2" class="size-4" />
            </Button>
          </div>
          <p
            v-if="bancosSearchHasNoResults"
            class="px-3 py-6 text-center text-sm text-muted-foreground"
          >
            Ningún banco coincide con la búsqueda. Borra el filtro o prueba otras letras.
          </p>
        </div>
      </div>
      <Button
        v-if="editing && canEdit"
        type="button"
        variant="outline"
        size="sm"
        @click="addRadicacionCatalogOption"
      >
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Añadir opción
      </Button>
    </div>

    <!-- Con schema (ganado-ceba, etc.): orden, tipos, fórmula -->
    <template v-else-if="schema">
      <template v-for="section in schema.sections" :key="section.key">
        <!-- Tabla desglose de costos (aves-ponedoras) -->
        <div v-if="section.layout === 'avesCostBreakdownTable'" class="space-y-3">
          <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.title }}
          </h5>
          <SettingsAvesCostBreakdownConfig
            :edited-data="editedData"
            :editing="editing"
            :can-edit="canEdit"
            @update:field="({ key, value }) => (editedData[key] = value)"
          />
        </div>
        <!-- Tabla FINAGRO (cultivo-permanente) -->
        <div v-else-if="section.layout === 'cultivoPermanenteFinagroTable'" class="space-y-3">
          <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.title }}
          </h5>
          <SettingsCultivoPermanenteFinagroConfig
            :edited-data="editedData"
            :editing="editing"
            :can-edit="canEdit"
            @update:field="({ key, value }) => (editedData[key] = value)"
          />
        </div>
        <!-- Tabla discriminación de costos (cultivo-ciclo-corto) -->
        <div v-else-if="section.layout === 'cultivoCicloCortoCostBreakdownTable'" class="space-y-3">
          <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.title }}
          </h5>
          <SettingsCultivoCicloCortoCostBreakdownConfig
            :edited-data="editedData"
            :editing="editing"
            :can-edit="canEdit"
            @update:field="({ key, value }) => (editedData[key] = value)"
          />
        </div>
        <!-- Información de referencia (cultivo-permanente) -->
        <div v-else-if="section.layout === 'cultivoPermanenteReferencia'" class="space-y-3">
          <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.title }}
          </h5>
          <SettingsCultivoPermanenteReferenciaConfig
            :edited-data="editedData"
            :editing="editing"
            :can-edit="canEdit"
            @update:field="({ key, value }) => (editedData[key] = value)"
          />
        </div>
        <!-- Sección estándar (grid de campos) -->
        <div v-else class="space-y-3">
          <h5 v-if="section.title" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.title }}
          </h5>
          <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
          <template v-for="field in section.fields.filter(f => !f.hidden)" :key="field.key">
            <!-- Campo fórmula (solo lectura) -->
            <div v-if="field.type === 'formula'" class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
                <span v-if="field.formulaDisplay" class="text-muted-foreground font-normal">
                  ({{ field.formulaDisplay }})
                </span>
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                :model-value="getComputedFormulaValue(field)"
                type="text"
                readonly
                disabled
                class="h-8 text-sm bg-muted/50 cursor-default"
                placeholder="—"
              />
            </div>
            <!-- Campo dinero -->
            <div v-else-if="field.type === 'money'" class="flex flex-col gap-1 min-w-0">
              <CreditsBaseMoneyInput
                :model-value="(editedData[field.key] as number | null) ?? null"
                :label="field.label"
                class="[&_input]:h-8 [&_input]:text-sm"
                :disabled="!editing || !canEdit"
                placeholder="0"
                @update:model-value="(v) => (editedData[field.key] = v)"
              />
            </div>
            <!-- Campo número -->
            <div v-else-if="field.type === 'number'" class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                v-model="cfgInputModel[field.key]"
                type="number"
                step="0.01"
                class="h-8 text-sm"
                :disabled="!editing || !canEdit"
                placeholder="—"
                @keydown.enter.prevent="handleSave"
              />
            </div>
            <!-- Campo texto -->
            <div v-else class="flex flex-col gap-1 min-w-0">
              <Label :for="`cfg-${record.id}-${field.key}`" class="text-xs">
                {{ field.label }}
              </Label>
              <Input
                :id="`cfg-${record.id}-${field.key}`"
                v-model="cfgInputModel[field.key]"
                type="text"
                class="h-8 text-sm"
                :disabled="!editing || !canEdit"
                placeholder="—"
                @keydown.enter.prevent="handleSave"
              />
            </div>
          </template>
        </div>
        </div>
      </template>
    </template>

    <!-- Sin schema: fallback genérico (no aplica a catálogos de opciones de radicación) -->
    <div v-else-if="!isRadicacionOptionCatalogTemplate(record.template_key)" class="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
      <div
        v-for="[key, value] in visibleConfigEntries"
        :key="key"
        class="flex flex-col gap-1 min-w-0"
      >
        <CreditsBaseMoneyInput
          v-if="isMoneyKey(key)"
          :model-value="(value as number | null) ?? null"
          :label="formatKey(key)"
          class="[&_input]:h-8 [&_input]:text-sm"
          :disabled="!editing || !canEdit"
          placeholder="0"
          @update:model-value="(v) => (editedData[key] = v)"
        />
        <template v-else>
          <Label :for="`cfg-${record.id}-${key}`" class="text-xs">
            {{ formatKey(key) }}
          </Label>
          <Input
            v-if="isNumericValue(value)"
            :id="`cfg-${record.id}-${key}`"
            v-model="cfgInputModel[key]"
            type="number"
            step="0.01"
            class="h-8 text-sm"
            :disabled="!editing || !canEdit"
            placeholder="—"
            @keydown.enter.prevent="handleSave"
          />
          <Input
            v-else
            :id="`cfg-${record.id}-${key}`"
            v-model="cfgInputModel[key]"
            type="text"
            class="h-8 text-sm"
            :disabled="!editing || !canEdit"
            placeholder="—"
            @keydown.enter.prevent="handleSave"
          />
        </template>
      </div>
    </div>
  </div>
</template>
