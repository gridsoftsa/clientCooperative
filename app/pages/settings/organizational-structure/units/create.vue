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

const officeSelectOptions = computed(() =>
  offices.value.map(o => ({
    value: o.id,
    label: o.name,
  })),
)

const parentSelectOptions = computed(() =>
  unitsInOffice.value.map(u => ({
    value: u.id,
    label: `${u.name} — ${u.code}`,
  })),
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
        <PageBackButton to="/settings/organizational-structure/units">
          Volver a áreas
        </PageBackButton>
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva área / dependencia
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Debe pertenecer a una agencia. Opcionalmente defina área padre dentro de la misma agencia.
        </p>
      </div>

      <form class="max-w-5xl" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader class="gap-1.5">
            <CardTitle>Datos del área</CardTitle>
            <CardDescription>
              Complete cada bloque de arriba hacia abajo. Los campos con * son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-8">
            <section class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-sm font-semibold leading-none">
                  Ubicación e identificación
                </h3>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  Agencia, jerarquía y datos con los que aparece en el organigrama y la TRD.
                </p>
              </div>
              <div class="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="office">Agencia *</Label>
                  <ArchivalSingleMultiselect
                    id="office"
                    v-model="form.org_office_id"
                    coerce-number
                    :can-clear="false"
                    :options="officeSelectOptions"
                    placeholder="Buscar y seleccionar agencia"
                    no-options-text="No hay agencias activas"
                    no-results-text="Sin coincidencias"
                  />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Sede a la que pertenece esta dependencia.
                  </p>
                </div>
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="parent">Área padre</Label>
                  <ArchivalSingleMultiselect
                    id="parent"
                    :key="`parent-${form.org_office_id ?? 'none'}-${parentSelectOptions.length}`"
                    v-model="form.parent_id"
                    coerce-number
                    searchable
                    :disabled="form.org_office_id == null"
                    :options="parentSelectOptions"
                    placeholder="Buscar área padre (misma agencia)"
                    no-options-text="Seleccione primero una agencia"
                    no-results-text="Sin coincidencias"
                  />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Opcional. Solo áreas de la misma agencia.
                  </p>
                </div>
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="name">Nombre *</Label>
                  <Input id="name" v-model="form.name" required class="h-11" placeholder="Ej: Dirección financiera" />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Nombre visible en organigrama y TRD.
                  </p>
                </div>
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="code">Código *</Label>
                  <Input id="code" v-model="form.code" required class="h-11" maxlength="64" placeholder="Ej: 0014" />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Clave corta, única en el catálogo.
                  </p>
                </div>
                <div class="flex min-w-0 flex-col gap-1.5">
                  <Label for="unit_type">Tipo</Label>
                  <Input id="unit_type" v-model="form.unit_type" placeholder="Ej: Subdirección, Sección…" class="h-11" />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Opcional. Clasificación interna de la dependencia.
                  </p>
                </div>
                <OrgYesNoMultiselect
                  class="!space-y-1.5"
                  :model-value="form.is_document_producer ? 'yes' : 'no'"
                  input-id="unit_create_doc_producer_ms"
                  label="Productora documental (TRD)"
                  helper-text="Sí si esta dependencia clasifica expedientes conforme a TRD."
                  @update:model-value="(v: OrgYesNoChoice) => { form.is_document_producer = v === 'yes' }"
                />
              </div>
            </section>

            <section class="space-y-4 border-t pt-6">
              <div class="space-y-1">
                <h3 class="text-sm font-semibold leading-none">
                  Responsable y relaciones
                </h3>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  El jefe se asigna al editar el área, cuando ya existan funcionarios con ubicación vigente.
                </p>
              </div>
              <div class="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
                <div class="flex min-w-0 flex-col gap-1.5 md:col-span-2">
                  <Label for="mgr_pos_name">Cargo de jefe (referencia)</Label>
                  <Input id="mgr_pos_name" v-model="form.manager_position_name" placeholder="Ej: Coordinador de área" class="h-11" />
                  <p class="text-xs leading-5 text-muted-foreground">
                    Opcional. Puede completarse al crear un cargo «a cargo del área».
                  </p>
                </div>
                <div class="md:col-span-2">
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
              </div>
            </section>

            <section class="space-y-4 border-t pt-6">
              <div class="space-y-1">
                <h3 class="text-sm font-semibold leading-none">
                  Vigencia y estado
                </h3>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  La fecha de inicio es obligatoria para conservar el histórico.
                </p>
              </div>
              <div class="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
                <OrgStructureValidityPeriodFields
                  v-model:valid-from="form.valid_from"
                  v-model:valid-to="form.valid_to"
                  from-input-id="unit_create_valid_from"
                  to-input-id="unit_create_valid_to"
                />
                <OrgStructureActiveMultiselect
                  class="md:col-span-2"
                  :model-value="form.is_active"
                  gender="feminine"
                  input-id="unit_create_active_ms"
                  helper-text="Las áreas inactivas no se proponen en asignaciones ni catálogos de alta por defecto."
                  @update:model-value="onUnitActiveChange"
                />
              </div>
            </section>

            <div class="flex justify-end gap-2 border-t pt-6">
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
