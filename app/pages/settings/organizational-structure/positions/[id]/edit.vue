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
const loading = ref(true)

const chargesSelectedArea = ref<OrgYesNoChoice>('no')

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

function onPositionActiveChange(value: boolean) {
  form.value.is_active = value
}

function onReportToTargetTypeChange(value: unknown): void {
  if (value === 'position' || value === 'staff' || value === 'none') {
    reportToTargetType.value = value
    return
  }
  reportToTargetType.value = 'none'
}

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

async function hydrateReportToFromSaved(reportsTo: OrgPositionRow['reports_to_position']): Promise<void> {
  if (!reportsTo?.org_unit_id) {
    reportToOrgUnitId.value = null
    reportToTargetType.value = 'none'
    reportToPositionChoiceId.value = null
    reportToStaffChoiceId.value = null
    return
  }

  reportToOrgUnitId.value = reportsTo.org_unit_id
  await loadReportToCandidates(reportsTo.org_unit_id)
  reportToTargetType.value = 'position'
  reportToPositionChoiceId.value = reportsTo.id
  form.value.reports_to_position_id = reportsTo.id
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
})

watch(reportToOrgUnitId, async (id: number | null) => {
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
    await hydrateReportToFromSaved(p.reports_to_position)
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
    toast.success('Cargo actualizado')
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
                    <Select
                      :model-value="form.org_unit_id == null ? undefined : String(form.org_unit_id)"
                      @update:model-value="(v) => { form.org_unit_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="unit_pe">
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent class="max-h-72">
                        <SelectItem
                          v-for="u in unitOptions"
                          :key="u.id"
                          :value="String(u.id)"
                        >
                          {{ u.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <OrgYesNoMultiselect
                    v-model="chargesSelectedArea"
                    input-id="position_edit_charges_area_ms"
                    label="¿Este cargo está a cargo del área elegida?"
                    helper-text="Si elige Sí, al guardar se guardará el nombre de este cargo en el área (referencia de jefe de área), además del catálogo de cargos."
                    :disabled="form.org_unit_id == null"
                  />
                </div>

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

                <div class="space-y-3 md:col-span-2">
                  <Label for="rep_e" class="leading-snug">Reporta a (opcional)</Label>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    Elija el área donde está el jefe (p. ej. Gerencia) y luego el cargo o funcionario.
                    Solo aparecen cargos marcados como referencia de jefe de esa área.
                  </p>
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div class="space-y-2">
                      <Label class="text-xs text-muted-foreground">Área de reporte</Label>
                      <Select
                        :model-value="reportToOrgUnitId == null ? 'none' : String(reportToOrgUnitId)"
                        :disabled="!form.org_unit_id"
                        @update:model-value="(v) => { reportToOrgUnitId = v === 'none' ? null : Number(v) }"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione área" />
                        </SelectTrigger>
                        <SelectContent class="max-h-72">
                          <SelectItem value="none">
                            (Sin jefe inmediato)
                          </SelectItem>
                          <SelectItem
                            v-for="u in unitOptions"
                            :key="u.id"
                            :value="String(u.id)"
                          >
                            {{ u.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="space-y-2">
                      <Label class="text-xs text-muted-foreground">Tipo</Label>
                      <Select
                        :model-value="reportToTargetType"
                        :disabled="!reportToOrgUnitId"
                        @update:model-value="onReportToTargetTypeChange"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            (Ninguno)
                          </SelectItem>
                          <SelectItem value="position">
                            Cargo
                          </SelectItem>
                          <SelectItem value="staff">
                            Funcionario
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="space-y-2">
                      <Label class="text-xs text-muted-foreground">Selección</Label>
                      <Select
                        v-if="reportToTargetType === 'position'"
                        :model-value="reportToPositionChoiceId == null ? 'none' : String(reportToPositionChoiceId)"
                        :disabled="!reportToOrgUnitId"
                        @update:model-value="(v) => { reportToPositionChoiceId = v === 'none' ? null : Number(v) }"
                      >
                        <SelectTrigger id="rep_e">
                          <SelectValue placeholder="Seleccione cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            (Ninguno)
                          </SelectItem>
                          <SelectItem
                            v-for="r in peerPositions"
                            :key="r.id"
                            :value="String(r.id)"
                          >
                            {{ r.name }} — {{ r.code }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        v-else-if="reportToTargetType === 'staff'"
                        :model-value="reportToStaffChoiceId == null ? 'none' : String(reportToStaffChoiceId)"
                        :disabled="!reportToOrgUnitId"
                        @update:model-value="(v) => { reportToStaffChoiceId = v === 'none' ? null : Number(v) }"
                      >
                        <SelectTrigger id="rep_e">
                          <SelectValue placeholder="Seleccione funcionario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            (Ninguno)
                          </SelectItem>
                          <SelectItem
                            v-for="s in reportToStaffOptions"
                            :key="s.id"
                            :value="String(s.id)"
                          >
                            {{ s.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        v-else
                        disabled
                        placeholder="Seleccione área y tipo"
                      />
                    </div>
                  </div>
                </div>
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
