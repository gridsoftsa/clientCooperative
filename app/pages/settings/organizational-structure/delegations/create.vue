<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'suplencias_delegaciones_crear'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const units = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const staffChoices = ref<Array<{ id: number; label: string }>>([])

const selectedOrgUnitId = ref<number | null>(null)
/** When set, only staff with this cargo in the selected area appear in titular/suplente. */
const positionFilterId = ref<number | null>(null)

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

function displayStaffName(s: OrgStaffListItem): string {
  if (s.full_name) {
    return s.full_name
  }
  return [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
}

async function reloadStaff() {
  const unitId = selectedOrgUnitId.value
  if (unitId == null) {
    staffChoices.value = []
    return
  }
  loadingStaff.value = true
  try {
    const staff = await orgApi.fetchStaff({
      activeOnly: true,
      orgUnitIds: [unitId],
      ...(positionFilterId.value != null ? { orgPositionIds: [positionFilterId.value] } : {}),
    })
    staffChoices.value = staff.map((s: OrgStaffListItem) => {
      const name = displayStaffName(s) + (s.document_number ? ` · ${s.document_number}` : '')
      const cargo = s.current_assignment?.org_position?.name
      const label = cargo ? `${name} (${cargo})` : name
      return { id: s.id, label }
    })
  } catch {
    toast.error('No se pudo cargar funcionarios del área')
    staffChoices.value = []
  } finally {
    loadingStaff.value = false
  }
}

watch(selectedOrgUnitId, async (unitId) => {
  positionFilterId.value = null
  form.value.assignor_staff_id = null
  form.value.delegate_staff_id = null
  positions.value = []
  staffChoices.value = []
  if (unitId == null) {
    return
  }
  loadingPositions.value = true
  try {
    positions.value = await orgApi.fetchPositions({ activeOnly: true, orgUnitId: unitId })
    await reloadStaff()
  } catch {
    toast.error('No se pudieron cargar cargos del área')
    positions.value = []
  } finally {
    loadingPositions.value = false
  }
})

watch(positionFilterId, async () => {
  form.value.assignor_staff_id = null
  form.value.delegate_staff_id = null
  if (selectedOrgUnitId.value == null) {
    return
  }
  await reloadStaff()
})

onMounted(async () => {
  loadingUnits.value = true
  try {
    units.value = await orgApi.fetchUnits({ activeOnly: true })
  } catch {
    toast.error('No se pudieron cargar áreas')
    units.value = []
  } finally {
    loadingUnits.value = false
  }
})

async function handleSubmit() {
  if (selectedOrgUnitId.value == null) {
    toast.error('Seleccione el área de la delegación')
    return
  }
  if (form.value.assignor_staff_id == null || form.value.delegate_staff_id == null || !form.value.starts_on || !form.value.ends_on) {
    toast.error('Titular, suplente y fechas son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/organizational-structure/org-delegations', {
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
    toast.success('Delegación creada')
    router.push('/settings/organizational-structure/delegations')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-2xl">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva delegación
        </h2>
        <Button variant="outline" @click="router.push('/settings/organizational-structure/delegations')">
          Volver
        </Button>
      </div>
      <p class="text-sm text-muted-foreground leading-relaxed">
        Elija el área y, si lo desea, limite por cargo; luego seleccione titular y suplente entre quienes tienen asignación vigente en ese contexto.
      </p>
      <form class="grid gap-6" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Contexto organizacional</CardTitle>
            <CardDescription>
              Área obligatoria; el filtro por cargo reduce la lista de funcionarios.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <Label for="del_unit">Área *</Label>
              <div v-if="loadingUnits" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando áreas…
              </div>
              <Select
                v-else
                id="del_unit"
                :model-value="selectedOrgUnitId == null ? undefined : String(selectedOrgUnitId)"
                @update:model-value="(v) => { selectedOrgUnitId = v ? Number(v) : null }"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un área" />
                </SelectTrigger>
                <SelectContent class="max-h-72">
                  <SelectItem
                    v-for="u in units"
                    :key="u.id"
                    :value="String(u.id)"
                  >
                    {{ u.name }}
                    <span v-if="u.org_office" class="text-muted-foreground"> — {{ u.org_office.name }}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="del_pos_filter">Cargo (opcional, filtra titular y suplente)</Label>
              <Select
                id="del_pos_filter"
                :disabled="selectedOrgUnitId == null || loadingPositions"
                :model-value="positionFilterId == null ? 'all' : String(positionFilterId)"
                @update:model-value="(v) => { positionFilterId = v === 'all' ? null : Number(v) }"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los cargos del área" />
                </SelectTrigger>
                <SelectContent class="max-h-64">
                  <SelectItem value="all">
                    Todos los cargos del área
                  </SelectItem>
                  <SelectItem
                    v-for="p in positions"
                    :key="p.id"
                    :value="String(p.id)"
                  >
                    {{ p.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Titular y suplente</CardTitle>
            <CardDescription>
              Solo aparecen funcionarios con ubicación vigente en el área (y cargo, si aplica).
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <Label>Titular *</Label>
              <div v-if="selectedOrgUnitId == null" class="text-sm text-muted-foreground py-1">
                Seleccione un área primero.
              </div>
              <div v-else-if="loadingStaff" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando funcionarios…
              </div>
              <Select
                v-else
                :model-value="form.assignor_staff_id == null ? undefined : String(form.assignor_staff_id)"
                @update:model-value="(v) => { form.assignor_staff_id = v ? Number(v) : null }"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione titular" />
                </SelectTrigger>
                <SelectContent class="max-h-72">
                  <SelectItem v-for="s in staffChoices" :key="s.id" :value="String(s.id)">
                    {{ s.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Suplente *</Label>
              <div v-if="selectedOrgUnitId == null" class="text-sm text-muted-foreground py-1">
                Seleccione un área primero.
              </div>
              <div v-else-if="loadingStaff" class="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin shrink-0" />
                Cargando funcionarios…
              </div>
              <Select
                v-else
                :model-value="form.delegate_staff_id == null ? undefined : String(form.delegate_staff_id)"
                @update:model-value="(v) => { form.delegate_staff_id = v ? Number(v) : null }"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione suplente" />
                </SelectTrigger>
                <SelectContent class="max-h-72">
                  <SelectItem v-for="s in staffChoices" :key="`d-${s.id}`" :value="String(s.id)">
                    {{ s.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
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
