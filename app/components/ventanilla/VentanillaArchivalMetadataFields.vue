<script setup lang="ts">
import { onDigitsOnlyInput } from '~/utils/digits-only-input'
import { ventanillaInputErrorClass, ventanillaMultiselectErrorClass } from '~/utils/ventanilla-form-field-focus'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'

const { parsePesosInput: parseCurrency } = usePesosFormat()

const props = defineProps<{
  docDocumentTypeId: number | null | undefined
  functionalTypeKey: string | null | undefined
  modelValue: Record<string, unknown>
  schema?: {
    id?: number
    name?: string
    fields?: ArchivalMetadataFieldRow[]
  } | null
  disabled?: boolean
  submitAttempted?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const metaApi = useArchivalMetadataApi()
const resolvedSchema = ref<{
  id?: number
  name?: string
  fields?: ArchivalMetadataFieldRow[]
} | null>(null)
const loading = ref(false)

const values = computed({
  get: () => props.modelValue ?? {},
  set: (v: Record<string, unknown>) => emit('update:modelValue', v),
})

watch(
  () => props.schema,
  (schema) => {
    if (schema !== undefined) {
      resolvedSchema.value = schema
    }
  },
  { immediate: true },
)

watch(
  () => [props.docDocumentTypeId, props.functionalTypeKey] as const,
  async (value: readonly [number | null | undefined, string | null | undefined]) => {
    if (props.schema !== undefined) {
      return
    }

    const [docDocumentTypeId, functionalTypeKey] = value
    resolvedSchema.value = null
    if ((!docDocumentTypeId || docDocumentTypeId < 1) && !functionalTypeKey) {
      return
    }

    loading.value = true
    try {
      resolvedSchema.value = await metaApi.resolveSchema({
        doc_document_type_id: docDocumentTypeId,
        functional_type_key: functionalTypeKey,
      })
    } catch {
      resolvedSchema.value = null
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const activeFields = computed(() =>
  (resolvedSchema.value?.fields ?? [])
    .filter((f: ArchivalMetadataFieldRow) => f.is_active !== false)
    .sort((a: ArchivalMetadataFieldRow, b: ArchivalMetadataFieldRow) => a.sort_order - b.sort_order),
)

function updateField(code: string, raw: unknown) {
  values.value = { ...values.value, [code]: raw }
}

function updateDigitsField(code: string, input: string) {
  updateField(code, input.replace(/\D+/g, ''))
}

function fieldId(f: ArchivalMetadataFieldRow, idx: number) {
  return `ventanilla_meta_${f.code}_${idx}`
}

function isRequiredFieldMissing(field: ArchivalMetadataFieldRow): boolean {
  if (!field.is_required) {
    return false
  }
  const value = values.value[field.code]

  return value === null || value === undefined || value === ''
}

function metadataFieldErrorClass(field: ArchivalMetadataFieldRow): string {
  return ventanillaInputErrorClass(Boolean(props.submitAttempted && isRequiredFieldMissing(field)))
}

function metadataMultiselectErrorClass(field: ArchivalMetadataFieldRow): string {
  return ventanillaMultiselectErrorClass(Boolean(props.submitAttempted && isRequiredFieldMissing(field)))
}

function fieldCellClass(field: ArchivalMetadataFieldRow): string {
  return field.data_type === 'textarea' ? 'space-y-1.5 md:col-span-2' : 'space-y-1.5'
}

function selectOptions(field: ArchivalMetadataFieldRow): Array<{ value: string, label: string }> {
  return (field.options ?? []).map(option => ({
    value: String(option.value),
    label: option.label,
  }))
}

function selectValue(field: ArchivalMetadataFieldRow): string | null {
  const raw = values.value[field.code]

  if (raw === null || raw === undefined || raw === '') {
    return null
  }

  return String(raw)
}

function booleanValue(field: ArchivalMetadataFieldRow): boolean {
  return Boolean(values.value[field.code])
}

function currencyValue(field: ArchivalMetadataFieldRow): number | null {
  const raw = values.value[field.code]
  if (typeof raw === 'number') {
    return raw
  }

  return parseCurrency(String(raw ?? '')) ?? null
}

function findFirstMissingRequiredField(): {
  fieldCode: string
  fieldIndex: number
  message: string
} | null {
  for (const [idx, field] of activeFields.value.entries()) {
    if (!isRequiredFieldMissing(field)) {
      continue
    }

    return {
      fieldCode: field.code,
      fieldIndex: idx,
      message: `Complete el metadato obligatorio: ${field.name}`,
    }
  }

  return null
}

function focusMissingField(fieldCode: string, fieldIndex: number): void {
  const id = `ventanilla_meta_${fieldCode}_${fieldIndex}`
  const root = document.getElementById(id)
  if (!root) {
    return
  }

  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })

    return
  }

  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function validateRequiredFields(): string | null {
  return findFirstMissingRequiredField()?.message ?? null
}

defineExpose({
  validateRequiredFields,
  findFirstMissingRequiredField,
  focusMissingField,
})
</script>

<template>
  <div v-if="loading" class="text-sm text-muted-foreground">
    Cargando metadatos…
  </div>
  <div v-else-if="activeFields.length" class="space-y-4">
    <p v-if="resolvedSchema?.name" class="text-xs text-muted-foreground">
      Esquema: {{ resolvedSchema.name }}
    </p>
    <div class="grid gap-4 md:grid-cols-2">
      <div
        v-for="(field, idx) in activeFields"
        :key="field.code"
        :class="fieldCellClass(field)"
      >
        <label
          v-if="field.data_type === 'boolean'"
          :for="fieldId(field, idx)"
          class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2.5"
          :class="[
            metadataFieldErrorClass(field),
            disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/40',
          ]"
        >
          <Checkbox
            bare
            :id="fieldId(field, idx)"
            :checked="booleanValue(field)"
            :disabled="disabled"
            @update:checked="updateField(field.code, $event === true)"
          />
          <span class="text-sm leading-snug">
            {{ field.name }}
            <span v-if="field.is_required" class="text-destructive">*</span>
          </span>
        </label>

        <template v-else>
          <Label :for="fieldId(field, idx)">
            {{ field.name }}
            <span v-if="field.is_required" class="text-destructive">*</span>
          </Label>
          <Textarea
            v-if="field.data_type === 'textarea'"
            :id="fieldId(field, idx)"
            :model-value="String(values[field.code] ?? '')"
            :disabled="disabled"
            rows="3"
            :class="metadataFieldErrorClass(field)"
            @update:model-value="updateField(field.code, $event)"
          />
          <Input
            v-else-if="field.data_type === 'text' || field.data_type === 'number'"
            :id="fieldId(field, idx)"
            :type="field.data_type === 'number' ? 'number' : 'text'"
            :model-value="values[field.code] != null ? String(values[field.code]) : ''"
            :disabled="disabled"
            :class="metadataFieldErrorClass(field)"
            @update:model-value="updateField(field.code, field.data_type === 'number' ? Number($event) : $event)"
          />
          <Input
            v-else-if="field.data_type === 'date'"
            :id="fieldId(field, idx)"
            type="date"
            :model-value="String(values[field.code] ?? '')"
            :disabled="disabled"
            :class="metadataFieldErrorClass(field)"
            @update:model-value="updateField(field.code, $event)"
          />
          <Input
            v-else-if="field.data_type === 'email'"
            :id="fieldId(field, idx)"
            type="email"
            :model-value="String(values[field.code] ?? '')"
            :disabled="disabled"
            placeholder="correo@ejemplo.com"
            :class="metadataFieldErrorClass(field)"
            @update:model-value="updateField(field.code, $event)"
          />
          <CreditsBaseMoneyInput
            v-else-if="field.data_type === 'currency'"
            :input-id="fieldId(field, idx)"
            :model-value="currencyValue(field)"
            :disabled="disabled"
            :invalid="Boolean(submitAttempted && isRequiredFieldMissing(field))"
            @update:model-value="updateField(field.code, $event)"
          />
          <Input
            v-else-if="field.data_type === 'nit' || field.data_type === 'identifier'"
            :id="fieldId(field, idx)"
            inputmode="numeric"
            :model-value="String(values[field.code] ?? '')"
            :disabled="disabled"
            :placeholder="field.data_type === 'nit' ? 'Solo números (NIT)' : 'Solo números'"
            :class="metadataFieldErrorClass(field)"
            @input="onDigitsOnlyInput($event, v => updateDigitsField(field.code, v))"
          />
          <ArchivalSingleMultiselect
            v-else-if="field.data_type === 'select'"
            :id="fieldId(field, idx)"
            :model-value="selectValue(field)"
            :options="selectOptions(field)"
            :disabled="disabled"
            :class="metadataMultiselectErrorClass(field)"
            placeholder="Buscar o seleccionar"
            no-options-text="Sin opciones"
            no-results-text="Sin coincidencias"
            @update:model-value="updateField(field.code, $event ?? '')"
          />
        </template>
      </div>
    </div>
  </div>
</template>
