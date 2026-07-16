<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ARCHIVAL_MULTISELECT_CLASSES, onArchivalMultiselectOpen } from '~/composables/useArchivalMultiselect'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
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
  }>(),
  {
    searchable: true,
    canClear: true,
    valueProp: 'value',
    label: 'label',
    noOptionsText: 'Sin opciones',
    noResultsText: 'Sin coincidencias',
  },
)

const model = defineModel<string | number | null>({ default: null })
</script>

<template>
  <Multiselect
    :id="id"
    v-model="model"
    mode="single"
    :object="false"
    v-bind="$attrs"
    :options="options ?? []"
    :value-prop="valueProp"
    :label="label"
    :searchable="searchable"
    :can-clear="canClear"
    :append-to-body="true"
    :close-on-scroll="true"
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
