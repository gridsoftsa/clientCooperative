<script setup lang="ts">
import Multiselect from '@vueform/multiselect'

export interface OrgInstitutionalProcessOption {
  id: number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: OrgInstitutionalProcessOption[]
    inputId: string
    label: string
    helperText?: string
    disabled?: boolean
    placeholder?: string
    noOptionsText?: string
    noResultsText?: string
  }>(),
  {
    helperText: '',
    disabled: false,
    placeholder: 'Busque y seleccione áreas',
    noOptionsText: 'Sin áreas disponibles',
    noResultsText: 'Sin coincidencias',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const multiselectOptions = computed(() =>
  props.options.map(o => ({ value: o.id, label: o.label })),
)

const selected = ref<number[]>([...props.modelValue])

function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const sa = [...a].sort((x, y) => x - y)
  const sb = [...b].sort((x, y) => x - y)

  return sa.every((v, i) => v === sb[i])
}

function areasMultipleLabel(values: unknown): string {
  const ids = (Array.isArray(values) ? values : [])
    .map((v) => {
      if (typeof v === 'number') {
        return v
      }
      if (v && typeof v === 'object' && 'value' in v) {
        return Number((v as { value: unknown }).value)
      }

      return Number(v)
    })
    .filter(id => Number.isFinite(id))

  if (ids.length === 0) {
    return props.placeholder
  }

  const labels = ids.map((id) => {
    const opt = multiselectOptions.value.find(o => o.value === id)

    return opt?.label ?? String(id)
  })

  if (labels.length === 1) {
    return labels[0]!
  }

  return `${labels.length} áreas seleccionadas: ${labels.join(', ')}`
}

watch(
  () => props.modelValue,
  (v) => {
    if (!sameIds(selected.value, v)) {
      selected.value = [...v]
    }
  },
  { deep: true },
)

watch(
  selected,
  (v) => {
    if (props.disabled) {
      return
    }
    if (!sameIds(v, props.modelValue)) {
      emit('update:modelValue', [...v])
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-3 text-left w-full">
    <div class="space-y-1.5 text-left">
      <Label :for="inputId" class="text-base leading-snug">{{ label }}</Label>
      <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
        {{ helperText }}
      </p>
    </div>
    <div class="org-inst-processes-ms w-full">
      <ClientOnly>
        <Multiselect
          :id="inputId"
          v-model="selected"
          mode="tags"
          :object="false"
          :options="multiselectOptions"
          value-prop="value"
          label="label"
          :searchable="true"
          :close-on-select="false"
          :can-clear="true"
          :hide-selected="false"
          :disabled="disabled"
          :placeholder="placeholder"
          :no-options-text="noOptionsText"
          :no-results-text="noResultsText"
          :multiple-label="areasMultipleLabel"
          class="multiselect-org-inst-processes org-areas-ms-tags w-full max-w-xl"
        />
        <template #fallback>
          <div class="flex h-11 w-full max-w-xl items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
            Cargando áreas…
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.org-inst-processes-ms :deep(.multiselect) {
  margin-left: 0 !important;
  margin-right: auto !important;
}

.org-inst-processes-ms :deep(.multiselect-wrapper) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  justify-content: flex-start !important;
  flex-wrap: wrap;
  min-height: 2.75rem;
  gap: 0.25rem;
  padding-block: 0.25rem;
}

.org-inst-processes-ms :deep(.multiselect-org-inst-processes) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.25rem;
  --ms-px: 0.75rem;
  --ms-tag-bg: var(--accent);
  --ms-tag-color: var(--accent-foreground);
  --ms-dropdown-radius: 0.375rem;
  --ms-max-height: 14rem;
  --ms-placeholder-color: var(--muted-foreground);
  min-height: 2.75rem;
  height: auto;
  width: 100%;
  min-width: 0;
  text-align: left;
  color: var(--foreground);
}

.org-inst-processes-ms :deep(.multiselect-placeholder) {
  text-align: left;
  color: var(--muted-foreground) !important;
}

.org-inst-processes-ms :deep(.multiselect-tag) {
  max-width: 100%;
}

.org-inst-processes-ms :deep(.multiselect-tag-wrapper) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-inst-processes-ms :deep(.multiselect-tags-search) {
  justify-content: flex-start !important;
}

html.dark .org-inst-processes-ms :deep(.multiselect-org-inst-processes),
.dark .org-inst-processes-ms :deep(.multiselect-org-inst-processes) {
  --ms-bg: color-mix(in srgb, var(--input) 30%, transparent);
  --ms-border-color: var(--border);
  --ms-placeholder-color: color-mix(in srgb, var(--foreground) 58%, var(--muted-foreground));
  --ms-tag-bg: var(--accent);
  --ms-tag-color: var(--accent-foreground);
}

html.dark .org-inst-processes-ms :deep(.multiselect-placeholder),
.dark .org-inst-processes-ms :deep(.multiselect-placeholder) {
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted-foreground)) !important;
}

html.dark .org-inst-processes-ms :deep(.multiselect-tags-search),
.dark .org-inst-processes-ms :deep(.multiselect-tags-search) {
  background: transparent !important;
  color: var(--foreground) !important;
}
</style>
