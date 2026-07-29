<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import {
  DOCUMENT_SUPPORT_OPTIONS,
  labelForDocumentSupportValue,
} from '~/constants/archival-document-support'

defineProps<{
  id?: string
}>()

const model = defineModel<string[]>({ default: () => [] })

const supportOptions = [...DOCUMENT_SUPPORT_OPTIONS]

function formatMultipleSupportLabel(
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

      return value ? labelForDocumentSupportValue(value) : ''
    })
    .filter(Boolean)
    .join(', ')
}
</script>

<template>
  <div class="catalog-document-support-ms w-full">
    <Multiselect
      :id="id"
      v-model="model"
      mode="tags"
      :object="false"
      :options="supportOptions"
      value-prop="value"
      label="label"
      :searchable="false"
      :close-on-select="false"
      :hide-selected="false"
      :create-option="false"
      placeholder="Seleccione soporte…"
      no-options-text="Sin opciones"
      no-results-text="Sin coincidencias"
      :multiple-label="formatMultipleSupportLabel"
      class="multiselect-document-support w-full"
    />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.catalog-document-support-ms :deep(.multiselect-document-support) {
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

.catalog-document-support-ms :deep(.multiselect-document-support.is-active) {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-wrapper) {
  min-height: 2.25rem;
  align-items: center;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-tags) {
  gap: 0.375rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-tag) {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  margin: 0;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-tag-wrapper) {
  color: var(--primary-foreground);
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-tag-remove-icon) {
  opacity: 0.85;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-multiple-label) {
  color: var(--foreground);
  padding-left: 0.125rem;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-placeholder) {
  color: var(--muted-foreground);
  padding-left: 0.125rem;
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-caret) {
  margin-right: 0.75rem;
  color: var(--muted-foreground);
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-dropdown) {
  border: 1px solid var(--border);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.catalog-document-support-ms :deep(.multiselect-document-support .multiselect-option) {
  padding: 0.5rem 0.75rem;
}
</style>

<style>
html.dark .catalog-document-support-ms .multiselect-document-support {
  --ms-bg: color-mix(in srgb, var(--input) 30%, transparent);
  background-color: color-mix(in srgb, var(--input) 30%, transparent);
  --ms-border-color: var(--border);
  border-color: var(--border) !important;
}
</style>
