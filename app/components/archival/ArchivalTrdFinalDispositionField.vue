<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import {
  TRD_DISPOSITION_OPTIONS,
  TRD_FINAL_DISPOSITION_LABELS,
  type TrdFinalDispositionValue,
} from '~/constants/archival-trd'

defineProps<{
  id?: string
  disabled?: boolean
}>()

const model = defineModel<string[]>({ default: () => [] })

const dispositionOptions = [...TRD_DISPOSITION_OPTIONS]

function formatMultipleDispositionLabel(
  values: Array<string | { value?: string, label?: string }>,
): string {
  if (!values?.length) {
    return ''
  }

  return values
    .map((entry) => {
      if (entry && typeof entry === 'object' && entry.label) {
        return entry.label
      }

      const value = typeof entry === 'string' ? entry : entry?.value

      return value ? (TRD_FINAL_DISPOSITION_LABELS[value as TrdFinalDispositionValue] ?? value) : ''
    })
    .filter(Boolean)
    .join(', ')
}
</script>

<template>
  <div class="trd-final-disposition-ms w-full">
    <Multiselect
      :id="id"
      v-model="model"
      mode="tags"
      :object="false"
      :options="dispositionOptions"
      value-prop="value"
      label="label"
      :searchable="false"
      :close-on-select="false"
      :hide-selected="false"
      :create-option="false"
      :disabled="disabled"
      placeholder="Seleccione disposición…"
      no-options-text="Sin opciones"
      no-results-text="Sin coincidencias"
      :multiple-label="formatMultipleDispositionLabel"
      class="multiselect-trd-final-disposition w-full"
    />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.375rem;
  --ms-radius: 0.375rem;
  --ms-border-width: 1px;
  --ms-border-color: var(--border);
  --ms-border-color-active: var(--ring);
  --ms-ring-color: color-mix(in srgb, var(--ring) 50%, transparent);
  --ms-bg: var(--background);
  --ms-placeholder-color: var(--muted-foreground);
  --ms-caret-color: var(--muted-foreground);
  --ms-tag-font-size: 0.8125rem;
  --ms-tag-font-weight: 500;
  --ms-tag-bg: var(--primary);
  --ms-tag-color: var(--primary-foreground);
  --ms-tag-radius: 0.25rem;
  --ms-tag-py: 0.2rem;
  --ms-tag-px: 0.5rem;
  --ms-py: 0.5rem;
  --ms-px: 0.75rem;
  --ms-dropdown-radius: 0.375rem;
  --ms-dropdown-border-color: var(--border);
  --ms-dropdown-bg: var(--popover);
  --ms-option-font-size: 0.875rem;
  --ms-option-bg-pointed: var(--accent);
  --ms-option-color-pointed: var(--accent-foreground);
  --ms-option-bg-selected: color-mix(in srgb, var(--primary) 12%, transparent);
  --ms-option-color-selected: var(--foreground);
  --ms-option-bg-selected-pointed: color-mix(in srgb, var(--primary) 18%, transparent);
  --ms-option-color-selected-pointed: var(--foreground);
  min-height: 2.25rem;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border) !important;
  background-color: var(--background);
  color: var(--foreground);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition.is-active) {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-wrapper) {
  min-height: 2.25rem;
  align-items: center;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-tags) {
  gap: 0.375rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-tag) {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  margin: 0;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-tag-wrapper) {
  color: var(--primary-foreground);
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-tag-remove-icon) {
  opacity: 0.85;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-multiple-label) {
  color: var(--foreground);
  padding-left: 0.125rem;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-placeholder) {
  color: var(--muted-foreground);
  padding-left: 0.125rem;
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-caret) {
  margin-right: 0.75rem;
  color: var(--muted-foreground);
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-dropdown) {
  border: 1px solid var(--border);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.trd-final-disposition-ms :deep(.multiselect-trd-final-disposition .multiselect-option) {
  padding: 0.5rem 0.75rem;
}
</style>

<style>
html.dark .trd-final-disposition-ms .multiselect-trd-final-disposition {
  --ms-bg: color-mix(in srgb, var(--input) 30%, transparent);
  background-color: color-mix(in srgb, var(--input) 30%, transparent);
  --ms-border-color: var(--border);
  border-color: var(--border) !important;
}
</style>
