<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ARCHIVAL_MULTISELECT_CLASSES, onArchivalMultiselectOpen } from '~/composables/useArchivalMultiselect'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    id?: string
    disabled?: boolean
    placeholder?: string
    noOptionsText?: string
    noResultsText?: string
    searchable?: boolean
    options?: Array<Record<string, unknown>>
    valueProp?: string
    label?: string
    coerceNumber?: boolean
  }>(),
  {
    searchable: true,
    valueProp: 'value',
    label: 'label',
    noOptionsText: 'Sin opciones',
    noResultsText: 'Sin coincidencias',
    coerceNumber: true,
  },
)

const model = defineModel<Array<string | number>>({ default: () => [] })

function coerceValue(value: string | number): string | number {
  if (!props.coerceNumber) {
    return value
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : value
}

const innerModel = computed({
  get: () => model.value,
  set: (value: Array<string | number> | null | undefined) => {
    model.value = (value ?? []).map(item => coerceValue(item))
  },
})
</script>

<template>
  <Multiselect
    :id="id"
    v-model="innerModel"
    mode="tags"
    :object="false"
    v-bind="$attrs"
    :options="options ?? []"
    :value-prop="valueProp"
    :label="label"
    :searchable="searchable"
    :close-on-select="false"
    :append-to-body="true"
    :close-on-scroll="false"
    :disabled="disabled"
    :classes="ARCHIVAL_MULTISELECT_CLASSES"
    :placeholder="placeholder"
    :no-options-text="noOptionsText"
    :no-results-text="noResultsText"
    class="archival-multi-multiselect"
    @open="onArchivalMultiselectOpen"
  />
</template>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped>
.archival-multi-multiselect :deep(.multiselect-tags) {
  min-height: 2.5rem;
}
</style>
