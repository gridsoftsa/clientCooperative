<script setup lang="ts">
import Multiselect from '@vueform/multiselect'

/**
 * Multiselect (@vueform) para municipio DANE, alineado a radicación.
 * - Opciones acotadas (máx. 80) según búsqueda (`getFilteredOptions`), sin `options` async.
 * - `modelValue` / `update:modelValue` (compatible con `v-model` del padre).
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    inputId?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    inputId: 'org_office_municipality',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { getFilteredOptions } = useMunicipalities()

/** Texto de búsqueda del multiselect (sincronizado con @search-change). */
const searchQuery = ref('')

function onSearchChange(query: unknown): void {
  searchQuery.value = typeof query === 'string' ? query : ''
}

const listOptions = computed(() =>
  getFilteredOptions(searchQuery.value, 80).map(o => ({ value: o.label, label: o.label })),
)

const displayValue = computed<string | null>(() => {
  const v = props.modelValue?.trim() ?? ''
  return v !== '' ? v : null
})

function onMultiselectUpdate(value: unknown): void {
  emit('update:modelValue', value != null && value !== '' ? String(value) : '')
}
</script>

<template>
  <div class="w-full max-w-sm">
    <Multiselect
      :id="props.inputId"
      :model-value="displayValue"
      mode="single"
      :options="listOptions"
      :disabled="props.disabled"
      value-prop="value"
      label="label"
      :searchable="true"
      :filter-results="false"
      :strict="false"
      :can-clear="true"
      :allow-absent="true"
      :append-to-body="true"
      placeholder="Buscar municipio…"
      no-options-text="Escribe para buscar o elige de la lista"
      no-results-text="No hay resultados. Prueba otro término."
      class="multiselect-municipality w-full"
      @search-change="onSearchChange"
      @update:model-value="onMultiselectUpdate"
    />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-municipality {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  min-height: 2.25rem;
  width: 100%;
}
</style>
