<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import { toDateInputValue } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const unitId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const offices = ref<OrgOffice[]>([])
const unitsInOffice = ref<OrgUnitRow[]>([])
const allUnits = ref<OrgUnitRow[]>([])
const loading = ref(true)
const managerStaffSelectRef = ref<{
  ensureManagerInList: (manager: { id: number, first_name: string, first_last_name: string } | null | undefined) => void
  containsStaff: (staffId: number) => boolean
} | null>(null)
const pendingManagerStaff = ref<{ id: number, first_name: string, first_last_name: string } | null>(null)

const form = ref({
  org_office_id: null as number | null,
  parent_id: null as number | null,
  name: '',
  code: '',
  unit_type: '',
  is_document_producer: false,
  manager_staff_id: null as number | null,
  manager_position_name: '',
  is_active: true,
  valid_from: '',
  valid_to: '',
  related_org_unit_ids: [] as number[],
})

const saving = ref(false)

function onUnitActiveChange(value: boolean) {
  form.value.is_active = value
}

const parentsFiltered = computed(() =>
  unitsInOffice.value.filter(u => u.id !== unitId.value),
)

const areaOptions = computed(() =>
  allUnits.value
    .filter(u => u.id !== unitId.value)
    .map((u) => {
      const officeName = u.org_office?.name
      return {
        id: u.id,
        label: officeName ? `${u.name} · ${officeName}` : `${u.name} (${u.code})`,
      }
    }),
)

async function loadCatalogs() {
  offices.value = await orgApi.fetchOffices({ activeOnly: false })
  allUnits.value = await orgApi.fetchUnits({ activeOnly: false })
}

function onManagerStaffReady() {
  managerStaffSelectRef.value?.ensureManagerInList(pendingManagerStaff.value ?? undefined)
  if (
    form.value.manager_staff_id != null
    && !managerStaffSelectRef.value?.containsStaff(form.value.manager_staff_id)
  ) {
    form.value.manager_staff_id = null
  }
}

async function refreshUnitsForOffice(id: number) {
  unitsInOffice.value = await orgApi.fetchUnits({ orgOfficeId: id })
}

watch(() => form.value.org_office_id, async (id) => {
  if (id == null) {
    unitsInOffice.value = []
    return
  }
  await refreshUnitsForOffice(id)
})

async function loadUnit() {
  loading.value = true
  try {
    await loadCatalogs()
    const res = await $api<{ data: OrgUnitRow }>(`/organizational-structure/org-units/${unitId.value}`)
    const u = res.data
    pendingManagerStaff.value = u.manager_staff ?? null
    form.value = {
      org_office_id: u.org_office_id,
      parent_id: u.parent_id,
      name: u.name,
      code: u.code,
      unit_type: u.unit_type ?? '',
      is_document_producer: Boolean(u.is_document_producer),
      manager_staff_id: u.manager_staff_id ?? null,
      manager_position_name: u.manager_position_name ?? '',
      is_active: Boolean(u.is_active),
      valid_from: toDateInputValue(u.valid_from),
      valid_to: toDateInputValue(u.valid_to),
      related_org_unit_ids: (u.related_units ?? []).map(x => x.id),
    }
    await refreshUnitsForOffice(u.org_office_id)
    await nextTick()
    onManagerStaffReady()
  }
  catch {
    toast.error('No se encontró el área')
    router.push('/settings/organizational-structure/units')
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (form.value.org_office_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Agencia, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api(`/organizational-structure/org-units/${unitId.value}`, {
      method: 'PUT',
      body: {
        org_office_id: form.value.org_office_id,
        parent_id: form.value.parent_id ?? undefined,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        unit_type: form.value.unit_type.trim() || null,
        is_document_producer: form.value.is_document_producer,
        manager_staff_id: form.value.manager_staff_id ?? null,
        manager_position_name: form.value.manager_position_name.trim() || null,
        is_active: form.value.is_active,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        related_org_unit_ids: form.value.related_org_unit_ids,
      },
    })
    toast.success('Área actualizada')
    router.push('/settings/organizational-structure/units')
  }
  catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUnit()
})
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure/units')">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Volver a áreas
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar área
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Actualice datos de la dependencia, responsable y áreas asociadas.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Datos del área</CardTitle>
            <CardDescription>
              Identificación, jerarquía, TRD y responsable.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="grid items-start gap-6 lg:grid-cols-2">
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="office_e">Agencia *</Label>
                <Select
                  :model-value="form.org_office_id == null ? undefined : String(form.org_office_id)"
                  @update:model-value="(v) => { form.org_office_id = v ? Number(v) : null }"
                >
                  <SelectTrigger id="office_e">
                    <SelectValue placeholder="Seleccione agencia" />
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
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="parent_e">Área padre (opcional)</Label>
                <Select
                  :model-value="form.parent_id == null ? 'none' : String(form.parent_id)"
                  :disabled="!form.org_office_id"
                  @update:model-value="(v) => { form.parent_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="parent_e">
                    <SelectValue placeholder="Sin padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      (Ninguno)
                    </SelectItem>
                    <SelectItem
                      v-for="u in parentsFiltered"
                      :key="u.id"
                      :value="String(u.id)"
                    >
                      {{ u.name }} — {{ u.code }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="name_e">Nombre *</Label>
                <Input id="name_e" v-model="form.name" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="code_e">Código *</Label>
                <Input id="code_e" v-model="form.code" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="unit_type_e">Tipo (opcional)</Label>
                <Input id="unit_type_e" v-model="form.unit_type" />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <OrgYesNoMultiselect
                  :model-value="form.is_document_producer ? 'yes' : 'no'"
                  input-id="unit_edit_doc_producer_ms"
                  label="¿Es área productora documental (TRD)?"
                  helper-text="Sí si esta dependencia clasifica expedientes conforme a TRD."
                  @update:model-value="(v: OrgYesNoChoice) => { form.is_document_producer = v === 'yes' }"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="mgr_e">Jefe del área (opcional)</Label>
                <OrgUnitManagerStaffMultiselect
                  ref="managerStaffSelectRef"
                  v-model="form.manager_staff_id"
                  :org-unit-id="unitId"
                  input-id="mgr_e_ms"
                  @ready="onManagerStaffReady"
                />
                <p class="text-xs text-muted-foreground">
                  Se asigna si hay un funcionario vigente en el cargo «a cargo del área»; también puede elegirlo.
                </p>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="mgr_pos_name_e">Cargo de jefe (referencia)</Label>
                <Input id="mgr_pos_name_e" v-model="form.manager_position_name" placeholder="Ej: Coordinador de área" />
                <p class="text-xs text-muted-foreground">
                  Opcional. Puede actualizarse al crear un cargo «a cargo del área».
                </p>
              </div>
              <div class="lg:col-span-2">
                <OrgInstitutionalProcessesMultiselect
                  v-model="form.related_org_unit_ids"
                  :options="areaOptions"
                  input-id="unit_edit_related_areas_ms"
                  label="Áreas asociadas"
                  helper-text="Opcional: otras áreas ya creadas en la estructura."
                  placeholder="Busque y seleccione áreas creadas"
                  no-options-text="No hay otras áreas creadas"
                  no-results-text="Sin coincidencias"
                />
              </div>
              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="unit_edit_valid_from"
                to-input-id="unit_edit_valid_to"
              />
              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="unit_edit_active_ms"
                helper-text="Las áreas inactivas no se proponen en asignaciones ni catálogos de alta por defecto."
                @update:model-value="onUnitActiveChange"
              />
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="router.back()">
                Cancelar
              </Button>
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  </SettingsLayout>
</template>
