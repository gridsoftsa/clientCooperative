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
    canClear?: boolean
    options?: Array<Record<string, unknown>>
    valueProp?: string
    label?: string
    /** Normaliza el valor a número (catálogo TRD, ids de entidad). */
    coerceNumber?: boolean
  }>(),
  {
    searchable: true,
    canClear: true,
    valueProp: 'value',
    label: 'label',
    noOptionsText: 'Sin opciones',
    noResultsText: 'Sin coincidencias',
    coerceNumber: false,
  },
)

const model = defineModel<string | number | null>({ default: null })

function coerceValue(value: string | number | null | undefined): string | number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (!props.coerceNumber) {
    return value
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : null
}

const innerModel = computed({
  get: () => model.value,
  set: (value: string | number | null | undefined) => {
    model.value = coerceValue(value)
  },
})
</script>

<template>
  <Multiselect
    :id="id"
    v-model="innerModel"
    mode="single"
    :object="false"
    v-bind="$attrs"
    :options="options ?? []"
    :value-prop="valueProp"
    :label="label"
    :searchable="searchable"
    :can-clear="canClear"
    :close-on-select="true"
    :append-to-body="true"
    :close-on-scroll="false"
    :disabled="disabled"
    :classes="ARCHIVAL_MULTISELECT_CLASSES"
    :placeholder="placeholder"
    :no-options-text="noOptionsText"
    :no-results-text="noResultsText"
    class="archival-single-multiselect"
    @open="onArchivalMultiselectOpen"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Multiselect>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped>
.archival-single-multiselect.multiselect-warning {
  --ms-border-color: rgb(245 158 11);
  --ms-border-color-active: rgb(245 158 11);
  box-shadow: 0 0 0 3px rgb(245 158 11 / 0.3);
}
</style>
