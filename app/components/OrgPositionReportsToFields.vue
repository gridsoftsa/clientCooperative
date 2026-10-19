<script setup lang="ts">
const reportToOrgUnitId = defineModel<number | null>('reportToOrgUnitId', { default: null })
const reportToTargetType = defineModel<'none' | 'position' | 'staff'>('reportToTargetType', { default: 'none' })
const reportToPositionChoiceId = defineModel<number | null>('reportToPositionChoiceId', { default: null })
const reportToStaffChoiceId = defineModel<number | null>('reportToStaffChoiceId', { default: null })

const props = withDefaults(defineProps<{
  disabled?: boolean
  unitOptions: Array<{ id: number, label: string }>
  peerPositions: Array<{ id: number, name: string, code: string }>
  staffOptions: Array<{ id: number, label: string }>
  reportAreaInputId?: string
  reportTypeInputId?: string
  reportChoiceInputId?: string
}>(), {
  disabled: false,
  reportAreaInputId: 'position_report_area',
  reportTypeInputId: 'position_report_type',
  reportChoiceInputId: 'position_report_choice',
})

const unitSelectOptions = computed(() =>
  props.unitOptions.map(unit => ({
    value: unit.id,
    label: unit.label,
  })),
)

const typeSelectOptions = [
  { value: 'none', label: '(Ninguno)' },
  { value: 'position', label: 'Cargo' },
  { value: 'staff', label: 'Funcionario' },
]

const positionSelectOptions = computed(() =>
  props.peerPositions.map(position => ({
    value: position.id,
    label: `${position.name} — ${position.code}`,
  })),
)

const staffSelectOptions = computed(() =>
  props.staffOptions.map(staff => ({
    value: staff.id,
    label: staff.label,
  })),
)
</script>

<template>
  <div class="space-y-3 md:col-span-2">
    <Label :for="reportAreaInputId">Reporta a (opcional)</Label>
    <p class="text-xs leading-relaxed text-muted-foreground">
      Elija el área donde está el jefe (p. ej. Gerencia) y luego el cargo o funcionario.
      Solo aparecen cargos marcados como referencia de jefe de esa área.
    </p>
    <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
      <div class="flex min-w-0 flex-col gap-1.5">
        <Label :for="reportAreaInputId" class="text-xs text-muted-foreground">Área de reporte</Label>
        <ArchivalSingleMultiselect
          :id="reportAreaInputId"
          v-model="reportToOrgUnitId"
          coerce-number
          :disabled="disabled"
          :options="unitSelectOptions"
          placeholder="Sin jefe inmediato"
          no-options-text="No hay áreas"
          no-results-text="Sin coincidencias"
        />
      </div>
      <div class="flex min-w-0 flex-col gap-1.5">
        <Label :for="reportTypeInputId" class="text-xs text-muted-foreground">Tipo</Label>
        <ArchivalSingleMultiselect
          :id="reportTypeInputId"
          v-model="reportToTargetType"
          :can-clear="false"
          :searchable="false"
          :disabled="disabled || reportToOrgUnitId == null"
          :options="typeSelectOptions"
          placeholder="Seleccione tipo"
          no-options-text="Sin opciones"
        />
      </div>
      <div class="flex min-w-0 flex-col gap-1.5">
        <Label :for="reportChoiceInputId" class="text-xs text-muted-foreground">Selección</Label>
        <ArchivalSingleMultiselect
          v-if="reportToTargetType === 'position'"
          :id="reportChoiceInputId"
          :key="`report-pos-${reportToOrgUnitId ?? 'none'}`"
          v-model="reportToPositionChoiceId"
          coerce-number
          :disabled="disabled || reportToOrgUnitId == null"
          :options="positionSelectOptions"
          placeholder="Seleccione cargo"
          no-options-text="No hay cargos de jefe en esa área"
          no-results-text="Sin coincidencias"
        />
        <ArchivalSingleMultiselect
          v-else-if="reportToTargetType === 'staff'"
          :id="reportChoiceInputId"
          :key="`report-staff-${reportToOrgUnitId ?? 'none'}`"
          v-model="reportToStaffChoiceId"
          coerce-number
          :disabled="disabled || reportToOrgUnitId == null"
          :options="staffSelectOptions"
          placeholder="Seleccione funcionario"
          no-options-text="No hay funcionarios de jefe en esa área"
          no-results-text="Sin coincidencias"
        />
        <ArchivalSingleMultiselect
          v-else
          :id="reportChoiceInputId"
          disabled
          :can-clear="false"
          :searchable="false"
          :options="[]"
          placeholder="Seleccione área y tipo"
          no-options-text="Seleccione área y tipo"
        />
      </div>
    </div>
  </div>
</template>
