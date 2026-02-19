<script setup lang="ts">
/**
 * Motor de renderizado de formularios dinámicos a partir de schema JSON.
 * Soporta: money, select, date, number, text.
 */
import type { FormSchemaInput } from '~/types/credits'

const props = withDefaults(
  defineProps<{
    schema: FormSchemaInput
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
              <Label v-if="field.label" :for="`field-${field.key}`" class="text-sm font-medium">
                {{ field.label }}
              </Label>
              <select
                :id="`field-${field.key}`"
                v-model="formData[field.key]"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option
                  v-for="opt in (field.options ?? [])"
                  :key="String(opt.value)"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
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
