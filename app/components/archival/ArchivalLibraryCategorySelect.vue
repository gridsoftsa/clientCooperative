<script setup lang="ts">
defineProps<{
  options: Array<{ value: string, label: string }>
  disabled?: boolean
  placeholder?: string
}>()

const selected = defineModel<string | null>({ default: null })
</script>

<template>
  <ArchivalSingleMultiselect
    v-model="selected"
    :options="options"
    :disabled="disabled"
    :coerce-number="false"
    :searchable="false"
    :placeholder="placeholder ?? 'Seleccione una categoría'"
    no-options-text="No hay categorías configuradas"
    no-results-text="Sin coincidencias"
  />
</template>
