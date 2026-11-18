<script setup lang="ts">
import type { OrgYesNoChoice } from '~/constants/org-structure'
import { ORG_YES_NO_OPTIONS } from '~/constants/org-structure'

const props = withDefaults(
  defineProps<{
    modelValue: OrgYesNoChoice
    inputId: string
    label: string
    helperText?: string
    disabled?: boolean
  }>(),
  { helperText: '', disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: OrgYesNoChoice]
}>()

const selected = computed({
  get: (): OrgYesNoChoice => props.modelValue,
  set: (value: string | number | null) => {
    if (props.disabled) {
      return
    }
    if (value === 'yes' || value === 'no') {
      emit('update:modelValue', value)
    }
  },
})
</script>

<template>
  <div class="flex min-w-0 w-full flex-col gap-2 text-left">
    <Label :for="inputId" class="leading-snug">{{ label }}</Label>
    <ArchivalSingleMultiselect
      :id="inputId"
      v-model="selected"
      :options="ORG_YES_NO_OPTIONS"
      :searchable="false"
      :can-clear="false"
      :disabled="disabled"
      placeholder="Seleccione"
      no-options-text="Sin opciones"
    />
    <p v-if="helperText" class="text-xs leading-5 text-muted-foreground">
      {{ helperText }}
    </p>
  </div>
</template>
