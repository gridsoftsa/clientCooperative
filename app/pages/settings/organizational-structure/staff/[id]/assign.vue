<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ORG_ASSIGNMENT_CHANGE_KIND_OPTIONS } from '~/constants/org-structure-assignments'
import type { OrgOffice, OrgStaffListItem } from '~/types/org-structure'
import type { OrgUnitRow, OrgPositionRow } from '~/composables/useOrgStructureApi'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const staffId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const offices = ref<OrgOffice[]>([])
const units = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const supervisorChoices = ref<Array<{ id: number; label: string }>>([])
const summary = ref<OrgStaffListItem | null>(null)

const form = ref({
  org_office_id: null as number | null,
  org_unit_id: null as number | null,
  org_position_id: null as number | null,
  immediate_supervisor_staff_id: null as number | null,
  effective_from: todayISO(),
  change_kind: 'assignment',
  notes: '',
})

const saving = ref(false)
const loadingCatalogs = ref(true)

function staffLabel(s: OrgStaffListItem): string {
  const n = [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
  return `${n}${s.document_number ? ` · ${s.document_number}` : ''}`
}

async function loadCatalogsAndSummary() {
  loadingCatalogs.value = true
  try {
    offices.value = await orgApi.fetchOffices({ activeOnly: true })
    const resStaff = await $api<{ data: OrgStaffListItem }>(`/organizational-structure/org-staff/${staffId.value}`)
    summary.value = resStaff.data

    const allStaff = await orgApi.fetchStaff({ activeOnly: true })
    supervisorChoices.value = allStaff
      .filter(s => s.id !== staffId.value)
      .map(s => ({ id: s.id, label: staffLabel(s) }))
  } catch {
    toast.error('No se pudo cargar datos')
    summary.value = null
  } finally {
    loadingCatalogs.value = false
  }
}

watch(() => form.value.org_office_id, async (id: number | null) => {
  form.value.org_unit_id = null
  form.value.org_position_id = null
  if (id == null) {
    units.value = []
    return
  }
  units.value = await orgApi.fetchUnits({ activeOnly: true, orgOfficeId: id })
})

watch(() => form.value.org_unit_id, async (id: number | null) => {
  form.value.org_position_id = null
  if (id == null) {
    positions.value = []
    return
  }
  positions.value = await orgApi.fetchPositions({ activeOnly: true, orgUnitId: id })
})

async function submitAssignment() {
  if (
    form.value.org_office_id == null
    || form.value.org_unit_id == null
    || form.value.org_position_id == null
    || !form.value.effective_from
  ) {
    toast.error('Indique oficina, área, cargo y fecha de vigencia')
    return
  }
  saving.value = true
  try {
    await $api(`/organizational-structure/org-staff/${staffId.value}/assignments`, {
      method: 'POST',
      body: {
        org_office_id: form.value.org_office_id,
        org_unit_id: form.value.org_unit_id,
        org_position_id: form.value.org_position_id,
        immediate_supervisor_staff_id: form.value.immediate_supervisor_staff_id ?? undefined,
        effective_from: form.value.effective_from,
        change_kind: form.value.change_kind,
        notes: form.value.notes.trim() || undefined,
      },
    })
    toast.success('Ubicación principal registrada (historial actualizado)')
    router.push('/settings/organizational-structure/staff')
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo guardar la asignación')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCatalogsAndSummary()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Ubicación organizacional
          </h2>
          <p v-if="summary" class="text-muted-foreground leading-relaxed">
            Funcionario: <span class="font-medium text-foreground">{{ staffLabel(summary) }}</span>
          </p>
          <p v-else class="text-muted-foreground leading-relaxed">
            Defina la asignación principal de oficina, área y cargo.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div class="grid gap-6">
        <Card v-if="summary?.current_assignment" class="border-dashed">
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Asignación vigente
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Al registrar una nueva ubicación se cierra la anterior en el histórico.
            </CardDescription>
          </CardHeader>
          <CardContent class="text-sm text-muted-foreground leading-relaxed pb-6">
            {{ summary.current_assignment.org_office?.name }}
            → {{ summary.current_assignment.org_unit?.name }}
            → {{ summary.current_assignment.org_position?.name }}
          </CardContent>
        </Card>

        <div v-if="loadingCatalogs" class="flex justify-center py-12">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <form v-else @submit.prevent="submitAssignment">
          <div class="grid gap-6">
            <Card>
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Nueva asignación</CardTitle>
                <CardDescription class="leading-relaxed">
                  Seleccione oficina, área y cargo principal; registre fecha de vigencia y tipo de movimiento.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                  <div class="space-y-3 md:col-span-2">
                    <Label for="of_as" class="leading-snug">Oficina principal *</Label>
                    <Select
                      :model-value="form.org_office_id == null ? undefined : String(form.org_office_id)"
                      @update:model-value="(v) => { form.org_office_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="of_as">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="o in offices"
                          :key="o.id"
                          :value="String(o.id)"
                        >
                          {{ o.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="un_as" class="leading-snug">Área principal *</Label>
                    <Select
                      :model-value="form.org_unit_id == null ? undefined : String(form.org_unit_id)"
                      :disabled="!form.org_office_id"
                      @update:model-value="(v) => { form.org_unit_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="un_as">
                        <SelectValue placeholder="Seleccione área" />
                      </SelectTrigger>
                      <SelectContent class="max-h-64">
                        <SelectItem
                          v-for="u in units"
                          :key="u.id"
                          :value="String(u.id)"
                        >
                          {{ u.name }} — {{ u.code }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="pos_as" class="leading-snug">Cargo principal *</Label>
                    <Select
                      :model-value="form.org_position_id == null ? undefined : String(form.org_position_id)"
                      :disabled="!form.org_unit_id"
                      @update:model-value="(v) => { form.org_position_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="pos_as">
                        <SelectValue placeholder="Seleccione cargo" />
                      </SelectTrigger>
                      <SelectContent class="max-h-64">
                        <SelectItem
                          v-for="p in positions"
                          :key="p.id"
                          :value="String(p.id)"
                        >
                          {{ p.name }} — {{ p.code }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="sup_as" class="leading-snug">Jefe inmediato (opcional)</Label>
                    <Select
                      :model-value="form.immediate_supervisor_staff_id == null ? 'none' : String(form.immediate_supervisor_staff_id)"
                      @update:model-value="(v) => { form.immediate_supervisor_staff_id = v === 'none' ? null : Number(v) }"
                    >
                      <SelectTrigger id="sup_as">
                        <SelectValue placeholder="Sin definir" />
                      </SelectTrigger>
                      <SelectContent class="max-h-56">
                        <SelectItem value="none">
                          (Ninguno)
                        </SelectItem>
                        <SelectItem
                          v-for="s in supervisorChoices"
                          :key="s.id"
                          :value="String(s.id)"
                        >
                          {{ s.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                    <div class="space-y-3">
                      <Label for="eff" class="leading-snug">Vigencia desde *</Label>
                      <Input id="eff" v-model="form.effective_from" type="date" required />
                    </div>
                    <div class="space-y-3">
                      <Label for="ck" class="leading-snug">Tipo de movimiento</Label>
                      <Select v-model="form.change_kind">
                        <SelectTrigger id="ck">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="opt in ORG_ASSIGNMENT_CHANGE_KIND_OPTIONS"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="nts" class="leading-snug">Notas</Label>
                    <Textarea id="nts" v-model="form.notes" rows="3" placeholder="Opcional…" class="resize-y min-h-[4.5rem]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div class="flex justify-end gap-4">
              <Button type="button" variant="outline" @click="router.back()">
                Cancelar
              </Button>
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ saving ? 'Guardando...' : 'Guardar ubicación' }}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </SettingsLayout>
</template>
