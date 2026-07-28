<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import { orgStaffOptionLabel } from '~/utils/org-staff-option-label'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'suplencias_delegaciones_crear'],
})

const ALL_POSITIONS_VALUE = 0

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const units = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const staffInUnit = ref<OrgStaffListItem[]>([])
const staffInDelegateUnit = ref<OrgStaffListItem[]>([])

const selectedOrgUnitId = ref<number | null>(null)
/** When set, only staff with this cargo in the selected area appear in titular. */
const positionFilterId = ref<number | null>(null)
const loadOtherAreas = ref(false)
const delegateOrgUnitId = ref<number | null>(null)

const form = ref({
  assignor_staff_id: null as number | null,
  delegate_staff_id: null as number | null,
  starts_on: '',
  ends_on: '',
  reason: '',
})

const saving = ref(false)
const loadingUnits = ref(true)
const loadingPositions = ref(false)
const loadingStaff = ref(false)
const loadingDelegateStaff = ref(false)

const unitSelectOptions = computed(() =>
  units.value.map(unit => ({
    value: unit.id,
    label: unit.org_office
      ? `${unit.code} — ${unit.name} · ${unit.org_office.name}`
      : `${unit.code} — ${unit.name}`,
  })),
)

const otherUnitSelectOptions = computed(() =>
  units.value
    .filter(unit => unit.id !== selectedOrgUnitId.value)
    .map(unit => ({
      value: unit.id,
      label: unit.org_office
        ? `${unit.code} — ${unit.name} · ${unit.org_office.name}`
        : `${unit.code} — ${unit.name}`,
    })),
)

function staffCountForPosition(positionId: number): number {
  return staffInUnit.value.filter(
    staff => staff.current_assignment?.org_position?.id === positionId,
  ).length
}

function positionOptionLabel(position: OrgPositionRow): string {
  const base = position.code ? `${position.code} — ${position.name}` : position.name
  const count = staffCountForPosition(position.id)

  if (count === 0) {
    return `${base} (sin funcionarios vigentes)`
  }

  if (count === 1) {
    return `${base} (1 funcionario)`
  }

  return `${base} (${count} funcionarios)`
}

const positionSelectOptions = computed(() => [
  { value: ALL_POSITIONS_VALUE, label: 'Todos los cargos del área' },
  ...positions.value.map(position => ({
    value: position.id,
    label: positionOptionLabel(position),
  })),
])

const positionFilterSelectValue = computed({
  get: () => positionFilterId.value ?? ALL_POSITIONS_VALUE,
  set: (value: number | null) => {
    positionFilterId.value = value === ALL_POSITIONS_VALUE || value == null ? null : Number(value)
  },
})

const filteredStaff = computed(() => {
  if (positionFilterId.value == null) {
    return staffInUnit.value
  }

  return staffInUnit.value.filter(
    staff => staff.current_assignment?.org_position?.id === positionFilterId.value,
  )
})

/** Un solo funcionario (o ninguno): no hay Backup interno posible. */
const mustUseOtherAreas = computed(() => {
  if (selectedOrgUnitId.value == null || loadingStaff.value) {
    return false
  }

  return filteredStaff.value.length <= 1
})

const usingOtherAreas = computed(() => mustUseOtherAreas.value || loadOtherAreas.value)

const assignorSelectOptions = computed(() =>
  filteredStaff.value.map(staff => ({
    value: staff.id,
    label: orgStaffOptionLabel(staff),
  })),
)

const sameAreaDelegateOptions = computed(() =>
  filteredStaff.value
    .filter(staff => staff.id !== form.value.assignor_staff_id)
    .map(staff => ({
      value: staff.id,
      label: orgStaffOptionLabel(staff),
    })),
)

const otherAreaDelegateOptions = computed(() =>
  staffInDelegateUnit.value
    .filter(staff => staff.id !== form.value.assignor_staff_id)
    .map(staff => ({
      value: staff.id,
      label: orgStaffOptionLabel(staff),
    })),
)

const delegateSelectOptions = computed(() =>
  usingOtherAreas.value ? otherAreaDelegateOptions.value : sameAreaDelegateOptions.value,
)

async function reloadStaff() {
  const unitId = selectedOrgUnitId.value
  if (unitId == null) {
    staffInUnit.value = []
    return
  }

  loadingStaff.value = true
  try {
    staffInUnit.value = await orgApi.fetchStaff({
      activeOnly: true,
      orgUnitIds: [unitId],
    })
  }
  catch {
    toast.error('No se pudo cargar funcionarios del área')
    staffInUnit.value = []
  }
  finally {
    loadingStaff.value = false
  }
}

async function reloadDelegateStaff() {
  const unitId = delegateOrgUnitId.value
  if (unitId == null) {
    staffInDelegateUnit.value = []
    return
  }

  loadingDelegateStaff.value = true
  try {
    staffInDelegateUnit.value = await orgApi.fetchStaff({
      activeOnly: true,
      orgUnitIds: [unitId],
    })
  }
  catch {
    toast.error('No se pudo cargar funcionarios del área del Backup')
    staffInDelegateUnit.value = []
  }
  finally {
    loadingDelegateStaff.value = false
  }
}

function resetDelegateSelection() {
  form.value.delegate_staff_id = null
  if (!usingOtherAreas.value) {
    delegateOrgUnitId.value = null
    staffInDelegateUnit.value = []
  }
}

watch(selectedOrgUnitId, async (unitId) => {
  positionFilterId.value = null
  form.value.assignor_staff_id = null
  form.value.delegate_staff_id = null
  loadOtherAreas.value = false
  delegateOrgUnitId.value = null
  positions.value = []
  staffInUnit.value = []
  staffInDelegateUnit.value = []

  if (unitId == null) {
    return
  }

  loadingPositions.value = true
  try {
    const [loadedPositions] = await Promise.all([
      orgApi.fetchPositions({ activeOnly: true, orgUnitId: unitId }),
      reloadStaff(),
    ])
    positions.value = loadedPositions
  }
  catch {
    toast.error('No se pudieron cargar cargos del área')
    positions.value = []
  }
  finally {
    loadingPositions.value = false
  }
})

watch(positionFilterId, () => {
  form.value.assignor_staff_id = null
  resetDelegateSelection()
})

watch(mustUseOtherAreas, (required) => {
  if (required) {
    loadOtherAreas.value = true
    return
  }

  loadOtherAreas.value = false
  delegateOrgUnitId.value = null
  staffInDelegateUnit.value = []
  form.value.delegate_staff_id = null
})

watch(loadOtherAreas, (enabled) => {
  if (mustUseOtherAreas.value) {
    return
  }
  form.value.delegate_staff_id = null
  if (!enabled) {
    delegateOrgUnitId.value = null
    staffInDelegateUnit.value = []
  }
})

watch(delegateOrgUnitId, async () => {
  form.value.delegate_staff_id = null
  if (!usingOtherAreas.value) {
    staffInDelegateUnit.value = []
    return
  }
  await reloadDelegateStaff()
})

watch(() => form.value.assignor_staff_id, () => {
  if (
    form.value.delegate_staff_id != null
    && form.value.delegate_staff_id === form.value.assignor_staff_id
  ) {
    form.value.delegate_staff_id = null
  }
})

onMounted(async () => {
  loadingUnits.value = true
  try {
    units.value = await orgApi.fetchUnits({ activeOnly: true })
  }
  catch {
    toast.error('No se pudieron cargar áreas')
    units.value = []
  }
  finally {
    loadingUnits.value = false
  }
})

async function handleSubmit() {
  if (selectedOrgUnitId.value == null) {
    toast.error('Seleccione el área del Backup')
    return
  }
  if (usingOtherAreas.value && delegateOrgUnitId.value == null) {
    toast.error('Seleccione el área del Backup')
    return
  }
  if (form.value.assignor_staff_id == null || form.value.delegate_staff_id == null || !form.value.starts_on || !form.value.ends_on) {
    toast.error('Titular, Backup y fechas son obligatorios')
    return
  }

  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>('/organizational-structure/org-delegations', {
      method: 'POST',
      body: {
        org_unit_id: selectedOrgUnitId.value,
        assignor_staff_id: form.value.assignor_staff_id,
        delegate_staff_id: form.value.delegate_staff_id,
        starts_on: form.value.starts_on,
        ends_on: form.value.ends_on,
        reason: form.value.reason.trim() || undefined,
      },
    })
    toast.success('Backup creado')
    try {
      await orgApi.viewDelegationReceiptInNewTab(res.data.id)
    }
    catch {
      toast.error('Backup guardado, pero no se pudo abrir el comprobante PDF')
    }
    await router.push(`/settings/organizational-structure/delegations/${res.data.id}/edit`)
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message || 'Error al crear')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-2xl">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Nuevo Backup
        </h2>
        <Button variant="outline" @click="router.push('/settings/organizational-structure/delegations')">
          Volver
        </Button>
      </div>
      <p class="text-sm text-muted-foreground leading-relaxed">
        Elija el área y, si lo desea, limite por cargo; luego seleccione titular y Backup.
        Si el área tiene un solo cargo o funcionario, el Backup se elige de otra área.
      </p>
      <form class="grid gap-6" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Contexto organizacional</CardTitle>
            <CardDescription>
              Área obligatoria; el filtro por cargo reduce la lista de funcionarios y muestra cuántos hay por cargo.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <Label for="del_unit">Área *</Label>
              <div v-if="loadingUnits" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando áreas…
              </div>
              <Multiselect
                v-else
                id="del_unit"
                v-model="selectedOrgUnitId"
                mode="single"
                :object="false"
                :options="unitSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                placeholder="Seleccione un área"
                no-options-text="Sin áreas disponibles"
                no-results-text="Sin coincidencias"
                class="delegation-single-multiselect"
              />
            </div>
            <div class="space-y-2">
              <Label for="del_pos_filter">Cargo (opcional, filtra titular)</Label>
              <Multiselect
                id="del_pos_filter"
                v-model="positionFilterSelectValue"
                mode="single"
                :object="false"
                :options="positionSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="selectedOrgUnitId == null || loadingPositions"
                placeholder="Todos los cargos del área"
                no-options-text="Sin cargos en el área"
                no-results-text="Sin coincidencias"
                class="delegation-single-multiselect"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Titular y Backup</CardTitle>
            <CardDescription>
              Nombre · documento · cargo (código) · área · correo cuando aplique.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <Label>Titular *</Label>
              <p v-if="selectedOrgUnitId == null" class="text-sm text-muted-foreground py-1">
                Seleccione un área primero.
              </p>
              <div v-else-if="loadingStaff" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando funcionarios…
              </div>
              <Multiselect
                v-else
                v-model="form.assignor_staff_id"
                mode="single"
                :object="false"
                :options="assignorSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="assignorSelectOptions.length === 0"
                placeholder="Seleccione titular"
                no-options-text="Sin funcionarios en el contexto"
                no-results-text="Sin coincidencias"
                class="delegation-single-multiselect"
              />
            </div>

            <div
              v-if="selectedOrgUnitId != null && !loadingStaff && !mustUseOtherAreas"
              class="rounded-lg border p-3"
            >
              <Checkbox v-model="loadOtherAreas">
                ¿Desea cargar otras áreas y funcionarios?
              </Checkbox>
              <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
                Marque esta opción si el Backup no pertenece al área del titular.
              </p>
            </div>

            <p
              v-if="selectedOrgUnitId != null && !loadingStaff && mustUseOtherAreas"
              class="text-sm text-muted-foreground leading-relaxed rounded-lg border border-dashed p-3"
            >
              Este área (o filtro de cargo) tiene un solo funcionario. Seleccione otra área para el Backup.
            </p>

            <div v-if="usingOtherAreas" class="space-y-2">
              <Label for="del_delegate_unit">Área del Backup *</Label>
              <Multiselect
                id="del_delegate_unit"
                v-model="delegateOrgUnitId"
                mode="single"
                :object="false"
                :options="otherUnitSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="selectedOrgUnitId == null || otherUnitSelectOptions.length === 0"
                placeholder="Seleccione un área"
                no-options-text="No hay otras áreas disponibles"
                no-results-text="Sin coincidencias"
                class="delegation-single-multiselect"
              />
            </div>

            <div class="space-y-2">
              <Label>Backup *</Label>
              <p v-if="selectedOrgUnitId == null" class="text-sm text-muted-foreground py-1">
                Seleccione un área primero.
              </p>
              <p
                v-else-if="usingOtherAreas && delegateOrgUnitId == null"
                class="text-sm text-muted-foreground py-1"
              >
                Seleccione el área del Backup.
              </p>
              <div
                v-else-if="loadingStaff || (usingOtherAreas && loadingDelegateStaff)"
                class="flex items-center gap-2 text-sm text-muted-foreground py-2"
              >
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando funcionarios…
              </div>
              <Multiselect
                v-else
                v-model="form.delegate_staff_id"
                mode="single"
                :object="false"
                :options="delegateSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="delegateSelectOptions.length === 0"
                placeholder="Seleccione Backup"
                no-options-text="Sin funcionarios en el contexto"
                no-results-text="Sin coincidencias"
                class="delegation-single-multiselect"
              />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="sd1">Inicio *</Label>
                <Input id="sd1" v-model="form.starts_on" type="date" required />
              </div>
              <div class="space-y-2">
                <Label for="sd2">Fin *</Label>
                <Input id="sd2" v-model="form.ends_on" type="date" required />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="sd3">Motivo (opcional)</Label>
              <Textarea id="sd3" v-model="form.reason" rows="3" class="resize-y min-h-[4rem]" />
            </div>
          </CardContent>
        </Card>
        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            Guardar
          </Button>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>

<style scoped>
.delegation-single-multiselect {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.delegation-single-multiselect :deep(.multiselect-single-label),
.delegation-single-multiselect :deep(.multiselect-placeholder) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delegation-single-multiselect :deep(.multiselect-option) {
  white-space: normal;
  line-height: 1.35;
}
</style>
