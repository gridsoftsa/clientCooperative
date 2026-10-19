<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import { todayIsoDateString, toDateInputValue } from '~/utils/dateInputValue'
import { isOrgPositionCodeSuffix, orgPositionCodePrefix, splitOrgPositionAreaCode } from '~/utils/org-position-area-code'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const route = useRoute()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const unitId = computed(() => Number(route.params.id))
const canEdit = computed(() => hasPermission('estructura_org_editar'))

const unit = ref<OrgUnitRow | null>(null)
const positions = ref<OrgPositionRow[]>([])
const loading = ref(true)
const saving = ref(false)
const deactivatingId = ref<number | null>(null)
const editingId = ref<number | null>(null)

const unitOptions = ref<Array<{ id: number, label: string }>>([])
const peerPositions = ref<Array<{ id: number, name: string, code: string }>>([])
const reportToStaffOptions = ref<Array<{ id: number, label: string, reportsToPositionId: number }>>([])
const reportToOrgUnitId = ref<number | null>(null)
const reportToTargetType = ref<'none' | 'position' | 'staff'>('none')
const reportToPositionChoiceId = ref<number | null>(null)
const reportToStaffChoiceId = ref<number | null>(null)

const chargesSelectedArea = ref<OrgYesNoChoice>('no')
const codeSuffix = ref('')
const legacyCode = ref<string | null>(null)
const hydratingReportTo = ref(false)

const form = ref({
  name: '',
  hierarchy_level: 1,
  has_subordinates: false,
  reports_to_position_id: null as number | null,
  is_active: true,
  valid_from: todayIsoDateString(),
  valid_to: '',
})

const codePrefix = computed(() => (unit.value ? orgPositionCodePrefix(unit.value.code) : ''))

const areaManagerConflict = computed(() => {
  if (chargesSelectedArea.value !== 'yes' || !unit.value?.manager_position_name)
    return null
  const reference = unit.value.manager_position_name.trim()
  const positionName = form.value.name.trim()
  if (!reference || !positionName || reference === positionName)
    return null
  return reference
})

function resetForm() {
  editingId.value = null
  legacyCode.value = null
  codeSuffix.value = ''
  chargesSelectedArea.value = 'no'
  reportToOrgUnitId.value = null
  reportToTargetType.value = 'none'
  reportToPositionChoiceId.value = null
  reportToStaffChoiceId.value = null
  form.value = {
    name: '',
    hierarchy_level: 1,
    has_subordinates: false,
    reports_to_position_id: null,
    is_active: true,
    valid_from: todayIsoDateString(),
    valid_to: '',
  }
}

async function loadUnit() {
  const res = await $api<{ data: OrgUnitRow }>(`/organizational-structure/org-units/${unitId.value}`)
  unit.value = res.data
}

async function loadPositions() {
  positions.value = await orgApi.fetchPositions({ orgUnitId: unitId.value })
}

async function loadUnitOptions() {
  const units = await orgApi.fetchUnits({ activeOnly: false })
  unitOptions.value = units.map(row => ({
    id: row.id,
    label: `${row.name} (${row.org_office?.name ?? '—'})`,
  }))
}

async function loadReportToCandidates(orgUnitId: number): Promise<void> {
  const [rows, staff] = await Promise.all([
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

  peerPositions.value = rows
    .filter(row => row.id !== editingId.value)
    .map(row => ({ id: row.id, name: row.name, code: row.code }))
  const managerPositionIds = new Set(peerPositions.value.map(row => row.id))
  reportToStaffOptions.value = staff
    .map((row: OrgStaffListItem) => {
      const position = row.current_assignment?.org_position
      if (!position || !managerPositionIds.has(position.id))
        return null
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
    .filter((row): row is { id: number, label: string, reportsToPositionId: number } => row != null)
}

watch(reportToOrgUnitId, async (id: number | null) => {
  if (!hydratingReportTo.value) {
    form.value.reports_to_position_id = null
    reportToTargetType.value = 'none'
    reportToPositionChoiceId.value = null
    reportToStaffChoiceId.value = null
  }
  if (id == null) {
    peerPositions.value = []
    reportToStaffOptions.value = []
    return
  }
  await loadReportToCandidates(id)
})

watch([reportToTargetType, reportToPositionChoiceId, reportToStaffChoiceId], () => {
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
})

async function startEdit(position: OrgPositionRow) {
  if (!unit.value)
    return
  hydratingReportTo.value = true
  editingId.value = position.id
  const suffix = splitOrgPositionAreaCode(unit.value.code, position.code)
  legacyCode.value = suffix == null ? position.code : null
  codeSuffix.value = suffix ?? ''
  chargesSelectedArea.value = unit.value.manager_position_name?.trim() === position.name.trim() ? 'yes' : 'no'
  form.value = {
    name: position.name,
    hierarchy_level: position.hierarchy_level,
    has_subordinates: position.has_subordinates,
    reports_to_position_id: position.reports_to_position_id,
    is_active: position.is_active,
    valid_from: toDateInputValue(position.valid_from) || todayIsoDateString(),
    valid_to: toDateInputValue(position.valid_to),
  }
  reportToOrgUnitId.value = position.reports_to_position?.org_unit_id ?? null
  reportToTargetType.value = position.reports_to_position_id ? 'position' : 'none'
  reportToPositionChoiceId.value = position.reports_to_position_id
  await nextTick()
  hydratingReportTo.value = false
}

async function handleSubmit() {
  if (!canEdit.value || !unit.value)
    return
  if (!form.value.name.trim()) {
    toast.error('El nombre del cargo es obligatorio')
    return
  }
  const suffix = codeSuffix.value.trim()
  if (suffix !== '' && !isOrgPositionCodeSuffix(suffix)) {
    toast.error('El código del cargo solo admite letras y números (hasta 20 caracteres)')
    return
  }
  if (suffix === '' && legacyCode.value == null) {
    toast.error('Indique el código del cargo')
    return
  }
  if (areaManagerConflict.value) {
    toast.error(`El área ya tiene el cargo «${areaManagerConflict.value}» como referencia de jefe.`)
    return
  }

  saving.value = true
  try {
    const body = {
      org_unit_id: unit.value.id,
      name: form.value.name.trim(),
      hierarchy_level: form.value.hierarchy_level,
      has_subordinates: form.value.has_subordinates,
      reports_to_position_id: form.value.reports_to_position_id,
      is_active: form.value.is_active,
      valid_from: form.value.valid_from.trim(),
      valid_to: form.value.valid_to.trim() || null,
      sync_manager_position_name_to_unit: chargesSelectedArea.value === 'yes',
      ...(suffix !== '' ? { code_suffix: suffix } : { code: legacyCode.value }),
    }
    if (editingId.value == null) {
      await $api('/organizational-structure/org-positions', { method: 'POST', body })
      toast.success('Cargo creado')
    }
    else {
      await $api(`/organizational-structure/org-positions/${editingId.value}`, { method: 'PUT', body })
      toast.success('Cargo actualizado')
    }
    resetForm()
    await Promise.all([loadUnit(), loadPositions()])
  }
  catch (error: any) {
    const suffixError = error?.data?.errors?.code_suffix?.[0]
    toast.error(suffixError || error?.data?.message || 'No se pudo guardar el cargo')
  }
  finally {
    saving.value = false
  }
}

async function deactivatePosition(id: number) {
  if (!canEdit.value || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-positions/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Cargo inactivado')
    await loadPositions()
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'No se pudo inactivar')
  }
  finally {
    deactivatingId.value = null
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadUnit(), loadPositions(), loadUnitOptions()])
  }
  catch {
    toast.error('No se pudo cargar el área')
    unit.value = null
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-fit -ml-2 px-2"
            @click="router.push('/settings/organizational-structure/units')"
          >
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Áreas y dependencias
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Cargos del área
          </h2>
          <p v-if="unit" class="text-muted-foreground leading-relaxed">
            {{ unit.name }} · código {{ unit.code }}. Los cargos que cree aquí quedan ligados a esta área.
          </p>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="!unit" class="py-12 text-center text-muted-foreground">
        No se encontró el área.
      </div>

      <template v-else>
        <Card v-if="canEdit">
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              {{ editingId == null ? 'Nuevo cargo' : 'Editar cargo' }}
            </CardTitle>
            <CardDescription class="leading-relaxed">
              El código queda con la máscara del área: {{ codePrefix }} más el código propio del cargo. Ejemplo: {{ unit.code }}-01.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form class="space-y-6" @submit.prevent="handleSubmit">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div class="space-y-3">
                  <Label class="leading-snug">Área</Label>
                  <Input :model-value="`${unit.name} (${unit.code})`" disabled />
                </div>
                <OrgYesNoMultiselect
                  v-model="chargesSelectedArea"
                  input-id="area_position_charges_area"
                  label="¿Este cargo está a cargo del área?"
                  helper-text="Si elige Sí, al guardar se actualiza en el área el nombre del cargo de jefe."
                />

                <Alert v-if="areaManagerConflict" variant="destructive" class="md:col-span-2">
                  <Icon name="i-lucide-triangle-alert" class="size-4" />
                  <AlertTitle>Ya hay un cargo de referencia en el área</AlertTitle>
                  <AlertDescription>
                    El área ya tiene «{{ areaManagerConflict }}» como cargo de jefe.
                  </AlertDescription>
                </Alert>

                <div class="space-y-3">
                  <Label for="area_position_name" class="leading-snug">Nombre *</Label>
                  <Input id="area_position_name" v-model="form.name" required />
                </div>
                <div class="space-y-3">
                  <Label for="area_position_suffix" class="leading-snug">Código *</Label>
                  <InputGroup>
                    <InputGroupAddon class="font-mono text-sm">
                      {{ codePrefix }}
                    </InputGroupAddon>
                    <InputGroupInput
                      id="area_position_suffix"
                      v-model="codeSuffix"
                      maxlength="20"
                      placeholder="01"
                      class="font-mono"
                      :required="legacyCode == null"
                    />
                  </InputGroup>
                  <p v-if="legacyCode" class="text-xs text-muted-foreground leading-relaxed">
                    Este cargo tiene el código anterior «{{ legacyCode }}». Escriba un código nuevo para pasarlo a la máscara {{ codePrefix }}.
                  </p>
                </div>

                <div class="space-y-3">
                  <Label for="area_position_level" class="leading-snug">Nivel jerárquico</Label>
                  <Input id="area_position_level" v-model.number="form.hierarchy_level" type="number" min="1" max="127" />
                </div>
                <div class="space-y-3 rounded-lg border p-4">
                  <OrgYesNoMultiselect
                    :model-value="form.has_subordinates ? 'yes' : 'no'"
                    input-id="area_position_subordinates"
                    label="¿Tiene personal a cargo?"
                    @update:model-value="(value: OrgYesNoChoice) => { form.has_subordinates = value === 'yes' }"
                  />
                </div>

                <OrgPositionReportsToFields
                  v-model:report-to-org-unit-id="reportToOrgUnitId"
                  v-model:report-to-target-type="reportToTargetType"
                  v-model:report-to-position-choice-id="reportToPositionChoiceId"
                  v-model:report-to-staff-choice-id="reportToStaffChoiceId"
                  :unit-options="unitOptions"
                  :peer-positions="peerPositions"
                  :staff-options="reportToStaffOptions"
                  report-area-input-id="area_position_report_area"
                  report-type-input-id="area_position_report_type"
                  report-choice-input-id="area_position_report_choice"
                />
              </div>

              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="area_position_valid_from"
                to-input-id="area_position_valid_to"
              />

              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="masculine"
                input-id="area_position_active"
                helper-text="Los cargos inactivos no se ofrecen al asignar funcionarios."
                @update:model-value="(value: boolean) => { form.is_active = value }"
              />

              <div class="flex justify-end gap-3">
                <Button v-if="editingId != null" type="button" variant="outline" @click="resetForm">
                  Cancelar edición
                </Button>
                <Button type="submit" :disabled="saving">
                  <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                  {{ editingId == null ? 'Crear cargo' : 'Guardar cargo' }}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Cargos de {{ unit.name }}
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Solo se listan los cargos relacionados con esta área.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="positions.length === 0" class="py-10 text-center text-muted-foreground">
              Esta área todavía no tiene cargos.
            </div>
            <div v-else class="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Reporta a</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead class="text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="position in positions" :key="position.id">
                    <TableCell class="font-medium">
                      {{ position.name }}
                    </TableCell>
                    <TableCell class="font-mono">
                      {{ position.code }}
                    </TableCell>
                    <TableCell>{{ position.hierarchy_level }}</TableCell>
                    <TableCell>{{ position.reports_to_position?.name ?? '—' }}</TableCell>
                    <TableCell>
                      <Badge :variant="position.is_active ? 'default' : 'secondary'">
                        {{ position.is_active ? 'Activo' : 'Inactivo' }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-right">
                      <div v-if="canEdit" class="flex flex-wrap justify-end gap-1">
                        <Button variant="outline" size="sm" class="h-8 px-2 text-xs" @click="startEdit(position)">
                          Editar
                        </Button>
                        <Button
                          v-if="position.is_active"
                          type="button"
                          variant="destructive"
                          size="sm"
                          class="h-8 px-2 text-xs"
                          :disabled="deactivatingId === position.id"
                          @click="deactivatePosition(position.id)"
                        >
                          Desactivar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </template>
    </div>
  </SettingsLayout>
</template>
