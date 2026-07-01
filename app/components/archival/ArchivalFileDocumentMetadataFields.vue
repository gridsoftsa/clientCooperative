<script setup lang="ts">
import { onDigitsOnlyInput } from '~/utils/digits-only-input'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import { metadataFieldSourceLabel } from '~/utils/archival-file-upload'

const { formatPesosConSimbolo: formatCurrency, parsePesosInput: parseCurrency } = usePesosFormat()

const props = defineProps<{
  fields: ArchivalMetadataFieldRow[]
  modelValue: Record<string, unknown>
  fieldSources?: Record<string, string>
  fieldConfidence?: Record<string, number>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'update:fieldSources': [value: Record<string, string>]
}>()

const values = computed({
  get: () => props.modelValue ?? {},
  set: (v: Record<string, unknown>) => emit('update:modelValue', v),
})

const sources = computed({
  get: () => props.fieldSources ?? {},
  set: (v: Record<string, string>) => emit('update:fieldSources', v),
})

const activeFields = computed(() =>
  [...props.fields]
    .filter((f: ArchivalMetadataFieldRow) => f.is_active !== false)
    .sort((a: ArchivalMetadataFieldRow, b: ArchivalMetadataFieldRow) => a.sort_order - b.sort_order),
)

function updateField(code: string, raw: unknown) {
  const nextSources = { ...sources.value }
  if (nextSources[code] === 'reused' || nextSources[code] === 'ocr') {
    nextSources[code] = 'manual'
  }
  else if (!nextSources[code]) {
    nextSources[code] = 'manual'
  }

  sources.value = nextSources
  values.value = { ...values.value, [code]: raw }
}

function clearSuggestion(code: string) {
  const nextValues = { ...values.value }
  const nextSources = { ...sources.value }
  delete nextValues[code]
  delete nextSources[code]
  values.value = nextValues
  sources.value = nextSources
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
  return `archival_file_meta_${f.code}_${idx}`
}

function sourceBadgeVariant(source: string | undefined): 'secondary' | 'outline' | 'default' {
  if (source === 'reused') {
    return 'secondary'
  }
  if (source === 'ocr') {
    return 'default'
  }

  return 'outline'
}

defineExpose({
  activeFields,
})
</script>

<template>
  <div v-if="activeFields.length" class="space-y-3 rounded-lg border border-dashed border-primary/30 bg-muted/15 p-3">
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Metadatos del documento
    </p>

    <div
      v-for="(field, idx) in activeFields"
      :key="field.code"
      class="space-y-1"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Label :for="fieldId(field, idx)" class="text-xs">
          {{ field.name }}
          <span v-if="field.is_required" class="text-destructive">*</span>
        </Label>
        <Badge
          v-if="metadataFieldSourceLabel(sources[field.code], fieldConfidence?.[field.code])"
          :variant="sourceBadgeVariant(sources[field.code])"
          class="text-[10px]"
        >
          {{ metadataFieldSourceLabel(sources[field.code], fieldConfidence?.[field.code]) }}
        </Badge>
        <Badge v-if="field.is_variable" variant="outline" class="text-[10px]">
          Variable
        </Badge>
        <Badge v-else-if="field.is_reusable" variant="outline" class="text-[10px]">
          Reutilizable
        </Badge>
        <Button
          v-if="sources[field.code] === 'reused' || sources[field.code] === 'ocr'"
          type="button"
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-[10px]"
          :disabled="disabled"
          @click="clearSuggestion(field.code)"
        >
          Rechazar sugerencia
        </Button>
      </div>

      <Textarea
        v-if="field.data_type === 'textarea'"
        :id="fieldId(field, idx)"
        :model-value="String(values[field.code] ?? '')"
        :disabled="disabled"
        rows="2"
        @update:model-value="updateField(field.code, $event)"
      />
      <Input
        v-else-if="field.data_type === 'text' || field.data_type === 'number'"
        :id="fieldId(field, idx)"
        :type="field.data_type === 'number' ? 'number' : 'text'"
        :model-value="values[field.code] != null ? String(values[field.code]) : ''"
        :disabled="disabled"
        @update:model-value="updateField(field.code, field.data_type === 'number' ? Number($event) : $event)"
      />
      <Input
        v-else-if="field.data_type === 'date'"
        :id="fieldId(field, idx)"
        type="date"
        :model-value="String(values[field.code] ?? '')"
        :disabled="disabled"
        @update:model-value="updateField(field.code, $event)"
      />
      <div v-else-if="field.data_type === 'boolean'" class="flex items-center gap-2">
        <Checkbox
          :id="fieldId(field, idx)"
          :model-value="Boolean(values[field.code])"
          :disabled="disabled"
          @update:model-value="updateField(field.code, $event)"
        />
        <span class="text-xs text-muted-foreground">Sí</span>
      </div>
      <Input
        v-else-if="field.data_type === 'email'"
        :id="fieldId(field, idx)"
        type="email"
        :model-value="String(values[field.code] ?? '')"
        :disabled="disabled"
        placeholder="correo@ejemplo.com"
        @update:model-value="updateField(field.code, $event)"
      />
      <Input
        v-else-if="field.data_type === 'currency'"
        :id="fieldId(field, idx)"
        inputmode="decimal"
        :model-value="currencyDisplay(field.code)"
        :disabled="disabled"
        placeholder="$ 0"
        @update:model-value="updateCurrencyField(field.code, $event)"
      />
      <Input
        v-else-if="field.data_type === 'nit' || field.data_type === 'identifier'"
        :id="fieldId(field, idx)"
        inputmode="numeric"
        :model-value="String(values[field.code] ?? '')"
        :disabled="disabled"
        :placeholder="field.data_type === 'nit' ? 'Solo números (NIT)' : 'Solo números'"
        @input="onDigitsOnlyInput($event, v => updateDigitsField(field.code, v))"
      />
      <Select
        v-else-if="field.data_type === 'select'"
        :model-value="values[field.code] != null ? String(values[field.code]) : undefined"
        :disabled="disabled"
        @update:model-value="updateField(field.code, $event)"
      >
        <SelectTrigger :id="fieldId(field, idx)">
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
