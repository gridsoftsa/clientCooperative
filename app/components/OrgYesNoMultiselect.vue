<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
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

const selected = ref<OrgYesNoChoice>(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    selected.value = v
  },
)

watch(selected, (v) => {
  if (props.disabled) {
    return
  }
  if (v !== props.modelValue) {
    emit('update:modelValue', v)
  }
})
</script>

<template>
  <div class="space-y-3 text-left w-full">
    <div class="space-y-1.5 text-left">
      <Label :for="inputId" class="text-base leading-snug">{{ label }}</Label>
      <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
        {{ helperText }}
      </p>
    </div>
    <div class="org-yesno-ms w-full">
      <Multiselect
        :id="inputId"
        v-model="selected"
        mode="single"
        :object="false"
        :options="ORG_YES_NO_OPTIONS"
        value-prop="value"
        label="label"
        :searchable="false"
        :can-clear="false"
        :disabled="disabled"
        placeholder="Seleccione"
        no-options-text="Sin opciones"
        class="multiselect-org-yesno w-full max-w-md"
      />
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.org-yesno-ms :deep(.multiselect) {
  margin-left: 0 !important;
  margin-right: auto !important;
}

.org-yesno-ms :deep(.multiselect-wrapper) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  justify-content: flex-end !important;
}

.org-yesno-ms :deep(.multiselect-org-yesno) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  --ms-dropdown-radius: 0.375rem;
  --ms-max-height: 6rem;
  min-height: 2.75rem;
  width: 100%;
  min-width: 0;
  text-align: left;
}

.org-yesno-ms :deep(.multiselect-single-label),
.org-yesno-ms :deep(.multiselect-placeholder) {
  text-align: left;
}

.org-yesno-ms :deep(.multiselect-tags-search) {
  justify-content: flex-start !important;
}
</style>
