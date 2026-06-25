<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import { ORG_ASSIGNMENT_CHANGE_KIND_OPTIONS } from '~/constants/org-structure-assignments'
import type { OrgOffice, OrgStaffListItem } from '~/types/org-structure'
import { toDateInputValue } from '~/utils/dateInputValue'
import type { OrgUnitRow, OrgPositionRow } from '~/composables/useOrgStructureApi'
import type { PaginatedUsers, User } from '~/types/user'
import {
  hasStaffPersonalInfoForUserPrefill,
  staffEditDraftKey,
  staffEditReturnPath,
  userCreatePrefillFromStaff,
  USER_CREATE_PREFILL_FROM_STAFF_KEY,
} from '~/utils/staff-user-create-bridge'

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
const route = useRoute()
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
  document_type: 'CC',
  document_number: '',
  is_active: true,
})

const userOptions = ref<Array<{ id: number; label: string }>>([])

const userSelectOptions = computed(() =>
  userOptions.value.map(u => ({
    value: u.id,
    label: u.label,
  })),
)

function restoreDraftFromStorage() {
  if (!import.meta.client) {
    return false
  }
  const raw = sessionStorage.getItem(staffEditDraftKey(props.staffId))
  if (!raw) {
    return false
  }
  try {
    const parsed = JSON.parse(raw) as typeof datosForm.value
    datosForm.value = { ...datosForm.value, ...parsed }
  } catch {
    // ignore corrupt draft
  } finally {
    sessionStorage.removeItem(staffEditDraftKey(props.staffId))
  }
  return true
}

function saveDraftAndGoCreateUser() {
  if (!import.meta.client) {
    return
  }
  sessionStorage.setItem(staffEditDraftKey(props.staffId), JSON.stringify(datosForm.value))
  if (hasStaffPersonalInfoForUserPrefill(datosForm.value)) {
    sessionStorage.setItem(
      USER_CREATE_PREFILL_FROM_STAFF_KEY,
      JSON.stringify(userCreatePrefillFromStaff(datosForm.value)),
    )
  } else {
    sessionStorage.removeItem(USER_CREATE_PREFILL_FROM_STAFF_KEY)
  }
  router.push({
    path: '/settings/users/create',
    query: { returnTo: staffEditReturnPath(props.staffId) },
  })
}

async function ensureSelectedUserInOptions(userId: number) {
  if (userOptions.value.some(u => u.id === userId)) {
    return
  }
  try {
    const res = await $api<{ data: User }>(`/users/${userId}`)
    const u = res.data
    if (u.org_staff_id == null || u.org_staff_id === props.staffId) {
      userOptions.value = [
        ...userOptions.value,
        { id: u.id, label: `${u.name || u.email} · ${u.email}` },
      ]
    }
  } catch {
    // ignore — multiselect may still show id if options load later
  }
}

function applyReturnedUserFromQuery() {
  const raw = route.query.user_id
  const userId = typeof raw === 'string' ? Number(raw) : null
  if (userId != null && Number.isFinite(userId) && userId > 0) {
    datosForm.value.user_id = userId
    void ensureSelectedUserInOptions(userId)
    const nextQuery = { ...route.query }
    delete nextQuery.user_id
    router.replace({ path: route.path, query: nextQuery })
  }
}

const offices = ref<OrgOffice[]>([])
const units = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const supervisorUnitOptions = ref<Array<{ id: number; label: string }>>([])
const supervisorPositions = ref<Array<{ id: number; name: string; code: string }>>([])
const supervisorChoices = ref<Array<{ id: number; label: string }>>([])
const supervisorOrgUnitId = ref<number | null>(null)
const supervisorOrgPositionId = ref<number | null>(null)

const ubicacionForm = ref({
  org_office_id: null as number | null,
  org_unit_id: null as number | null,
  org_position_id: null as number | null,
  immediate_supervisor_staff_id: null as number | null,
  effective_from: todayISO(),
  effective_to: '',
  change_kind: 'assignment',
  notes: '',
})

const savingDatos = ref(false)
const savingUbicacion = ref(false)
const loadingCatalogs = ref(false)

/** Evita que los watchers de agencia/área borren unidad y cargo mientras rellenamos desde la asignación vigente. */
const ubicacionHydrating = ref(false)
/** Evita que los watchers del jefe borren selección mientras rellenamos desde la asignación vigente. */
const supervisorHydrating = ref(false)

const { options: documentTypeOptions, fetchOptions: fetchDocumentTypeOptions, labelForValue: documentTypeLabel } =
  useTemplateFlatCatalogOptions('tipo-documento', [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'NIT', label: 'NIT' },
  ])

const officeSelectOptions = computed(() =>
  offices.value.map(o => ({ value: o.id, label: o.name })),
)

const unitSelectOptions = computed(() =>
  units.value.map(u => ({ value: u.id, label: `${u.name} — ${u.code}` })),
)

const positionSelectOptions = computed(() =>
  positions.value.map(p => ({ value: p.id, label: `${p.name} — ${p.code}` })),
)

const supervisorUnitSelectOptions = computed(() =>
  supervisorUnitOptions.value.map(u => ({ value: u.id, label: u.label })),
)

const supervisorPositionSelectOptions = computed(() =>
  supervisorPositions.value.map(p => ({ value: p.id, label: `${p.name} — ${p.code}` })),
)

const supervisorStaffSelectOptions = computed(() =>
  supervisorChoices.value.map(s => ({ value: s.id, label: s.label })),
)

const changeKindSelectOptions = computed(() =>
  ORG_ASSIGNMENT_CHANGE_KIND_OPTIONS.map(o => ({ value: o.value, label: o.label })),
)

function staffLabel(s: OrgStaffListItem): string {
  const n = [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
  return `${n}${s.document_number ? ` · ${s.document_number}` : ''}`
}

function onStaffActiveChange(value: boolean) {
  datosForm.value.is_active = value
}

async function loadUsersIfAllowed() {
  if (!hasPermission('usuarios_ver')) {
    userOptions.value = []
    return
  }
  try {
    const res = await $api<PaginatedUsers>('/users', { query: { per_page: 200, page: 1 } })
    userOptions.value = res.data
      .filter((u: User) => u.org_staff_id == null || u.org_staff_id === props.staffId)
      .map((u: User) => ({
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
  const effFromRaw = a.effective_from ?? a.effectiveFrom
  const effToRaw = a.effective_to ?? a.effectiveTo
  const effective_from
    = effFromRaw != null && effFromRaw !== '' ? toDateInputValue(String(effFromRaw)) : null
  const effective_to = effToRaw != null && effToRaw !== '' ? toDateInputValue(String(effToRaw)) : null

  return {
    effective_from,
    effective_to,
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
    document_type: s.document_type ?? 'CC',
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
    const allUnits = await orgApi.fetchUnits({ activeOnly: true })
    supervisorUnitOptions.value = allUnits.map((u: OrgUnitRow) => ({
      id: u.id,
      label: `${u.name} (${u.org_office?.name ?? '—'})`,
    }))
  } catch {
    offices.value = []
    supervisorUnitOptions.value = []
    toast.error('No se pudieron cargar catálogos de ubicación')
  } finally {
    loadingCatalogs.value = false
  }
}

async function loadSupervisorPositions(orgUnitId: number): Promise<void> {
  supervisorPositions.value = (await orgApi.fetchPositions({
    activeOnly: true,
    orgUnitId,
  })).map(p => ({ id: p.id, name: p.name, code: p.code }))
}

async function loadSupervisorChoices(orgUnitId: number, orgPositionId: number): Promise<void> {
  const staff = await orgApi.fetchStaff({
    activeOnly: true,
    orgUnitIds: [orgUnitId],
    orgPositionIds: [orgPositionId],
  })
  supervisorChoices.value = staff
    .filter(s => s.id !== props.staffId)
    .map(s => ({ id: s.id, label: staffLabel(s) }))
}

function resetSupervisorSelection(): void {
  supervisorOrgUnitId.value = null
  supervisorOrgPositionId.value = null
  supervisorPositions.value = []
  supervisorChoices.value = []
  ubicacionForm.value.immediate_supervisor_staff_id = null
}

async function hydrateSupervisorFromSaved(supervisorId: number | null): Promise<void> {
  if (supervisorId == null) {
    resetSupervisorSelection()
    return
  }

  supervisorHydrating.value = true
  try {
    const res = await $api<{ data: Record<string, unknown> }>(
      `/organizational-structure/org-staff/${supervisorId}`,
    )
    const assignment = parseCurrentAssignmentFromApi(
      res.data.current_assignment ?? res.data.currentAssignment,
    )
    const unitId = assignment?.org_unit?.id
    const positionId = assignment?.org_position?.id

    if (unitId == null || positionId == null) {
      ubicacionForm.value.immediate_supervisor_staff_id = supervisorId
      supervisorOrgUnitId.value = null
      supervisorOrgPositionId.value = null
      supervisorPositions.value = []
      supervisorChoices.value = [{
        id: supervisorId,
        label: staffLabel({
          ...(res.data as unknown as OrgStaffListItem),
          current_assignment: assignment,
        }),
      }]
      return
    }

    supervisorOrgUnitId.value = unitId
    await loadSupervisorPositions(unitId)
    supervisorOrgPositionId.value = positionId
    await loadSupervisorChoices(unitId, positionId)
    ubicacionForm.value.immediate_supervisor_staff_id = supervisorId
  } catch {
    ubicacionForm.value.immediate_supervisor_staff_id = supervisorId
    toast.error('No se pudo cargar el jefe inmediato guardado')
  } finally {
    supervisorHydrating.value = false
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
      effective_to: '',
      change_kind: 'assignment',
      notes: '',
    }
    units.value = []
    positions.value = []
    resetSupervisorSelection()
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
    ubicacionForm.value.effective_from = todayISO()
    ubicacionForm.value.effective_to = ''
    ubicacionForm.value.change_kind = 'assignment'
    ubicacionForm.value.notes = ''
    await hydrateSupervisorFromSaved(ca.immediate_supervisor_staff?.id ?? null)
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

watch(supervisorOrgUnitId, async (id: number | null) => {
  if (props.readOnly || supervisorHydrating.value) {
    return
  }
  supervisorOrgPositionId.value = null
  ubicacionForm.value.immediate_supervisor_staff_id = null
  supervisorChoices.value = []
  if (id == null) {
    supervisorPositions.value = []
    return
  }
  await loadSupervisorPositions(id)
})

watch(supervisorOrgPositionId, async (id: number | null) => {
  if (props.readOnly || supervisorHydrating.value) {
    return
  }
  ubicacionForm.value.immediate_supervisor_staff_id = null
  if (id == null || supervisorOrgUnitId.value == null) {
    supervisorChoices.value = []
    return
  }
  await loadSupervisorChoices(supervisorOrgUnitId.value, id)
})

async function loadAll() {
  loading.value = true
  try {
    if (!props.readOnly) {
      await Promise.all([loadUsersIfAllowed(), fetchDocumentTypeOptions()])
    } else {
      await fetchDocumentTypeOptions()
    }
    await loadStaffRecord()
    restoreDraftFromStorage()
    applyReturnedUserFromQuery()
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
  const docNumber = datosForm.value.document_number.trim()
  const docType = datosForm.value.document_type.trim()
  if ((docNumber && !docType) || (docType && !docNumber)) {
    toast.error('Indique tipo y número de documento')
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
        document_type: docType || null,
        document_number: docNumber || null,
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
    toast.error('Indique agencia, área, cargo y fecha de vigencia')
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
        effective_to: ubicacionForm.value.effective_to.trim() || undefined,
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

function assignmentVigenciaLabel(iso: string | null | undefined): string {
  if (iso == null || iso === '') {
    return '—'
  }

  return String(iso).slice(0, 10)
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
            <Card>
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Información personal y contacto</CardTitle>
                <CardDescription v-if="!readOnly" class="leading-relaxed">
                  Mantenga coherentes nombre y datos de contacto con los registros institucionales.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-8">
                <section class="space-y-4">
                  <p class="text-sm font-medium text-foreground">
                    Identificación
                  </p>
                  <div class="flex flex-wrap gap-x-8 gap-y-5">
                    <div class="staff-field-doc-type space-y-2">
                      <Label for="doc_type_p" class="leading-snug">Tipo de documento</Label>
                      <p v-if="readOnly" class="text-sm leading-relaxed">
                        {{ documentTypeLabel(datosForm.document_type) }}
                      </p>
                      <Multiselect
                        v-else
                        id="doc_type_p"
                        v-model="datosForm.document_type"
                        mode="single"
                        :object="false"
                        :options="documentTypeOptions"
                        value-prop="value"
                        label="label"
                        :searchable="true"
                        :can-clear="false"
                        placeholder="Seleccione…"
                        no-options-text="Sin opciones"
                        no-results-text="Sin coincidencias"
                        class="multiselect-roles"
                      />
                    </div>
                    <div class="staff-field-doc space-y-2">
                      <Label for="doc_p" class="leading-snug">Número de documento</Label>
                      <Input
                        id="doc_p"
                        v-model="datosForm.document_number"
                        inputmode="numeric"
                        :readonly="readOnly"
                      />
                    </div>
                  </div>
                </section>

                <Separator v-if="!readOnly || datosForm.document_number" />

                <section class="space-y-4">
                  <p class="text-sm font-medium text-foreground">
                    Nombres y apellidos
                  </p>
                  <div class="flex flex-wrap gap-x-8 gap-y-5">
                    <div class="staff-field space-y-2">
                      <Label for="fn_p" class="leading-snug">Primer nombre <span v-if="!readOnly">*</span></Label>
                      <Input id="fn_p" v-model="datosForm.first_name" :readonly="readOnly" :required="!readOnly" />
                    </div>
                    <div class="staff-field space-y-2">
                      <Label for="sn_p" class="leading-snug">Segundo nombre</Label>
                      <Input id="sn_p" v-model="datosForm.second_name" :readonly="readOnly" />
                    </div>
                    <div class="staff-field space-y-2">
                      <Label for="fl_p" class="leading-snug">Primer apellido <span v-if="!readOnly">*</span></Label>
                      <Input id="fl_p" v-model="datosForm.first_last_name" :readonly="readOnly" :required="!readOnly" />
                    </div>
                    <div class="staff-field space-y-2">
                      <Label for="sl_p" class="leading-snug">Segundo apellido</Label>
                      <Input id="sl_p" v-model="datosForm.second_last_name" :readonly="readOnly" />
                    </div>
                  </div>
                </section>

                <Separator />

                <section class="space-y-4">
                  <p class="text-sm font-medium text-foreground">
                    Contacto
                  </p>
                  <div class="flex flex-wrap gap-x-8 gap-y-5">
                    <div class="staff-field-email space-y-2">
                      <Label for="em_p" class="leading-snug">Correo</Label>
                      <Input id="em_p" v-model="datosForm.email" type="email" :readonly="readOnly" />
                    </div>
                    <div class="staff-field-phone space-y-2">
                      <Label for="ph_p" class="leading-snug">Teléfono</Label>
                      <Input id="ph_p" v-model="datosForm.phone" type="tel" :readonly="readOnly" />
                    </div>
                    <div class="staff-field-extension space-y-2">
                      <Label for="ex_p" class="leading-snug">Extensión</Label>
                      <Input id="ex_p" v-model="datosForm.extension" :readonly="readOnly" />
                    </div>
                  </div>
                </section>

                <template v-if="hasPermission('usuarios_ver') && !readOnly">
                  <Separator />
                  <section class="space-y-4">
                    <div class="space-y-1">
                      <p class="text-sm font-medium text-foreground">
                        Vínculo con usuario del sistema
                      </p>
                      <p class="text-sm text-muted-foreground leading-relaxed">
                        Opcional: asocie una cuenta existente sin funcionario vinculado o cree una nueva.
                      </p>
                    </div>
                    <div class="space-y-2">
                      <Label for="usr_panel" class="leading-snug">Usuario</Label>
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div class="staff-field-user min-w-0">
                          <Multiselect
                            id="usr_panel"
                            v-model="datosForm.user_id"
                            mode="single"
                            :object="false"
                            :options="userSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="true"
                            placeholder="Sin vínculo — busque usuario…"
                            no-options-text="No hay usuarios sin funcionario vinculado"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>
                        <PermissionGate permission="usuarios_crear">
                          <Button
                            type="button"
                            variant="outline"
                            class="shrink-0"
                            @click="saveDraftAndGoCreateUser"
                          >
                            <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                            Crear usuario
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </section>
                </template>

                <template v-else-if="readOnly">
                  <Separator />
                  <section class="space-y-4">
                    <p class="text-sm font-medium text-foreground">
                      Usuario del sistema
                    </p>
                    <p v-if="summary?.user?.email" class="text-sm leading-relaxed text-foreground">
                      {{ summary.user.email }}
                    </p>
                    <p v-else class="text-sm text-muted-foreground leading-relaxed">
                      Sin vínculo con cuenta de usuario.
                    </p>
                  </section>
                </template>

                <p
                  v-else-if="!readOnly"
                  class="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground leading-relaxed"
                >
                  No tiene permiso para listar usuarios; puede guardar el funcionario sin vínculo y asociarlo después, si corresponde.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">Estado del registro</CardTitle>
                <CardDescription v-if="!readOnly" class="leading-relaxed">
                  Use el interruptor para activar o inactivar el registro; al editar se muestra el estado guardado.
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
              <p>
                <span class="font-medium text-foreground">Vigencia de la asignación:</span>
                desde {{ assignmentVigenciaLabel(summary.current_assignment.effective_from) }}
                <template v-if="summary.current_assignment.effective_to">
                  · hasta {{ assignmentVigenciaLabel(summary.current_assignment.effective_to) }}
                </template>
                <template v-else>
                  · en curso
                </template>
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
                  <CardContent class="space-y-8">
                    <div class="space-y-4">
                      <p class="text-sm font-medium text-foreground leading-snug">
                        Ubicación organizacional
                      </p>
                      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                        <div class="space-y-3">
                          <Label for="of_p" class="leading-snug">Agencia principal *</Label>
                          <Multiselect
                            id="of_p"
                            v-model="ubicacionForm.org_office_id"
                            mode="single"
                            :object="false"
                            :options="officeSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="false"
                            placeholder="Seleccione…"
                            no-options-text="No hay agencias configuradas"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>

                        <div class="space-y-3">
                          <Label for="un_p" class="leading-snug">Área principal *</Label>
                          <Multiselect
                            id="un_p"
                            v-model="ubicacionForm.org_unit_id"
                            mode="single"
                            :object="false"
                            :options="unitSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="false"
                            :disabled="!ubicacionForm.org_office_id"
                            placeholder="Seleccione área…"
                            no-options-text="No hay áreas en esta agencia"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>

                        <div class="space-y-3 md:col-span-2 xl:col-span-1">
                          <Label for="pos_p" class="leading-snug">Cargo principal *</Label>
                          <Multiselect
                            id="pos_p"
                            v-model="ubicacionForm.org_position_id"
                            mode="single"
                            :object="false"
                            :options="positionSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="false"
                            :disabled="!ubicacionForm.org_unit_id"
                            placeholder="Seleccione cargo…"
                            no-options-text="No hay cargos en esta área"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-4 rounded-lg border p-4 md:p-5">
                      <div class="space-y-1">
                        <Label for="sup_p" class="leading-snug">Jefe inmediato (opcional)</Label>
                        <p class="text-xs text-muted-foreground leading-relaxed">
                          Seleccione primero el área y el cargo del jefe; luego el funcionario.
                        </p>
                      </div>
                      <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-x-6">
                        <div class="space-y-2">
                          <Label class="text-xs text-muted-foreground">Área del jefe</Label>
                          <Multiselect
                            v-model="supervisorOrgUnitId"
                            mode="single"
                            :object="false"
                            :options="supervisorUnitSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="true"
                            placeholder="Sin jefe inmediato…"
                            no-options-text="No hay áreas disponibles"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>

                        <div class="space-y-2">
                          <Label class="text-xs text-muted-foreground">Cargo del jefe</Label>
                          <Multiselect
                            v-model="supervisorOrgPositionId"
                            mode="single"
                            :object="false"
                            :options="supervisorPositionSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="true"
                            :disabled="!supervisorOrgUnitId"
                            placeholder="Seleccione cargo…"
                            no-options-text="No hay cargos en esta área"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>

                        <div class="space-y-2">
                          <Label class="text-xs text-muted-foreground">Funcionario</Label>
                          <Multiselect
                            id="sup_p"
                            v-model="ubicacionForm.immediate_supervisor_staff_id"
                            mode="single"
                            :object="false"
                            :options="supervisorStaffSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="true"
                            :disabled="!supervisorOrgPositionId"
                            placeholder="Seleccione funcionario…"
                            no-options-text="No hay funcionarios en este cargo"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-4">
                      <p class="text-sm font-medium text-foreground leading-snug">
                        Vigencia y detalle del movimiento
                      </p>
                      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                        <div class="space-y-3">
                          <Label for="eff_p" class="leading-snug">Vigencia desde *</Label>
                          <Input id="eff_p" v-model="ubicacionForm.effective_from" type="date" required />
                        </div>
                        <div class="space-y-3">
                          <Label for="eff_to_p" class="leading-snug">Vigente hasta (opcional)</Label>
                          <Input id="eff_to_p" v-model="ubicacionForm.effective_to" type="date" />
                          <p class="text-xs text-muted-foreground leading-relaxed">
                            Vacío = tramo abierto hasta un nuevo movimiento.
                          </p>
                        </div>
                        <div class="space-y-3 md:col-span-2 xl:col-span-1">
                          <Label for="ck_p" class="leading-snug">Tipo de movimiento</Label>
                          <Multiselect
                            id="ck_p"
                            v-model="ubicacionForm.change_kind"
                            mode="single"
                            :object="false"
                            :options="changeKindSelectOptions"
                            value-prop="value"
                            label="label"
                            :searchable="true"
                            :can-clear="false"
                            placeholder="Seleccione…"
                            no-options-text="Sin opciones"
                            no-results-text="Sin coincidencias"
                            class="multiselect-roles"
                          />
                        </div>

                        <div class="space-y-3 md:col-span-2 xl:col-span-3">
                          <Label for="nts_p" class="leading-snug">Notas</Label>
                          <Textarea id="nts_p" v-model="ubicacionForm.notes" rows="3" placeholder="Opcional…" class="resize-y min-h-[4.5rem]" />
                        </div>
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

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.staff-field {
  width: 100%;
  max-width: 13rem;
}

.staff-field-email {
  width: 100%;
  max-width: 18rem;
}

.staff-field-phone {
  width: 100%;
  max-width: 11rem;
}

.staff-field-extension {
  width: 100%;
  max-width: 6.5rem;
}

.staff-field-doc-type {
  width: 100%;
  max-width: 14rem;
}

.staff-field-doc {
  width: 100%;
  max-width: 11rem;
}

.staff-field-user {
  width: 100%;
  max-width: 18rem;
}

.multiselect-roles {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  --ms-dropdown-radius: 0.375rem;
  min-height: 2.25rem;
  width: 100%;
  min-width: 0;
}
</style>
