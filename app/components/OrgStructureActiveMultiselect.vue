<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import {
  ORG_RECORD_ACTIVE_OPTIONS_FEM,
  ORG_RECORD_ACTIVE_OPTIONS_MASC,
  type OrgRecordActiveValue,
  boolToOrgActiveValue,
  orgActiveValueToBool,
} from '~/constants/org-structure'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Etiquetas Activo/Inactivo vs Activa/Inactiva (oficina, área). */
    gender?: 'masculine' | 'feminine'
    inputId: string
    helperText?: string
    /** Si es false, no se muestra la etiqueta «Estado» (p. ej. el `Card` ya tiene título). */
    showLabel?: boolean
    disabled?: boolean
  }>(),
  { gender: 'masculine', showLabel: true, helperText: '', disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const options = computed(() =>
  props.gender === 'feminine' ? ORG_RECORD_ACTIVE_OPTIONS_FEM : ORG_RECORD_ACTIVE_OPTIONS_MASC,
)

const selected = ref<OrgRecordActiveValue>(boolToOrgActiveValue(props.modelValue))

watch(
  () => props.modelValue,
  (v) => {
    selected.value = boolToOrgActiveValue(v)
  },
)

watch(selected, (v) => {
  if (props.disabled) {
    return
  }
  const next = orgActiveValueToBool(v)
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
})
</script>

<template>
  <div class="space-y-3 rounded-lg border p-4 text-left md:col-span-2">
    <div v-if="showLabel || helperText" class="space-y-1.5 text-left">
      <Label v-if="showLabel" :for="inputId" class="text-base leading-snug">Estado</Label>
      <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
        {{ helperText }}
      </p>
    </div>
    <div class="org-structure-active-ms w-full">
      <Multiselect
        :id="inputId"
        v-model="selected"
        mode="single"
        :object="false"
        :options="options"
        value-prop="value"
        label="label"
        :searchable="false"
        :can-clear="false"
        :disabled="disabled"
        placeholder="Seleccione estado"
        no-options-text="Sin opciones"
        class="multiselect-org-active w-full max-w-md"
      />
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
/**
 * Tema default: margin:0 auto centra el control; justify-content:flex-start en el wrapper
 * dejaba el caret a la izquierda (la etiquina single va en posición absoluta). Solo
 * corregimos márgenes y forzamos flex-end en el wrapper para mantener la flecha a la derecha.
 */
.org-structure-active-ms :deep(.multiselect) {
  margin-left: 0 !important;
  margin-right: auto !important;
}

.org-structure-active-ms :deep(.multiselect-wrapper) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  justify-content: flex-end !important;
}

.org-structure-active-ms :deep(.multiselect-org-active) {
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

.org-structure-active-ms :deep(.multiselect-single-label),
.org-structure-active-ms :deep(.multiselect-placeholder) {
  text-align: left;
}

.org-structure-active-ms :deep(.multiselect-tags-search) {
  justify-content: flex-start !important;
}
</style>
