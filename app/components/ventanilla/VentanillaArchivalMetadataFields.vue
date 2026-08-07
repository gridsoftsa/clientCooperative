<script setup lang="ts">
import { onDigitsOnlyInput } from '~/utils/digits-only-input'
import { ventanillaInputErrorClass } from '~/utils/ventanilla-form-field-focus'
import type { ArchivalMetadataFieldRow, ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'

const { formatPesosConSimbolo: formatCurrency, parsePesosInput: parseCurrency } = usePesosFormat()

const props = defineProps<{
  docDocumentTypeId: number | null | undefined
  functionalTypeKey: string | null | undefined
  modelValue: Record<string, unknown>
  disabled?: boolean
  submitAttempted?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const metaApi = useArchivalMetadataApi()
const resolvedSchema = ref<ArchivalMetadataSchemaRow | null>(null)
const loading = ref(false)

const values = computed({
  get: () => props.modelValue ?? {},
  set: (v: Record<string, unknown>) => emit('update:modelValue', v),
})

watch(
  () => [props.docDocumentTypeId, props.functionalTypeKey] as const,
  async (value: readonly [number | null | undefined, string | null | undefined]) => {
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

function currencyDisplay(code: string): string {
  const raw = values.value[code]
  if (raw === null || raw === undefined || raw === '') {
    return ''
  }
  const num = typeof raw === 'number' ? raw : parseCurrency(String(raw))
  return num != null ? formatCurrency(num) : String(raw)
}

function updateCurrencyField(code: string, input: string | number) {
  updateField(code, parseCurrency(String(input)) ?? input)
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
  <div v-if="loading" class="text-muted-foreground py-1 text-xs">
    Cargando metadatos…
  </div>
  <div v-else-if="activeFields.length" class="space-y-3 rounded-lg border border-dashed border-primary/30 bg-muted/15 p-3">
    <p class="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
      Metadatos archivísticos
      <span v-if="resolvedSchema" class="font-normal normal-case">({{ resolvedSchema.name }})</span>
    </p>
    <div
      v-for="(field, idx) in activeFields"
      :key="field.code"
      class="space-y-1"
    >
      <Label :for="fieldId(field, idx)" class="text-xs">
        {{ field.name }}
        <span v-if="field.is_required" class="text-destructive">*</span>
      </Label>
      <Textarea
        v-if="field.data_type === 'textarea'"
        :id="fieldId(field, idx)"
        :model-value="String(values[field.code] ?? '')"
        :disabled="disabled"
        rows="2"
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
      <div v-else-if="field.data_type === 'boolean'" class="flex items-center gap-2">
        <Checkbox
          :id="fieldId(field, idx)"
          :model-value="Boolean(values[field.code])"
          :disabled="disabled"
          @update:model-value="updateField(field.code, $event)"
        />
        <span class="text-muted-foreground text-xs">Sí</span>
      </div>
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
      <Input
        v-else-if="field.data_type === 'currency'"
        :id="fieldId(field, idx)"
        inputmode="decimal"
        :model-value="currencyDisplay(field.code)"
        :disabled="disabled"
        placeholder="$ 0"
        :class="metadataFieldErrorClass(field)"
        @update:model-value="updateCurrencyField(field.code, $event)"
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
      <Select
        v-else-if="field.data_type === 'select'"
        :model-value="values[field.code] != null ? String(values[field.code]) : undefined"
        :disabled="disabled"
        @update:model-value="updateField(field.code, $event)"
      >
        <SelectTrigger :id="fieldId(field, idx)" :class="metadataFieldErrorClass(field)">
          <SelectValue placeholder="Seleccione…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in field.options ?? []"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
