<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
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

const reportsCandidates = computed(() =>
  peerPositions.value.filter((p: { id: number; name: string; code: string }) => p.id !== positionId.value),
)

async function loadUnits() {
  const units = await orgApi.fetchUnits({ activeOnly: false })
  unitOptions.value = units.map((u: OrgUnitRow) => ({
    id: u.id,
    label: `${u.name} (${u.org_office?.name ?? '—'})`,
  }))
}

async function loadPeersForUnit(id: number) {
  const list = await orgApi.fetchPositions({
    activeOnly: false,
    orgUnitId: id,
    managerOfOrgUnitOnly: true,
  })
  peerPositions.value = list.map(p => ({ id: p.id, name: p.name, code: p.code }))
}

watch(() => form.value.org_unit_id, async (id: number | null, prev: number | null | undefined) => {
  if (id == null) {
    peerPositions.value = []
    return
  }
  await loadPeersForUnit(id)
  if (prev != null && prev !== id) {
    form.value.reports_to_position_id = null
    chargesSelectedArea.value = 'no'
  }
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
    await loadPeersForUnit(p.org_unit_id)
    const ids = reportsCandidates.value.map(r => r.id)
    if (form.value.reports_to_position_id != null && !ids.includes(form.value.reports_to_position_id)) {
      form.value.reports_to_position_id = null
    }
    const mgrName = p.org_unit?.manager_position_name?.trim() ?? ''
    const posName = p.name.trim()
    chargesSelectedArea.value = mgrName !== '' && mgrName === posName ? 'yes' : 'no'
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
            Modifique datos del puesto y la relación jerárquica. «Reporta a» solo ofrece cargos ya definidos como referencia de jefe de área en ese área.
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
                Área de adscripción, identificación del puesto y relación jerárquica dentro del mismo área.
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
                    Solo cargos con «a cargo del área» en Sí en el mismo área. Si la lista está vacía, cree o marque antes el jefe de área.
                  </p>
                  <Select
                    :model-value="form.reports_to_position_id == null ? 'none' : String(form.reports_to_position_id)"
                    :disabled="!form.org_unit_id"
                    @update:model-value="(v) => { form.reports_to_position_id = v === 'none' ? null : Number(v) }"
                  >
                    <SelectTrigger id="rep_e">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        (Ninguno)
                      </SelectItem>
                      <SelectItem
                        v-for="r in reportsCandidates"
                        :key="r.id"
                        :value="String(r.id)"
                      >
                        {{ r.name }} — {{ r.code }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
