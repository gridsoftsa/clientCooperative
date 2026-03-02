<script setup lang="ts">
/**
 * Motor de renderizado de formularios dinámicos a partir de schema JSON.
 * Soporta: money, select, date, number, text, computed.
 */
import type { FormSchemaInput } from '~/types/credits'
import { computeFormula } from '~/constants/credits-financial-templates'

const props = withDefaults(
  defineProps<{
    schema: FormSchemaInput
    templateKey?: string
    initialData?: Record<string, unknown>
  }>(),
  {
    initialData: () => ({}),
  },
)

const emit = defineEmits<{
  'update:formData': [data: Record<string, unknown>]
}>()

/** Objeto reactivo keyed por field.key; valores por defecto según tipo */
function buildInitialFormData(): Record<string, unknown> {
  const data: Record<string, unknown> = { ...props.initialData }
  for (const section of props.schema.sections) {
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

/** Input nativo estilizado (compartido) */
const inputBaseClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <form class="space-y-6">
    <fieldset
      v-for="(section, idx) in schema.sections"
      :key="section.key ?? idx"
      class="rounded-lg border border-border p-4"
    >
      <legend class="text-sm font-semibold text-foreground">
        {{ section.title }}
      </legend>
      <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <template v-for="field in section.fields" :key="field.key">
          <div :class="['grid gap-2', gridColClass(field.cols)]">
            <!-- money -->
            <template v-if="field.type === 'money'">
              <CreditsBaseMoneyInput
                :model-value="(formData[field.key] as number | null) ?? null"
                :label="field.label"
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
                :class="inputBaseClass"
              >
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
                :class="inputBaseClass"
              >
            </template>
          </div>
        </template>
      </div>
    </fieldset>
  </form>
</template>
