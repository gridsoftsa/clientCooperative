<script setup lang="ts">
defineProps<{
  options: Array<{ value: string, label: string }>
  disabled?: boolean
  placeholder?: string
}>()

const selected = defineModel<string | null>({ default: null })
</script>

<template>
  <ArchivalLibraryCategorySelect
    v-model="selected"
    :options="options"
    :disabled="disabled"
    :placeholder="placeholder"
  />
</template>
