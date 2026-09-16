<script setup lang="ts">
import Multiselect from '@vueform/multiselect'

/**
 * Departamento → ciudad/municipio (catálogo DANE).
 * El v-model sigue siendo el label «Municipio (Departamento)» para el API de agencias.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    departmentInputId?: string
    cityInputId?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    departmentInputId: 'org_office_department',
    cityInputId: 'org_office_city',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { getById, getByLabel, getLabel, getDepartments, getMunicipalitiesByDepartmentId } = useMunicipalities()

const selectedDepartmentId = ref<number | null>(null)
const selectedMunicipalityId = ref<number | null>(null)
const hydrating = ref(false)

const departmentOptions = computed(() =>
  getDepartments().map(department => ({
    value: String(department.id),
    label: department.name,
  })),
)

const cityOptions = computed(() =>
  getMunicipalitiesByDepartmentId(selectedDepartmentId.value).map(municipality => ({
    value: String(municipality.id),
    label: municipality.name,
  })),
)

function emitFromSelection(): void {
  if (hydrating.value) {
    return
  }

  if (selectedMunicipalityId.value == null) {
    emit('update:modelValue', '')
    return
  }

  const municipality = getById(selectedMunicipalityId.value)
  emit('update:modelValue', municipality ? getLabel(municipality) : '')
}

function applyLabel(label: string): void {
  hydrating.value = true
  const municipality = getByLabel(label)
  if (!municipality) {
    selectedDepartmentId.value = null
    selectedMunicipalityId.value = null
    hydrating.value = false
    return
  }

  selectedDepartmentId.value = municipality.department?.id ?? municipality.department_id
  selectedMunicipalityId.value = municipality.id
  hydrating.value = false
}

watch(
  () => props.modelValue,
  (label) => {
    const next = (label ?? '').trim()
    if (!next) {
      if (selectedMunicipalityId.value != null || selectedDepartmentId.value != null) {
        hydrating.value = true
        selectedDepartmentId.value = null
        selectedMunicipalityId.value = null
        hydrating.value = false
      }
      return
    }

    const current = selectedMunicipalityId.value != null
      ? getById(selectedMunicipalityId.value)
      : undefined
    if (current && getLabel(current) === next) {
      return
    }

    applyLabel(next)
  },
  { immediate: true },
)

function onDepartmentUpdate(value: unknown): void {
  const nextId = typeof value === 'number' ? value : Number(value)
  selectedDepartmentId.value = Number.isFinite(nextId) && nextId > 0 ? nextId : null
  selectedMunicipalityId.value = null
  emitFromSelection()
}

function onCityUpdate(value: unknown): void {
  const nextId = typeof value === 'number' ? value : Number(value)
  selectedMunicipalityId.value = Number.isFinite(nextId) && nextId > 0 ? nextId : null
  emitFromSelection()
}
</script>

<template>
  <div class="grid items-start gap-4 sm:grid-cols-2 sm:gap-6">
    <div class="flex min-w-0 flex-col gap-2">
      <Label :for="departmentInputId">Departamento</Label>
      <Multiselect
        :id="departmentInputId"
        :model-value="selectedDepartmentId != null ? String(selectedDepartmentId) : null"
        mode="single"
        :options="departmentOptions"
        :disabled="disabled"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="true"
        :append-to-body="true"
        placeholder="Seleccione departamento…"
        no-options-text="Sin departamentos"
        no-results-text="Sin coincidencias"
        class="multiselect-municipality w-full"
        @update:model-value="onDepartmentUpdate"
      />
    </div>
    <div class="flex min-w-0 flex-col gap-2">
      <Label :for="cityInputId">Ciudad / municipio</Label>
      <Multiselect
        :id="cityInputId"
        :model-value="selectedMunicipalityId != null ? String(selectedMunicipalityId) : null"
        mode="single"
        :options="cityOptions"
        :disabled="disabled || selectedDepartmentId == null"
        value-prop="value"
        label="label"
        :searchable="true"
        :can-clear="true"
        :append-to-body="true"
        :placeholder="selectedDepartmentId == null ? 'Primero seleccione departamento' : 'Seleccione municipio…'"
        no-options-text="Sin municipios en este departamento"
        no-results-text="Sin coincidencias"
        class="multiselect-municipality w-full"
        @update:model-value="onCityUpdate"
      />
    </div>
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
  --ms-px: 0.75rem;
  min-height: 2.25rem;
  width: 100%;
}
</style>
