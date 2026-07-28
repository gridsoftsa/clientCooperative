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

type RequiredField =
  | 'org_unit'
  | 'assignor'
  | 'delegate_unit'
  | 'delegate'
  | 'starts_on'
  | 'ends_on'

const submitAttempted = ref(false)

const requiredFieldIds: Record<RequiredField, string> = {
  org_unit: 'del_unit',
  assignor: 'del_assignor',
  delegate_unit: 'del_delegate_unit',
  delegate: 'del_delegate',
  starts_on: 'sd1',
  ends_on: 'sd2',
}

const requiredMessages: Record<RequiredField, string> = {
  org_unit: 'Seleccione el área del titular',
  assignor: 'Seleccione el titular',
  delegate_unit: 'Seleccione el área del Backup',
  delegate: 'Seleccione el Backup',
  starts_on: 'La fecha de inicio es obligatoria',
  ends_on: 'La fecha de fin es obligatoria',
}

function isFieldMissing(field: RequiredField): boolean {
  if (field === 'org_unit') {
    return selectedOrgUnitId.value == null
  }
  if (field === 'assignor') {
    return form.value.assignor_staff_id == null
  }
  if (field === 'delegate_unit') {
    return usingOtherAreas.value && delegateOrgUnitId.value == null
  }
  if (field === 'delegate') {
    return form.value.delegate_staff_id == null
  }
  if (field === 'starts_on') {
    return !form.value.starts_on
  }
  return !form.value.ends_on
}

function firstMissingField(): RequiredField | null {
  const order: RequiredField[] = [
    'org_unit',
    'assignor',
    'delegate_unit',
    'delegate',
    'starts_on',
    'ends_on',
  ]
  return order.find(field => isFieldMissing(field)) ?? null
}

function focusByElementId(id: string): void {
  const root = document.getElementById(id)
  if (!root) {
    return
  }
  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function fieldErrorClass(missing: boolean): string {
  return missing ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40' : ''
}

function multiselectErrorClass(missing: boolean): string {
  return missing
    ? 'delegation-single-multiselect multiselect-danger'
    : 'delegation-single-multiselect'
}

function formFieldErrorClass(field: 'starts_on' | 'ends_on'): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing(field))
}

function formMultiselectErrorClass(
  field: 'org_unit' | 'assignor' | 'delegate_unit' | 'delegate',
): string {
  return multiselectErrorClass(submitAttempted.value && isFieldMissing(field))
}

async function handleSubmit() {
  submitAttempted.value = true
  const firstMissing = firstMissingField()
  if (firstMissing) {
    toast.error(requiredMessages[firstMissing])
    await nextTick()
    focusByElementId(requiredFieldIds[firstMissing])
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
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1 max-w-3xl">
          <h2 class="text-2xl font-bold tracking-tight">
            Nuevo Backup
          </h2>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Elija el área y, si lo desea, limite por cargo; luego seleccione titular y Backup.
            Si el área tiene un solo cargo o funcionario, el Backup se elige de otra área.
          </p>
        </div>
        <Button
          variant="outline"
          class="shrink-0"
          @click="router.push('/settings/organizational-structure/delegations')"
        >
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form class="w-full space-y-6" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Contexto organizacional
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Área obligatoria; el filtro por cargo reduce la lista de funcionarios y muestra cuántos hay por cargo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-8">
              <div id="del_unit" class="space-y-2">
                <Label for="del_unit_ms">Área *</Label>
                <div v-if="loadingUnits" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                  Cargando áreas…
                </div>
                <Multiselect
                  v-else
                  id="del_unit_ms"
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
                  :class="formMultiselectErrorClass('org_unit')"
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Titular y Backup
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Nombre · documento · cargo (código) · área · correo cuando aplique.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-8">
              <div id="del_assignor" class="space-y-2 md:col-span-2 md:max-w-xl">
                <Label for="del_assignor_ms">Titular *</Label>
                <p v-if="selectedOrgUnitId == null" class="text-sm text-muted-foreground py-1">
                  Seleccione un área primero.
                </p>
                <div v-else-if="loadingStaff" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                  Cargando funcionarios…
                </div>
                <Multiselect
                  v-else
                  id="del_assignor_ms"
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
                  :class="formMultiselectErrorClass('assignor')"
                />
              </div>

              <div
                v-if="selectedOrgUnitId != null && !loadingStaff && !mustUseOtherAreas"
                class="rounded-lg border p-3 md:col-span-2"
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
                class="text-sm text-muted-foreground leading-relaxed rounded-lg border border-dashed p-3 md:col-span-2"
              >
                Este área (o filtro de cargo) tiene un solo funcionario. Seleccione otra área para el Backup.
              </p>

              <div v-if="usingOtherAreas" id="del_delegate_unit" class="space-y-2 md:col-span-2 md:max-w-xl">
                <Label for="del_delegate_unit_ms">Área del Backup *</Label>
                <Multiselect
                  id="del_delegate_unit_ms"
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
                  :class="formMultiselectErrorClass('delegate_unit')"
                />
              </div>

              <div id="del_delegate" class="space-y-2 md:col-span-2 md:max-w-xl">
                <Label for="del_delegate_ms">Backup *</Label>
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
                  id="del_delegate_ms"
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
                  :class="formMultiselectErrorClass('delegate')"
                />
              </div>

              <div class="space-y-2">
                <Label for="sd1">Inicio *</Label>
                <Input
                  id="sd1"
                  v-model="form.starts_on"
                  type="date"
                  required
                  class="max-w-xs"
                  :class="formFieldErrorClass('starts_on')"
                />
              </div>
              <div class="space-y-2">
                <Label for="sd2">Fin *</Label>
                <Input
                  id="sd2"
                  v-model="form.ends_on"
                  type="date"
                  required
                  class="max-w-xs"
                  :class="formFieldErrorClass('ends_on')"
                />
              </div>

              <div class="space-y-2 md:col-span-2 md:max-w-2xl">
                <Label for="sd3">Motivo (opcional)</Label>
                <Textarea id="sd3" v-model="form.reason" rows="3" class="resize-y min-h-[4rem]" />
              </div>
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

.delegation-single-multiselect.multiselect-danger {
  --ms-border-color: var(--destructive);
  --ms-border-color-active: var(--destructive);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--destructive) 25%, transparent);
}
</style>
