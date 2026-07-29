<script setup lang="ts">
import Multiselect from '@vueform/multiselect'

export type ArchivalCatalogSearchSelectOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    options: ArchivalCatalogSearchSelectOption[]
    placeholder?: string
    disabled?: boolean
    canClear?: boolean
    noOptionsText?: string
    noResultsText?: string
    id?: string
  }>(),
  {
    placeholder: 'Seleccione…',
    disabled: false,
    canClear: true,
    noOptionsText: 'Sin opciones',
    noResultsText: 'Sin coincidencias',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const selected = computed({
  get(): string | null {
    const raw = props.modelValue

    return raw && String(raw).length > 0 ? String(raw) : null
  },
  set(value: string | null | undefined) {
    emit('update:modelValue', value != null && value !== '' ? String(value) : null)
  },
})
</script>

<template>
  <div class="archival-catalog-search-ms w-full min-w-0">
    <Multiselect
      :id="id"
      v-model="selected"
      mode="single"
      :object="false"
      :options="options"
      value-prop="value"
      label="label"
      :searchable="true"
      :can-clear="canClear"
      :disabled="disabled"
      :placeholder="placeholder"
      :no-options-text="noOptionsText"
      :no-results-text="noResultsText"
      :append-to-body="true"
      class="multiselect-catalog-search w-full"
    />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.archival-catalog-search-ms :deep(.multiselect-catalog-search) {
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
  --ms-clear-color: var(--muted-foreground);
  --ms-clear-color-hover: var(--foreground);
  --ms-py: 0.5rem;
  --ms-px: 0.75rem;
  --ms-dropdown-radius: 0.375rem;
  --ms-dropdown-border-color: var(--border);
  --ms-dropdown-bg: var(--popover);
  --ms-option-font-size: 0.875rem;
  --ms-option-bg-pointed: var(--accent);
  --ms-option-color-pointed: var(--accent-foreground);
  --ms-option-bg-selected: color-mix(in srgb, var(--primary) 14%, transparent);
  --ms-option-color-selected: var(--foreground);
  --ms-option-bg-selected-pointed: color-mix(in srgb, var(--primary) 20%, transparent);
  --ms-option-color-selected-pointed: var(--foreground);
  --ms-max-height: 16rem;
  min-height: 2.25rem;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border) !important;
  background-color: var(--background);
  color: var(--foreground);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search.is-active) {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-wrapper) {
  min-height: 2.25rem;
  align-items: center;
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-single-label),
.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-placeholder) {
  padding-left: 0.125rem;
  color: var(--foreground);
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-placeholder) {
  color: var(--muted-foreground);
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-single-label-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-search) {
  color: var(--foreground);
  background: transparent;
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-caret) {
  margin-right: 0.5rem;
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-dropdown) {
  border: 1px solid var(--border);
  background: var(--popover);
  color: var(--foreground);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.12);
}

.archival-catalog-search-ms :deep(.multiselect-catalog-search .multiselect-option) {
  padding: 0.5rem 0.75rem;
}
</style>

<style>
html.dark .archival-catalog-search-ms .multiselect-catalog-search,
.dark .archival-catalog-search-ms .multiselect-catalog-search {
  --ms-bg: color-mix(in srgb, var(--input) 30%, transparent);
  --ms-border-color: var(--border);
  --ms-dropdown-bg: var(--popover);
  background-color: color-mix(in srgb, var(--input) 30%, transparent);
  border-color: var(--border) !important;
}

html.dark .archival-catalog-search-ms .multiselect-catalog-search .multiselect-search,
.dark .archival-catalog-search-ms .multiselect-catalog-search .multiselect-search {
  color: var(--foreground);
}

html.dark .archival-catalog-search-ms .multiselect-catalog-search .multiselect-dropdown,
.dark .archival-catalog-search-ms .multiselect-catalog-search .multiselect-dropdown {
  background: var(--popover);
  border-color: var(--border);
}
</style>
