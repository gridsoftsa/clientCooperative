<script setup lang="ts">
import type { OrgStaffListItem } from '~/types/org-structure'
import {
  orgStaffDisplayName,
  orgStaffUnitManagerMultiselectOption,
  type OrgStaffMultiselectOption,
} from '~/utils/org-staff-option-label'

const props = withDefaults(
  defineProps<{
    orgUnitId: number | null
    inputId: string
    disabled?: boolean
    helperText?: string
  }>(),
  {
    disabled: false,
    helperText: '',
  },
)

const model = defineModel<number | null>({ default: null })

const emit = defineEmits<{
  ready: []
}>()

const orgApi = useOrgStructureApi()
const loading = ref(false)
const interactionReady = ref(false)
const staffInUnit = ref<OrgStaffListItem[]>([])

const selectOptions = computed<OrgStaffMultiselectOption[]>(() =>
  staffInUnit.value.map(staff => orgStaffUnitManagerMultiselectOption(staff)),
)

const isDisabled = computed(() =>
  props.disabled || loading.value || !interactionReady.value || props.orgUnitId == null,
)

async function loadStaffForUnit(unitId: number) {
  interactionReady.value = false
  loading.value = true

  try {
    staffInUnit.value = await orgApi.fetchStaff({
      activeOnly: false,
      orgUnitIds: [unitId],
    })
  }
  catch {
    staffInUnit.value = []
  }
  finally {
    loading.value = false
    await nextTick()
    requestAnimationFrame(() => {
      interactionReady.value = true
      emit('ready')
    })
  }
}

watch(
  () => props.orgUnitId,
  (unitId) => {
    if (unitId == null) {
      staffInUnit.value = []
      interactionReady.value = false
      return
    }

    void loadStaffForUnit(unitId)
  },
  { immediate: true },
)

/** Permite mostrar un jefe ya guardado aunque el listado filtrado aún no incluya su fila completa. */
function ensureManagerInList(
  manager: { id: number, first_name: string, first_last_name: string } | null | undefined,
) {
  if (!manager || staffInUnit.value.some(staff => staff.id === manager.id)) {
    return
  }

  staffInUnit.value = [
    ...staffInUnit.value,
    {
      id: manager.id,
      first_name: manager.first_name,
      first_last_name: manager.first_last_name,
      full_name: orgStaffDisplayName({
        id: manager.id,
        first_name: manager.first_name,
        first_last_name: manager.first_last_name,
        is_active: true,
      } as OrgStaffListItem),
      is_active: true,
    },
  ]
}

function containsStaff(staffId: number): boolean {
  return staffInUnit.value.some(staff => staff.id === staffId)
}

defineExpose({ ensureManagerInList, containsStaff })
</script>

<template>
  <div class="org-unit-manager-staff-ms w-full min-w-0 max-w-xl space-y-2">
    <ArchivalSingleMultiselect
      :id="inputId"
      v-model="model"
      coerce-number
      class="w-full"
      :options="selectOptions"
      :disabled="isDisabled"
      :can-clear="true"
      :placeholder="
        orgUnitId == null
          ? 'Seleccione primero el área (agencia y datos guardados)'
          : loading
            ? 'Cargando funcionarios…'
            : 'Buscar funcionario del área…'
      "
      no-options-text="No hay funcionarios con ubicación vigente en esta área"
      no-results-text="Sin coincidencias"
      label="label"
      value-prop="value"
    >
      <template #option="{ option }">
        <div class="archival-ms-option">
          <span class="archival-ms-option-title">{{ option.title }}</span>
          <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
        </div>
      </template>
    </ArchivalSingleMultiselect>
    <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
      {{ helperText }}
    </p>
    <p v-else-if="orgUnitId == null" class="text-sm text-muted-foreground leading-relaxed">
      Solo se listan funcionarios con asignación vigente en esta área.
    </p>
    <p v-else-if="loading" class="text-xs text-muted-foreground">
      Cargando funcionarios del área…
    </p>
    <p v-else class="text-xs text-muted-foreground">
      Solo funcionarios con ubicación principal vigente en esta área. Se muestra nombre y cargo.
    </p>
  </div>
</template>

<style scoped>
.org-unit-manager-staff-ms :deep(.archival-single-multiselect) {
  width: 100%;
  min-width: 0;
}

.org-unit-manager-staff-ms :deep(.multiselect) {
  width: 100%;
  min-width: 0;
}
</style>
