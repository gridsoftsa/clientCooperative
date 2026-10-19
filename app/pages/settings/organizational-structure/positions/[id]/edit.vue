<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import { toDateInputValue } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const positionId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const unitOptions = ref<Array<{ id: number; label: string }>>([])
const peerPositions = ref<Array<{ id: number; name: string; code: string }>>([])
const reportToStaffOptions = ref<Array<{ id: number; label: string; reportsToPositionId: number }>>([])
const reportToOrgUnitId = ref<number | null>(null)
const reportToTargetType = ref<'none' | 'position' | 'staff'>('none')
const reportToPositionChoiceId = ref<number | null>(null)
const reportToStaffChoiceId = ref<number | null>(null)
const hydratingReportTo = ref(false)
const reportToFieldsKey = ref(0)
const loading = ref(true)

const chargesSelectedArea = ref<OrgYesNoChoice>('no')
const unitManagerReference = ref('')

const form = ref({
  org_unit_id: null as number | null,
  name: '',
  code: '',
  hierarchy_level: 1,
  has_subordinates: false,
  reports_to_position_id: null as number | null,
  is_active: true,
  valid_from: '',
  valid_to: '',
})

const saving = ref(false)

const areaManagerConflict = computed(() => {
  if (chargesSelectedArea.value !== 'yes' || !unitManagerReference.value) {
    return null
  }

  const positionName = form.value.name.trim()
  if (!positionName || unitManagerReference.value === positionName) {
    return null
  }

  return unitManagerReference.value
})

async function loadUnitManagerReference(orgUnitId: number | null): Promise<void> {
  if (orgUnitId == null) {
    unitManagerReference.value = ''
    return
  }

  try {
    const res = await $api<{ data: OrgUnitRow }>(`/organizational-structure/org-units/${orgUnitId}`)
    unitManagerReference.value = res.data.manager_position_name?.trim() ?? ''
  }
  catch {
    unitManagerReference.value = ''
  }
}

function onPositionActiveChange(value: boolean) {
  form.value.is_active = value
}

const unitSelectOptions = computed(() =>
  unitOptions.value.map(unit => ({
    value: unit.id,
    label: unit.label,
  })),
)

async function loadUnits() {
  const units = await orgApi.fetchUnits({ activeOnly: false })
  unitOptions.value = units.map((u: OrgUnitRow) => ({
    id: u.id,
    label: `${u.name} (${u.org_office?.name ?? '—'})`,
  }))
}

async function loadReportToCandidates(orgUnitId: number): Promise<void> {
  const [positions, staff] = await Promise.all([
    orgApi.fetchPositions({
      activeOnly: false,
      orgUnitId,
      managerOfOrgUnitOnly: true,
    }),
    orgApi.fetchStaff({
      activeOnly: false,
      orgUnitIds: [orgUnitId],
    }),
  ])

  peerPositions.value = positions.map(p => ({ id: p.id, name: p.name, code: p.code }))
  const managerPositionIds = new Set(peerPositions.value.map(p => p.id))
  reportToStaffOptions.value = staff
    .map((row: OrgStaffListItem) => {
      const assignment = row.current_assignment
      const position = assignment?.org_position
      if (!position || !managerPositionIds.has(position.id)) {
        return null
      }
      const fullName = row.full_name
        ?? [row.first_name, row.second_name, row.first_last_name, row.second_last_name]
          .filter(Boolean)
          .join(' ')
          .trim()
      return {
        id: row.id,
        label: `${fullName} — ${position.name}`,
        reportsToPositionId: position.id,
      }
    })
    .filter((row): row is { id: number; label: string; reportsToPositionId: number } => row != null)
}

function syncReportToFormFromChoices(): void {
  if (reportToTargetType.value === 'position') {
    form.value.reports_to_position_id = reportToPositionChoiceId.value
    return
  }
  if (reportToTargetType.value === 'staff') {
    const staff = reportToStaffOptions.value.find(row => row.id === reportToStaffChoiceId.value)
    form.value.reports_to_position_id = staff?.reportsToPositionId ?? null
    return
  }
  form.value.reports_to_position_id = null
}

function ensurePeerPosition(row: { id: number, name: string, code: string } | null | undefined): void {
  if (row == null || peerPositions.value.some(position => position.id === row.id)) {
    return
  }
  peerPositions.value = [...peerPositions.value, { id: row.id, name: row.name, code: row.code }]
}

async function hydrateReportToFromSaved(
  reportsToPositionId: number | null,
  nested: OrgPositionRow['reports_to_position'],
): Promise<void> {
  hydratingReportTo.value = true
  reportToOrgUnitId.value = null
  reportToTargetType.value = 'none'
  reportToPositionChoiceId.value = null
  reportToStaffChoiceId.value = null
  peerPositions.value = []
  reportToStaffOptions.value = []

  let reportsTo = nested ?? null
  if (reportsToPositionId != null && (reportsTo == null || reportsTo.org_unit_id == null)) {
    const bossId = reportsTo?.id ?? reportsToPositionId
    try {
      const res = await $api<{ data: OrgPositionRow }>(`/organizational-structure/org-positions/${bossId}`)
      reportsTo = {
        id: res.data.id,
        name: res.data.name,
        code: res.data.code,
        org_unit_id: res.data.org_unit_id,
      }
    }
    catch {
      reportsTo = reportsTo ?? null
    }
  }

  if (reportsTo?.org_unit_id == null) {
    hydratingReportTo.value = false
    return
  }

  reportToOrgUnitId.value = reportsTo.org_unit_id
  await loadReportToCandidates(reportsTo.org_unit_id)
  ensurePeerPosition({ id: reportsTo.id, name: reportsTo.name, code: reportsTo.code })
  await nextTick()
  reportToTargetType.value = 'position'
  reportToPositionChoiceId.value = reportsTo.id
  form.value.reports_to_position_id = reportsTo.id
  reportToFieldsKey.value += 1
  await nextTick()
  hydratingReportTo.value = false
}

watch(() => form.value.org_unit_id, async (id: number | null, prev: number | null | undefined) => {
  if (prev != null && prev !== id) {
    form.value.reports_to_position_id = null
    chargesSelectedArea.value = 'no'
    reportToOrgUnitId.value = null
    reportToTargetType.value = 'none'
    reportToPositionChoiceId.value = null
    reportToStaffChoiceId.value = null
    peerPositions.value = []
    reportToStaffOptions.value = []
  }

  await loadUnitManagerReference(id)
})

watch(reportToOrgUnitId, async (id: number | null) => {
  if (hydratingReportTo.value) {
    return
  }
  form.value.reports_to_position_id = null
  reportToTargetType.value = 'none'
  reportToPositionChoiceId.value = null
  reportToStaffChoiceId.value = null
  if (id == null) {
    peerPositions.value = []
    reportToStaffOptions.value = []
    return
  }
  await loadReportToCandidates(id)
})

watch([reportToTargetType, reportToPositionChoiceId, reportToStaffChoiceId], () => {
  if (hydratingReportTo.value) {
    return
  }
  syncReportToFormFromChoices()
})

async function loadPosition() {
  loading.value = true
  try {
    await loadUnits()
    const res = await $api<{ data: OrgPositionRow }>(`/organizational-structure/org-positions/${positionId.value}`)
    const p = res.data
    form.value = {
      org_unit_id: p.org_unit_id,
      name: p.name,
      code: p.code,
      hierarchy_level: p.hierarchy_level,
      has_subordinates: Boolean(p.has_subordinates),
      reports_to_position_id: p.reports_to_position_id,
      is_active: Boolean(p.is_active),
      valid_from: toDateInputValue(p.valid_from),
      valid_to: toDateInputValue(p.valid_to),
    }
    const mgrName = p.org_unit?.manager_position_name?.trim() ?? ''
    const posName = p.name.trim()
    chargesSelectedArea.value = mgrName !== '' && mgrName === posName ? 'yes' : 'no'
    await loadUnitManagerReference(p.org_unit_id)
    await hydrateReportToFromSaved(p.reports_to_position_id, p.reports_to_position)
  } catch {
    toast.error('No se encontró el cargo')
    router.push('/settings/organizational-structure/positions')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (form.value.org_unit_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Área, nombre y código son obligatorios')
    return
  }
  if (areaManagerConflict.value) {
    toast.error(`El área ya tiene el cargo «${areaManagerConflict.value}» como referencia de jefe.`)
    return
  }

  saving.value = true
  try {
    await $api(`/organizational-structure/org-positions/${positionId.value}`, {
      method: 'PUT',
      body: {
        org_unit_id: form.value.org_unit_id,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        hierarchy_level: form.value.hierarchy_level,
        has_subordinates: form.value.has_subordinates,
        reports_to_position_id: form.value.reports_to_position_id,
        is_active: form.value.is_active,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        sync_manager_position_name_to_unit: chargesSelectedArea.value === 'yes',
      },
    })
    toast.success('Cargo actualizado. Si marcó «a cargo del área», revise en el área el jefe (funcionario) y el nombre del cargo de referencia.')
    router.push('/settings/organizational-structure/positions')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPosition()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar cargo
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            El jefe inmediato puede pertenecer a otra área; elija el área del jefe y luego el cargo o funcionario.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="grid gap-6">
          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Información del cargo</CardTitle>
              <CardDescription class="leading-relaxed">
                Área de adscripción, identificación del puesto y relación jerárquica con su jefe inmediato.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-5 md:items-start">
                  <div class="space-y-3">
                    <Label for="unit_pe" class="leading-snug">Área *</Label>
                    <ArchivalSingleMultiselect
                      id="unit_pe"
                      v-model="form.org_unit_id"
                      coerce-number
                      :can-clear="false"
                      :options="unitSelectOptions"
                      placeholder="Buscar y seleccionar área"
                      no-options-text="No hay áreas"
                      no-results-text="Sin coincidencias"
                    />
                  </div>
                  <OrgYesNoMultiselect
                    v-model="chargesSelectedArea"
                    input-id="position_edit_charges_area_ms"
                    label="¿Este cargo está a cargo del área elegida?"
                    helper-text="Si elige Sí, al guardar se actualiza en el área el «Nombre del cargo de jefe de área (referencia)» y, si hay un funcionario vigente en ese cargo, también el «Jefe del área — funcionario»."
                    :disabled="form.org_unit_id == null"
                  />
                </div>

                <Alert
                  v-if="areaManagerConflict"
                  variant="destructive"
                  class="md:col-span-2"
                >
                  <Icon name="i-lucide-triangle-alert" class="size-4" />
                  <AlertTitle>Ya hay un cargo de referencia en el área</AlertTitle>
                  <AlertDescription>
                    El área ya tiene «{{ areaManagerConflict }}» como cargo de jefe.
                    No puede marcar otro cargo hasta quitar esa referencia en el cargo anterior o en la edición del área.
                  </AlertDescription>
                </Alert>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="name_pe" class="leading-snug">Nombre *</Label>
                    <Input id="name_pe" v-model="form.name" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="code_pe" class="leading-snug">Código *</Label>
                    <Input id="code_pe" v-model="form.code" required />
                  </div>
                </div>

                <div class="space-y-3">
                  <Label for="hl_e" class="leading-snug">Nivel jerárquico</Label>
                  <Input id="hl_e" v-model.number="form.hierarchy_level" type="number" min="1" max="127" />
                </div>

                <div class="space-y-3 rounded-lg border p-4">
                  <OrgYesNoMultiselect
                    :model-value="form.has_subordinates ? 'yes' : 'no'"
                    input-id="position_edit_subordinates_ms"
                    label="¿Tiene personal a cargo?"
                    helper-text="Elija Sí si desde este cargo existe subordinación directa sobre otros cargos o personas."
                    @update:model-value="(v: OrgYesNoChoice) => { form.has_subordinates = v === 'yes' }"
                  />
                </div>

                <OrgPositionReportsToFields
                  :key="`area-report-${positionId}-${reportToFieldsKey}`"
                  v-model:report-to-org-unit-id="reportToOrgUnitId"
                  v-model:report-to-target-type="reportToTargetType"
                  v-model:report-to-position-choice-id="reportToPositionChoiceId"
                  v-model:report-to-staff-choice-id="reportToStaffChoiceId"
                  :disabled="form.org_unit_id == null"
                  :unit-options="unitOptions"
                  :peer-positions="peerPositions"
                  :staff-options="reportToStaffOptions"
                  report-area-input-id="rep_e"
                  report-type-input-id="rep_e_type"
                  report-choice-input-id="rep_e_choice"
                />
              </div>

              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="position_edit_valid_from"
                to-input-id="position_edit_valid_to"
              />

              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="masculine"
                input-id="position_edit_active_ms"
                helper-text="Los cargos inactivos no se ofrecen al asignar funcionarios ni en flujos de alta."
                @update:model-value="onPositionActiveChange"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
