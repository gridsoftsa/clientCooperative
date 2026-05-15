<script setup lang="ts">
import Multiselect from '@vueform/multiselect'

export interface OrgInstitutionalProcessOption {
  id: number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: OrgInstitutionalProcessOption[]
    inputId: string
    label: string
    helperText?: string
    disabled?: boolean
  }>(),
  { helperText: '', disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const multiselectOptions = computed(() =>
  props.options.map(o => ({ value: o.id, label: o.label })),
)

const selected = ref<number[]>([...props.modelValue])

function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const sa = [...a].sort((x, y) => x - y)
  const sb = [...b].sort((x, y) => x - y)

  return sa.every((v, i) => v === sb[i])
}

watch(
  () => props.modelValue,
  (v) => {
    selected.value = [...v]
  },
  { deep: true },
)

watch(
  selected,
  (v) => {
    if (props.disabled) {
      return
    }
    if (! sameIds(v, props.modelValue)) {
      emit('update:modelValue', [...v])
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-3 text-left w-full">
    <div class="space-y-1.5 text-left">
      <Label :for="inputId" class="text-base leading-snug">{{ label }}</Label>
      <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
        {{ helperText }}
      </p>
    </div>
    <div class="org-inst-processes-ms w-full">
      <Multiselect
        :id="inputId"
        v-model="selected"
        mode="multiple"
        :object="false"
        :options="multiselectOptions"
        value-prop="value"
        label="label"
        :searchable="true"
        :close-on-select="false"
        :disabled="disabled"
        placeholder="Seleccione uno o más procesos"
        no-options-text="Sin procesos en catálogo"
        class="multiselect-org-inst-processes w-full max-w-xl"
      />
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.org-inst-processes-ms :deep(.multiselect) {
  margin-left: 0 !important;
  margin-right: auto !important;
}

.org-inst-processes-ms :deep(.multiselect-wrapper) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  justify-content: flex-end !important;
}

.org-inst-processes-ms :deep(.multiselect-org-inst-processes) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  --ms-dropdown-radius: 0.375rem;
  --ms-max-height: 12rem;
  min-height: 2.75rem;
  width: 100%;
  min-width: 0;
  text-align: left;
}

.org-inst-processes-ms :deep(.multiselect-single-label),
.org-inst-processes-ms :deep(.multiselect-placeholder) {
  text-align: left;
}

.org-inst-processes-ms :deep(.multiselect-tags-search) {
  justify-content: flex-start !important;
}
</style>
