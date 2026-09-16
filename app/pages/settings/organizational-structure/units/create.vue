<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import { todayIsoDateString } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const offices = ref<OrgOffice[]>([])
const unitsInOffice = ref<OrgUnitRow[]>([])
const allUnits = ref<OrgUnitRow[]>([])

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
  valid_from: todayIsoDateString(),
  valid_to: '',
  related_org_unit_ids: [] as number[],
})

const saving = ref(false)

function onUnitActiveChange(value: boolean) {
  form.value.is_active = value
}

const areaOptions = computed(() =>
  allUnits.value.map((u) => {
    const officeName = u.org_office?.name
    return {
      id: u.id,
      label: officeName ? `${u.name} · ${officeName}` : `${u.name} (${u.code})`,
    }
  }),
)

async function loadCatalogs() {
  try {
    offices.value = await orgApi.fetchOffices({ activeOnly: true })
    allUnits.value = await orgApi.fetchUnits({ activeOnly: true })
  }
  catch {
    toast.error('Error al cargar catálogos')
  }
}

watch(() => form.value.org_office_id, async (id: number | null) => {
  form.value.parent_id = null
  if (id == null) {
    unitsInOffice.value = []
    return
  }
  try {
    unitsInOffice.value = await orgApi.fetchUnits({ activeOnly: true, orgOfficeId: id })
  }
  catch {
    unitsInOffice.value = []
  }
})

async function handleSubmit() {
  if (form.value.org_office_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Agencia, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/organizational-structure/org-units', {
      method: 'POST',
      body: {
        org_office_id: form.value.org_office_id,
        parent_id: form.value.parent_id ?? undefined,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        unit_type: form.value.unit_type.trim() || undefined,
        is_document_producer: form.value.is_document_producer,
        manager_staff_id: form.value.manager_staff_id ?? undefined,
        manager_position_name: form.value.manager_position_name.trim() || undefined,
        is_active: form.value.is_active,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        related_org_unit_ids:
          form.value.related_org_unit_ids.length > 0 ? form.value.related_org_unit_ids : undefined,
      },
    })
    toast.success('Área creada')
    router.push('/settings/organizational-structure/units')
  }
  catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCatalogs()
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
          Nueva área / dependencia
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Debe pertenecer a una agencia. Opcionalmente defina área padre dentro de la misma agencia.
        </p>
      </div>

      <form @submit.prevent="handleSubmit">
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
                <Label for="office">Agencia *</Label>
                <Select
                  :model-value="form.org_office_id == null ? '' : String(form.org_office_id)"
                  @update:model-value="(v) => { form.org_office_id = v ? Number(v) : null }"
                >
                  <SelectTrigger id="office">
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
                <Label for="parent">Área padre (opcional)</Label>
                <Select
                  :model-value="form.parent_id == null ? 'none' : String(form.parent_id)"
                  :disabled="!form.org_office_id"
                  @update:model-value="(v) => { form.parent_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Sin padre — raíz del área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      (Ninguno)
                    </SelectItem>
                    <SelectItem
                      v-for="u in unitsInOffice"
                      :key="u.id"
                      :value="String(u.id)"
                    >
                      {{ u.name }} — {{ u.code }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="name">Nombre *</Label>
                <Input id="name" v-model="form.name" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="code">Código *</Label>
                <Input id="code" v-model="form.code" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="unit_type">Tipo (opcional)</Label>
                <Input id="unit_type" v-model="form.unit_type" placeholder="Ej: Subdirección, Sección…" />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <OrgYesNoMultiselect
                  :model-value="form.is_document_producer ? 'yes' : 'no'"
                  input-id="unit_create_doc_producer_ms"
                  label="¿Es área productora documental (TRD)?"
                  helper-text="Sí si esta dependencia clasifica expedientes conforme a TRD."
                  @update:model-value="(v: OrgYesNoChoice) => { form.is_document_producer = v === 'yes' }"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="mgr_create_ms">Responsable / jefe del área (opcional)</Label>
                <OrgUnitManagerStaffMultiselect
                  v-model="form.manager_staff_id"
                  :org-unit-id="null"
                  input-id="mgr_create_ms"
                />
                <p class="text-xs text-muted-foreground">
                  El jefe se asigna al editar el área, con funcionarios vigentes en esa dependencia.
                </p>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="mgr_pos_name">Cargo de jefe (referencia)</Label>
                <Input id="mgr_pos_name" v-model="form.manager_position_name" placeholder="Ej: Coordinador de área" />
                <p class="text-xs text-muted-foreground">
                  Opcional. Puede completarse al crear un cargo marcado «a cargo del área».
                </p>
              </div>
              <div class="lg:col-span-2">
                <OrgInstitutionalProcessesMultiselect
                  v-model="form.related_org_unit_ids"
                  :options="areaOptions"
                  input-id="unit_create_related_areas_ms"
                  label="Áreas asociadas"
                  helper-text="Opcional: otras áreas ya creadas en la estructura."
                  placeholder="Busque y seleccione áreas creadas"
                  no-options-text="No hay áreas creadas aún"
                  no-results-text="Sin coincidencias"
                />
              </div>
              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="unit_create_valid_from"
                to-input-id="unit_create_valid_to"
              />
              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="unit_create_active_ms"
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
                {{ saving ? 'Guardando...' : 'Crear área' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  </SettingsLayout>
</template>
