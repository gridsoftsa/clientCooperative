<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ORG_ASSIGNMENT_CHANGE_KIND_OPTIONS } from '~/constants/org-structure-assignments'
import type { OrgOffice, OrgStaffListItem } from '~/types/org-structure'
import type { OrgUnitRow, OrgPositionRow } from '~/composables/useOrgStructureApi'
import type { PaginatedUsers, User } from '~/types/user'

const props = withDefaults(
  defineProps<{
    staffId: number
    /** Solo lectura: pestañas Datos y Ubicación sin acciones de guardado. */
    readOnly: boolean
    initialTab?: 'datos' | 'ubicacion'
  }>(),
  { initialTab: 'datos' },
)

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()
const { hasPermission } = usePermissions()

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const activeTab = ref<'datos' | 'ubicacion'>(props.initialTab)

watch(
  () => props.initialTab,
  (v) => {
    if (v) {
      activeTab.value = v
    }
  },
)

const loading = ref(true)
const summary = ref<OrgStaffListItem | null>(null)

const datosForm = ref({
  user_id: null as number | null,
  first_name: '',
  second_name: '',
  first_last_name: '',
  second_last_name: '',
  email: '',
  phone: '',
  extension: '',
  document_number: '',
  is_active: true,
})

const userOptions = ref<Array<{ id: number; label: string }>>([])

const offices = ref<OrgOffice[]>([])
const units = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const supervisorChoices = ref<Array<{ id: number; label: string }>>([])

const ubicacionForm = ref({
  org_office_id: null as number | null,
  org_unit_id: null as number | null,
  org_position_id: null as number | null,
  immediate_supervisor_staff_id: null as number | null,
  effective_from: todayISO(),
  change_kind: 'assignment',
  notes: '',
})

const savingDatos = ref(false)
const savingUbicacion = ref(false)
const loadingCatalogs = ref(false)

/** Evita que los watchers de oficina/área borren unidad y cargo mientras rellenamos desde la asignación vigente. */
const ubicacionHydrating = ref(false)

function staffLabel(s: OrgStaffListItem): string {
  const n = [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
  return `${n}${s.document_number ? ` · ${s.document_number}` : ''}`
}

function onStaffActiveChange(value: boolean) {
  datosForm.value.is_active = value
}

async function loadUsersIfAllowed() {
  if (!hasPermission('usuarios_ver')) {
    return
  }
  try {
    const res = await $api<PaginatedUsers>('/users', { query: { per_page: 200, page: 1 } })
    userOptions.value = res.data.map((u: User) => ({
      id: u.id,
      label: `${u.name || u.email} · ${u.email}`,
    }))
  } catch {
    userOptions.value = []
  }
}

/**
 * Unifica asignación vigente sea snake_case (Eloquent) o camelCase (proxies / futuros recursos).
 */
function parseCurrentAssignmentFromApi(raw: unknown): OrgStaffListItem['current_assignment'] {
  if (raw === null || raw === undefined) {
    return null
  }
  if (typeof raw !== 'object') {
    return null
  }
  const a = raw as Record<string, unknown>
  const office = (a.org_office ?? a.orgOffice) as Record<string, unknown> | undefined
  const unit = (a.org_unit ?? a.orgUnit) as Record<string, unknown> | undefined
  const position = (a.org_position ?? a.orgPosition) as Record<string, unknown> | undefined
  if (office?.id == null || unit?.id == null || position?.id == null) {
    return null
  }
  const sup = (a.immediate_supervisor_staff ?? a.immediateSupervisorStaff) as Record<string, unknown> | undefined
  return {
    org_office: {
      id: Number(office.id),
      name: String(office.name ?? ''),
      code: String(office.code ?? ''),
    },
    org_unit: {
      id: Number(unit.id),
      name: String(unit.name ?? ''),
      code: String(unit.code ?? ''),
    },
    org_position: {
      id: Number(position.id),
      name: String(position.name ?? ''),
      code: String(position.code ?? ''),
    },
    immediate_supervisor_staff:
      sup && sup.id != null
        ? {
            id: Number(sup.id),
            first_name: String(sup.first_name ?? ''),
            first_last_name: String(sup.first_last_name ?? ''),
          }
        : null,
  }
}

async function loadStaffRecord() {
  const res = await $api<{ data: Record<string, unknown> }>(
    `/organizational-structure/org-staff/${props.staffId}`,
  )
  const raw = res.data
  const merged: OrgStaffListItem = {
    ...(raw as unknown as OrgStaffListItem),
    current_assignment: parseCurrentAssignmentFromApi(raw.current_assignment ?? raw.currentAssignment),
  }
  summary.value = merged
  const s = merged
  datosForm.value = {
    user_id: s.user_id ?? s.user?.id ?? null,
    first_name: s.first_name,
    second_name: s.second_name ?? '',
    first_last_name: s.first_last_name,
    second_last_name: s.second_last_name ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    extension: s.extension ?? '',
    document_number: s.document_number ?? '',
    is_active: Boolean(s.is_active),
  }
}

async function loadEditCatalogs() {
  if (props.readOnly) {
    return
  }
  loadingCatalogs.value = true
  try {
    offices.value = await orgApi.fetchOffices({ activeOnly: false })
    const allStaff = await orgApi.fetchStaff({ activeOnly: false })
    supervisorChoices.value = allStaff
      .filter(s => s.id !== props.staffId)
      .map(s => ({ id: s.id, label: staffLabel(s) }))
  } catch {
    offices.value = []
    supervisorChoices.value = []
    toast.error('No se pudieron cargar catálogos de ubicación')
  } finally {
    loadingCatalogs.value = false
  }
}

async function hydrateUbicacionFormFromCurrentAssignment(): Promise<void> {
  if (props.readOnly) {
    return
  }
  const ca = summary.value?.current_assignment
  const officeId = ca?.org_office?.id
  const unitId = ca?.org_unit?.id
  const positionId = ca?.org_position?.id
  if (officeId == null || unitId == null || positionId == null) {
    ubicacionForm.value = {
      org_office_id: null,
      org_unit_id: null,
      org_position_id: null,
      immediate_supervisor_staff_id: null,
      effective_from: todayISO(),
      change_kind: 'assignment',
      notes: '',
    }
    units.value = []
    positions.value = []
    return
  }

  ubicacionHydrating.value = true
  try {
    ubicacionForm.value.org_office_id = officeId
    ubicacionForm.value.org_unit_id = null
    ubicacionForm.value.org_position_id = null
    units.value = await orgApi.fetchUnits({ activeOnly: false, orgOfficeId: officeId })
    ubicacionForm.value.org_unit_id = unitId
    positions.value = await orgApi.fetchPositions({ activeOnly: false, orgUnitId: unitId })
    ubicacionForm.value.org_position_id = positionId
    ubicacionForm.value.immediate_supervisor_staff_id = ca.immediate_supervisor_staff?.id ?? null
    ubicacionForm.value.effective_from = todayISO()
    ubicacionForm.value.change_kind = 'assignment'
    ubicacionForm.value.notes = ''
  } catch {
    toast.error('No se pudo cargar la ubicación vigente en el formulario')
  } finally {
    ubicacionHydrating.value = false
  }
}

watch(
  () => ubicacionForm.value.org_office_id,
  async (id: number | null) => {
    if (props.readOnly || ubicacionHydrating.value) {
      return
    }
    ubicacionForm.value.org_unit_id = null
    ubicacionForm.value.org_position_id = null
    if (id == null) {
      units.value = []
      return
    }
    units.value = await orgApi.fetchUnits({ activeOnly: true, orgOfficeId: id })
  },
)

watch(
  () => ubicacionForm.value.org_unit_id,
  async (id: number | null) => {
    if (props.readOnly || ubicacionHydrating.value) {
      return
    }
    ubicacionForm.value.org_position_id = null
    if (id == null) {
      positions.value = []
      return
    }
    positions.value = await orgApi.fetchPositions({ activeOnly: true, orgUnitId: id })
  },
)

async function loadAll() {
  loading.value = true
  try {
    if (!props.readOnly) {
      await loadUsersIfAllowed()
    }
    await loadStaffRecord()
    await loadEditCatalogs()
    await hydrateUbicacionFormFromCurrentAssignment()
  } catch {
    toast.error('No se encontró el funcionario')
    router.push('/settings/organizational-structure/staff')
  } finally {
    loading.value = false
  }
}

async function handleSubmitDatos() {
  if (props.readOnly) {
    return
  }
  savingDatos.value = true
  try {
    await $api(`/organizational-structure/org-staff/${props.staffId}`, {
      method: 'PUT',
      body: {
        user_id: datosForm.value.user_id,
        first_name: datosForm.value.first_name.trim(),
        second_name: datosForm.value.second_name.trim() || null,
        first_last_name: datosForm.value.first_last_name.trim(),
        second_last_name: datosForm.value.second_last_name.trim() || null,
        email: datosForm.value.email.trim() || null,
        phone: datosForm.value.phone.trim() || null,
        extension: datosForm.value.extension.trim() || null,
        document_number: datosForm.value.document_number.trim() || null,
        is_active: datosForm.value.is_active,
      },
    })
    toast.success('Datos actualizados')
    router.push('/settings/organizational-structure/staff')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    savingDatos.value = false
  }
}

async function submitAssignment() {
  if (props.readOnly) {
    return
  }
  if (
    ubicacionForm.value.org_office_id == null
    || ubicacionForm.value.org_unit_id == null
    || ubicacionForm.value.org_position_id == null
    || !ubicacionForm.value.effective_from
  ) {
    toast.error('Indique oficina, área, cargo y fecha de vigencia')
    return
  }
  savingUbicacion.value = true
  try {
    await $api(`/organizational-structure/org-staff/${props.staffId}/assignments`, {
      method: 'POST',
      body: {
        org_office_id: ubicacionForm.value.org_office_id,
        org_unit_id: ubicacionForm.value.org_unit_id,
        org_position_id: ubicacionForm.value.org_position_id,
        immediate_supervisor_staff_id: ubicacionForm.value.immediate_supervisor_staff_id ?? undefined,
        effective_from: ubicacionForm.value.effective_from,
        change_kind: ubicacionForm.value.change_kind,
        notes: ubicacionForm.value.notes.trim() || undefined,
      },
    })
    toast.success('Ubicación principal registrada (historial actualizado)')
    router.push('/settings/organizational-structure/staff')
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo guardar la asignación')
  } finally {
    savingUbicacion.value = false
  }
}

function supervisorDisplayName(): string {
  const sup = summary.value?.current_assignment?.immediate_supervisor_staff
  if (!sup) {
    return '—'
  }
  return [sup.first_name, sup.first_last_name].filter(Boolean).join(' ')
}

watch(
  () => props.staffId,
  (id) => {
    if (!Number.isFinite(id) || id <= 0) {
      return
    }
    loadAll()
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <p v-if="summary" class="text-muted-foreground leading-relaxed">
      <span class="font-medium text-foreground">{{ staffLabel(summary) }}</span>
    </p>

    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <Tabs v-else v-model="activeTab" class="w-full gap-4">
      <TabsList class="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="datos">
          Datos
        </TabsTrigger>
        <TabsTrigger value="ubicacion">
          Ubicación
        </TabsTrigger>
      </TabsList>

      <TabsContent value="datos" class="mt-4">
        <form @submit.prevent="handleSubmitDatos">
          <div class="grid gap-6">
            <Card v-if="hasPermission('usuarios_ver') && !readOnly">
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Vínculo con usuario del sistema</CardTitle>
                <CardDescription class="leading-relaxed">
                  Asocie o quite la cuenta vinculada a este funcionario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-3">
                  <Label for="usr_panel" class="leading-snug">Usuario del sistema</Label>
                  <Select
                    :model-value="datosForm.user_id == null ? 'none' : String(datosForm.user_id)"
                    @update:model-value="(v) => { datosForm.user_id = v === 'none' ? null : Number(v) }"
                  >
                    <SelectTrigger id="usr_panel">
                      <SelectValue placeholder="Sin vínculo" />
                    </SelectTrigger>
                    <SelectContent class="max-h-60">
                      <SelectItem value="none">
                        (Sin usuario)
                      </SelectItem>
                      <SelectItem
                        v-for="u in userOptions"
                        :key="u.id"
                        :value="String(u.id)"
                      >
                        {{ u.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card v-else-if="readOnly">
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Usuario del sistema</CardTitle>
              </CardHeader>
              <CardContent class="text-sm leading-relaxed">
                <p v-if="summary?.user?.email" class="text-foreground">
                  {{ summary.user.email }}
                </p>
                <p v-else class="text-muted-foreground">
                  Sin vínculo con cuenta de usuario.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Información personal y contacto</CardTitle>
                <CardDescription v-if="!readOnly" class="leading-relaxed">
                  Mantenga coherentes nombre y datos de contacto con los registros institucionales.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                  <div class="space-y-3">
                    <Label for="fn_p" class="leading-snug">Primer nombre <span v-if="!readOnly">*</span></Label>
                    <Input id="fn_p" v-model="datosForm.first_name" :readonly="readOnly" :required="!readOnly" />
                  </div>
                  <div class="space-y-3">
                    <Label for="sn_p" class="leading-snug">Segundo nombre</Label>
                    <Input id="sn_p" v-model="datosForm.second_name" :readonly="readOnly" />
                  </div>
                  <div class="space-y-3">
                    <Label for="fl_p" class="leading-snug">Primer apellido <span v-if="!readOnly">*</span></Label>
                    <Input id="fl_p" v-model="datosForm.first_last_name" :readonly="readOnly" :required="!readOnly" />
                  </div>
                  <div class="space-y-3">
                    <Label for="sl_p" class="leading-snug">Segundo apellido</Label>
                    <Input id="sl_p" v-model="datosForm.second_last_name" :readonly="readOnly" />
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="em_p" class="leading-snug">Correo</Label>
                    <Input id="em_p" v-model="datosForm.email" type="email" :readonly="readOnly" />
                  </div>

                  <div class="space-y-3 md:grid md:grid-cols-2 md:gap-x-6 md:col-span-2">
                    <div class="space-y-3 md:col-span-1">
                      <Label for="ph_p" class="leading-snug">Teléfono</Label>
                      <Input id="ph_p" v-model="datosForm.phone" :readonly="readOnly" />
                    </div>
                    <div class="space-y-3 md:col-span-1">
                      <Label for="ex_p" class="leading-snug">Extensión</Label>
                      <Input id="ex_p" v-model="datosForm.extension" :readonly="readOnly" />
                    </div>
                  </div>

                  <div class="space-y-3 md:col-span-2">
                    <Label for="doc_p" class="leading-snug">Documento</Label>
                    <Input id="doc_p" v-model="datosForm.document_number" :readonly="readOnly" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Estado del registro</CardTitle>
                <CardDescription v-if="!readOnly" class="leading-relaxed">
                  Use el selector para activar o inactivar el registro; al editar se muestra el estado guardado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrgStructureActiveMultiselect
                  :model-value="datosForm.is_active"
                  gender="masculine"
                  input-id="staff_panel_active_ms"
                  :show-label="false"
                  :disabled="readOnly"
                  @update:model-value="onStaffActiveChange"
                />
              </CardContent>
            </Card>

            <div v-if="!readOnly" class="flex justify-end gap-4">
              <Button type="button" variant="outline" @click="router.back()">
                Cancelar
              </Button>
              <Button type="submit" :disabled="savingDatos">
                <Icon v-if="savingDatos" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ savingDatos ? 'Guardando...' : 'Guardar datos' }}
              </Button>
            </div>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="ubicacion" class="mt-4">
        <div class="grid gap-6">
          <Card v-if="summary?.current_assignment" class="border-dashed">
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">
                Asignación vigente
              </CardTitle>
              <CardDescription class="leading-relaxed">
                <template v-if="!readOnly">
                  Al registrar una nueva ubicación se cierra la anterior en el histórico.
                </template>
                <template v-else>
                  Ubicación organizacional actual del funcionario.
                </template>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 text-sm text-muted-foreground leading-relaxed pb-6">
              <p>
                {{ summary.current_assignment.org_office?.name ?? '—' }}
                → {{ summary.current_assignment.org_unit?.name ?? '—' }}
                → {{ summary.current_assignment.org_position?.name ?? '—' }}
              </p>
              <p v-if="readOnly">
                <span class="font-medium text-foreground">Jefe inmediato:</span>
                {{ supervisorDisplayName() }}
              </p>
            </CardContent>
          </Card>

          <Card v-else-if="readOnly" class="border-dashed">
            <CardContent class="py-8 text-center text-muted-foreground leading-relaxed">
              Sin asignación vigente registrada.
            </CardContent>
          </Card>

          <template v-if="!readOnly">
            <div v-if="loadingCatalogs" class="flex justify-center py-12">
              <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>

            <form v-else @submit.prevent="submitAssignment">
              <div class="grid gap-6">
                <Card>
                  <CardHeader class="gap-2">
                    <CardTitle class="leading-snug">Nueva asignación</CardTitle>
                    <CardDescription class="leading-relaxed">
                      Si hay asignación vigente, los campos se cargan con esos valores para que pueda revisarlos o ajustarlos; indique la fecha desde la cual aplica el nuevo movimiento y guarde.
                    </CardDescription>
                  </CardHeader>
                  <CardContent class="space-y-6">
                    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                      <div class="space-y-3 md:col-span-2">
                        <Label for="of_p" class="leading-snug">Oficina principal *</Label>
                        <Select
                          :model-value="ubicacionForm.org_office_id == null ? undefined : String(ubicacionForm.org_office_id)"
                          @update:model-value="(v) => { ubicacionForm.org_office_id = v ? Number(v) : null }"
                        >
                          <SelectTrigger id="of_p">
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
                        <Label for="un_p" class="leading-snug">Área principal *</Label>
                        <Select
                          :model-value="ubicacionForm.org_unit_id == null ? undefined : String(ubicacionForm.org_unit_id)"
                          :disabled="!ubicacionForm.org_office_id"
                          @update:model-value="(v) => { ubicacionForm.org_unit_id = v ? Number(v) : null }"
                        >
                          <SelectTrigger id="un_p">
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
                        <Label for="pos_p" class="leading-snug">Cargo principal *</Label>
                        <Select
                          :model-value="ubicacionForm.org_position_id == null ? undefined : String(ubicacionForm.org_position_id)"
                          :disabled="!ubicacionForm.org_unit_id"
                          @update:model-value="(v) => { ubicacionForm.org_position_id = v ? Number(v) : null }"
                        >
                          <SelectTrigger id="pos_p">
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
                        <Label for="sup_p" class="leading-snug">Jefe inmediato (opcional)</Label>
                        <Select
                          :model-value="ubicacionForm.immediate_supervisor_staff_id == null ? 'none' : String(ubicacionForm.immediate_supervisor_staff_id)"
                          @update:model-value="(v) => { ubicacionForm.immediate_supervisor_staff_id = v === 'none' ? null : Number(v) }"
                        >
                          <SelectTrigger id="sup_p">
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
                          <Label for="eff_p" class="leading-snug">Vigencia desde *</Label>
                          <Input id="eff_p" v-model="ubicacionForm.effective_from" type="date" required />
                        </div>
                        <div class="space-y-3">
                          <Label for="ck_p" class="leading-snug">Tipo de movimiento</Label>
                          <Select v-model="ubicacionForm.change_kind">
                            <SelectTrigger id="ck_p">
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
                        <Label for="nts_p" class="leading-snug">Notas</Label>
                        <Textarea id="nts_p" v-model="ubicacionForm.notes" rows="3" placeholder="Opcional…" class="resize-y min-h-[4.5rem]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div class="flex justify-end gap-4">
                  <Button type="button" variant="outline" @click="router.back()">
                    Cancelar
                  </Button>
                  <Button type="submit" :disabled="savingUbicacion">
                    <Icon v-if="savingUbicacion" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    {{ savingUbicacion ? 'Guardando...' : 'Guardar ubicación' }}
                  </Button>
                </div>
              </div>
            </form>
          </template>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
