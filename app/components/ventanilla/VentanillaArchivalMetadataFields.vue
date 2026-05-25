<script setup lang="ts">
import type { ArchivalMetadataFieldRow, ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'

const props = defineProps<{
  docDocumentTypeId: number | null | undefined
  functionalTypeKey: string | null | undefined
  modelValue: Record<string, unknown>
  disabled?: boolean
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

function fieldId(f: ArchivalMetadataFieldRow, idx: number) {
  return `ventanilla_meta_${f.code}_${idx}`
}
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
        <span class="text-muted-foreground text-xs">Sí</span>
      </div>
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
