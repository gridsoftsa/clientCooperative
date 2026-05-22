<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ORG_WORK_GROUP_MEMBER_KIND_LABELS, ORG_WORK_GROUP_OFFICE_ROLE_LABELS } from '~/constants/org-work-groups'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import type { WorkGroupMemberSelection } from '~/utils/work-group-members'
import type { WorkGroupOfficerRow } from '~/utils/work-group-officers'

const selection = defineModel<WorkGroupMemberSelection>({ required: true })
const officersModel = defineModel<WorkGroupOfficerRow[]>('officers', { default: () => [] })

const props = withDefaults(defineProps<{
  staffOptions?: Array<{ value: number; label: string }>
  positionOptions?: Array<{ value: number; label: string }>
  unitOptions?: Array<{ value: number; label: string }>
  /** Al editar: prellenar áreas del acote «Funcionarios» (miembros), no la directiva. */
  initialStaffUnitIds?: number[]
  loading?: boolean
}>(), {
  staffOptions: () => [],
  positionOptions: () => [],
  unitOptions: () => [],
  initialStaffUnitIds: undefined,
  loading: false,
})

const orgApi = useOrgStructureApi()

const staffOpts = ref(props.staffOptions)
const positionOpts = ref(props.positionOptions)
const unitOpts = ref(props.unitOptions)

const allPositions = ref<OrgPositionRow[]>([])
const positionFilterUnitIds = ref<number[]>([])

/** Áreas elegidas: tab «Funcionarios» de miembros y directiva (asignación vigente en alguna de esas áreas). */
const staffUnitScopeIds = ref<number[]>([])
const scopedStaffList = ref<OrgStaffListItem[]>([])
const loadingScopedStaff = ref(false)

const didApplyInitialStaffUnits = ref(false)
watch(() => props.initialStaffUnitIds, (v) => {
  if (didApplyInitialStaffUnits.value) {
    return
  }
  if (v != null && v.length > 0) {
    staffUnitScopeIds.value = [...v]
    didApplyInitialStaffUnits.value = true
  }
}, { immediate: true })

const presidentStaffId = ref<number | null>(null)
const secretaryStaffId = ref<number | null>(null)
const presidentDelegateIds = ref<number[]>([])
const secretaryDelegateIds = ref<number[]>([])

let syncingFromOfficersModel = false

function numberArraysShallowEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((v, i) => v === b[i])
}

function assignNumberArrayIfChanged(target: Ref<number[]>, next: number[]): void {
  if (!numberArraysShallowEqual(target.value, next)) {
    target.value = next
  }
}

function staffLabel(s: OrgStaffListItem): string {
  return [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
    + (s.document_number ? ` · ${s.document_number}` : '')
}

function staffOptionLabel(s: OrgStaffListItem): string {
  const name = staffLabel(s)
  const a = s.current_assignment
  if (!a) {
    return name
  }
  const off = a.org_office?.code ? `${a.org_office.code} · ` : ''
  const unit = a.org_unit
  const unitStr = unit ? `${off}${unit.code} — ${unit.name}` : ''
  const pos = a.org_position
  const posStr = pos?.name ? `${pos.code ? `${pos.code} · ` : ''}${pos.name}` : ''
  const tail = [unitStr, posStr].filter(Boolean).join(' · ')
  if (!tail) {
    return name
  }
  return `${name} · ${tail}`
}

function positionLabel(p: OrgPositionRow): string {
  const unit = p.org_unit?.code ? `${p.org_unit.code} · ` : ''
  return `${unit}${p.code} — ${p.name}`
}

function unitLabel(u: OrgUnitRow): string {
  const off = u.org_office?.code ? `${u.org_office.code} · ` : ''
  return `${off}${u.code} — ${u.name}`
}

const scopedStaffAsOptions = computed(() =>
  scopedStaffList.value.map(s => ({ value: s.id, label: staffOptionLabel(s) })),
)

/** Misma base que miembros por persona: asignación vigente en alguna de las áreas elegidas arriba. */
const presidentOptions = computed(() => {
  const exclude = new Set<number>()
  if (secretaryStaffId.value != null) {
    exclude.add(secretaryStaffId.value)
  }
  presidentDelegateIds.value.forEach(id => exclude.add(id))
  secretaryDelegateIds.value.forEach(id => exclude.add(id))
  const keep = new Set<number>()
  if (presidentStaffId.value != null) {
    keep.add(presidentStaffId.value)
  }
  return scopedStaffList.value
    .filter(s => !exclude.has(s.id) || keep.has(s.id))
    .map(s => ({ value: s.id, label: staffOptionLabel(s) }))
})

const secretaryOptions = computed(() => {
  const exclude = new Set<number>()
  if (presidentStaffId.value != null) {
    exclude.add(presidentStaffId.value)
  }
  presidentDelegateIds.value.forEach(id => exclude.add(id))
  secretaryDelegateIds.value.forEach(id => exclude.add(id))
  const keep = new Set<number>()
  if (secretaryStaffId.value != null) {
    keep.add(secretaryStaffId.value)
  }
  return scopedStaffList.value
    .filter(s => !exclude.has(s.id) || keep.has(s.id))
    .map(s => ({ value: s.id, label: staffOptionLabel(s) }))
})

const presidentDelegateOptions = computed(() => {
  const exclude = new Set<number>()
  if (presidentStaffId.value != null) {
    exclude.add(presidentStaffId.value)
  }
  if (secretaryStaffId.value != null) {
    exclude.add(secretaryStaffId.value)
  }
  secretaryDelegateIds.value.forEach(id => exclude.add(id))
  const keep = new Set(presidentDelegateIds.value)
  return scopedStaffList.value
    .filter(s => !exclude.has(s.id) || keep.has(s.id))
    .map(s => ({ value: s.id, label: staffOptionLabel(s) }))
})

const secretaryDelegateOptions = computed(() => {
  const exclude = new Set<number>()
  if (presidentStaffId.value != null) {
    exclude.add(presidentStaffId.value)
  }
  if (secretaryStaffId.value != null) {
    exclude.add(secretaryStaffId.value)
  }
  presidentDelegateIds.value.forEach(id => exclude.add(id))
  const keep = new Set(secretaryDelegateIds.value)
  return scopedStaffList.value
    .filter(s => !exclude.has(s.id) || keep.has(s.id))
    .map(s => ({ value: s.id, label: staffOptionLabel(s) }))
})

const filteredPositionOptions = computed(() => {
  if (allPositions.value.length === 0) {
    return positionOpts.value
  }
  if (positionFilterUnitIds.value.length === 0) {
    return allPositions.value.map(p => ({ value: p.id, label: positionLabel(p) }))
  }
  const set = new Set(positionFilterUnitIds.value)
  return allPositions.value
    .filter(p => set.has(p.org_unit_id))
    .map(p => ({ value: p.id, label: positionLabel(p) }))
})

function prunePositionSelection(): void {
  if (allPositions.value.length === 0) {
    return
  }
  const allowed = new Set(filteredPositionOptions.value.map(o => o.value))
  selection.value.positionIds = selection.value.positionIds.filter(id => allowed.has(id))
}

watch(positionFilterUnitIds, () => {
  prunePositionSelection()
}, { deep: true })

function rebuildOfficersModel(): void {
  if (syncingFromOfficersModel) {
    return
  }
  const rows: WorkGroupOfficerRow[] = []
  if (presidentStaffId.value != null) {
    rows.push({ office_role: 'president', org_staff_id: presidentStaffId.value, sort_order: 0 })
  }
  if (secretaryStaffId.value != null) {
    rows.push({ office_role: 'secretary', org_staff_id: secretaryStaffId.value, sort_order: 0 })
  }
  presidentDelegateIds.value.forEach((id, i) => {
    rows.push({ office_role: 'president_delegate', org_staff_id: id, sort_order: i })
  })
  secretaryDelegateIds.value.forEach((id, i) => {
    rows.push({ office_role: 'secretary_delegate', org_staff_id: id, sort_order: i })
  })
  const prev = JSON.stringify(officersModel.value)
  const next = JSON.stringify(rows)
  if (prev === next) {
    return
  }
  officersModel.value = rows
}

function resolveOfficerRoleConflicts(): void {
  const p = presidentStaffId.value
  const s = secretaryStaffId.value
  if (p != null && s === p) {
    secretaryStaffId.value = null
  }
  let pDel = [...presidentDelegateIds.value]
  let sDel = [...secretaryDelegateIds.value]
  if (p != null) {
    pDel = pDel.filter(id => id !== p)
    sDel = sDel.filter(id => id !== p)
  }
  if (s != null) {
    pDel = pDel.filter(id => id !== s)
    sDel = sDel.filter(id => id !== s)
  }
  const pDelSet = new Set(pDel)
  sDel = sDel.filter(id => !pDelSet.has(id))
  const sDelSet = new Set(sDel)
  pDel = pDel.filter(id => !sDelSet.has(id))
  assignNumberArrayIfChanged(presidentDelegateIds, pDel)
  assignNumberArrayIfChanged(secretaryDelegateIds, sDel)
}

watch([presidentStaffId, secretaryStaffId, presidentDelegateIds, secretaryDelegateIds], () => {
  if (syncingFromOfficersModel) {
    return
  }
  resolveOfficerRoleConflicts()
  rebuildOfficersModel()
}, { deep: true })

function hydrateOfficersFromModel(rows: WorkGroupOfficerRow[]): void {
  syncingFromOfficersModel = true
  try {
    presidentStaffId.value = null
    secretaryStaffId.value = null
    assignNumberArrayIfChanged(presidentDelegateIds, [])
    assignNumberArrayIfChanged(secretaryDelegateIds, [])
    const pDel: Array<{ id: number; o: number }> = []
    const sDel: Array<{ id: number; o: number }> = []
    for (const r of rows) {
      if (r.office_role === 'president') {
        presidentStaffId.value = r.org_staff_id
      } else if (r.office_role === 'secretary') {
        secretaryStaffId.value = r.org_staff_id
      } else if (r.office_role === 'president_delegate') {
        pDel.push({ id: r.org_staff_id, o: r.sort_order })
      } else if (r.office_role === 'secretary_delegate') {
        sDel.push({ id: r.org_staff_id, o: r.sort_order })
      }
    }
    pDel.sort((a, b) => a.o - b.o)
    sDel.sort((a, b) => a.o - b.o)
    assignNumberArrayIfChanged(presidentDelegateIds, pDel.map(x => x.id))
    assignNumberArrayIfChanged(secretaryDelegateIds, sDel.map(x => x.id))
  } finally {
    nextTick(() => {
      syncingFromOfficersModel = false
    })
  }
}

watch(officersModel, (v) => {
  hydrateOfficersFromModel(v ?? [])
}, { deep: true, immediate: true })

watch(staffUnitScopeIds, async (ids) => {
  if (ids.length === 0) {
    scopedStaffList.value = []
    selection.value.staffIds = []
    presidentStaffId.value = null
    secretaryStaffId.value = null
    assignNumberArrayIfChanged(presidentDelegateIds, [])
    assignNumberArrayIfChanged(secretaryDelegateIds, [])
    rebuildOfficersModel()
    return
  }
  loadingScopedStaff.value = true
  try {
    scopedStaffList.value = await orgApi.fetchStaff({ activeOnly: true, orgUnitIds: ids })
    const allowed = new Set(scopedStaffList.value.map(s => s.id))
    selection.value.staffIds = selection.value.staffIds.filter(id => allowed.has(id))
    if (presidentStaffId.value != null && !allowed.has(presidentStaffId.value)) {
      presidentStaffId.value = null
    }
    if (secretaryStaffId.value != null && !allowed.has(secretaryStaffId.value)) {
      secretaryStaffId.value = null
    }
    assignNumberArrayIfChanged(
      presidentDelegateIds,
      presidentDelegateIds.value.filter(id => allowed.has(id)),
    )
    assignNumberArrayIfChanged(
      secretaryDelegateIds,
      secretaryDelegateIds.value.filter(id => allowed.has(id)),
    )
    resolveOfficerRoleConflicts()
    rebuildOfficersModel()
  } catch {
    scopedStaffList.value = []
  } finally {
    loadingScopedStaff.value = false
  }
}, { deep: true })

const internalLoading = ref(false)
const loadError = ref(false)

onMounted(async () => {
  if (props.staffOptions.length > 0 && props.positionOptions.length > 0 && props.unitOptions.length > 0) {
    return
  }
  internalLoading.value = true
  loadError.value = false
  try {
    const [positions, units] = await Promise.all([
      orgApi.fetchPositions({ activeOnly: true }),
      orgApi.fetchUnits({ activeOnly: true }),
    ])
    allPositions.value = positions
    if (positionOpts.value.length === 0) {
      positionOpts.value = positions.map((p: OrgPositionRow) => ({ value: p.id, label: positionLabel(p) }))
    }
    if (unitOpts.value.length === 0) {
      unitOpts.value = units.map((u: OrgUnitRow) => ({ value: u.id, label: unitLabel(u) }))
    }
    if (staffOpts.value.length === 0) {
      staffOpts.value = []
    }
  } catch {
    loadError.value = true
  } finally {
    internalLoading.value = false
  }
})

const totalCount = computed(() =>
  selection.value.staffIds.length + selection.value.positionIds.length + selection.value.unitIds.length,
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Miembros del grupo (transversal)</CardTitle>
        <CardDescription class="space-y-2 leading-relaxed">
          <p>
            Tres formas de incluir gente: <strong>persona concreta</strong>, <strong>un cargo en un área concreta</strong>
            (en el catálogo cada cargo ya está bajo un área) o <strong>toda un área</strong>.
          </p>
          <ul class="list-disc pl-4 text-sm text-muted-foreground space-y-1">
            <li>{{ ORG_WORK_GROUP_MEMBER_KIND_LABELS.staff }}.</li>
            <li>{{ ORG_WORK_GROUP_MEMBER_KIND_LABELS.position }}.</li>
            <li>{{ ORG_WORK_GROUP_MEMBER_KIND_LABELS.unit }}.</li>
          </ul>
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <Label class="text-sm font-medium">Área(s) para listar funcionarios como miembros *</Label>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Solo aplica al tab <strong>Funcionarios</strong> y a la <strong>directiva</strong>: personas con asignación principal vigente en alguna de las áreas elegidas.
            Un mismo funcionario no puede figurar en dos cargos de la directiva (presidente, secretario(a), delegados).
          </p>
          <Multiselect
            v-model="staffUnitScopeIds"
            mode="tags"
            :options="unitOpts"
            value-prop="value"
            label="label"
            :close-on-select="false"
            :searchable="true"
            placeholder="Seleccione una o varias áreas…"
            class="wg-members-ms"
          />
        </div>

        <div v-if="loading || internalLoading" class="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Icon name="i-lucide-loader-2" class="h-5 w-5 animate-spin shrink-0" />
          Cargando catálogos…
        </div>
        <p v-else-if="loadError" class="text-sm text-destructive">
          No se pudieron cargar cargos o áreas. Intente de nuevo más tarde.
        </p>
        <template v-else>
          <Tabs default-value="staff" class="w-full">
            <TabsList class="flex w-full flex-wrap h-auto gap-1 py-1">
              <TabsTrigger value="staff" class="flex-1 min-w-[8rem]">
                Funcionarios
                <span v-if="selection.staffIds.length" class="ml-1 rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
                  {{ selection.staffIds.length }}
                </span>
              </TabsTrigger>
              <TabsTrigger value="positions" class="flex-1 min-w-[8rem]">
                Cargos
                <span v-if="selection.positionIds.length" class="ml-1 rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
                  {{ selection.positionIds.length }}
                </span>
              </TabsTrigger>
              <TabsTrigger value="units" class="flex-1 min-w-[8rem]">
                Áreas
                <span v-if="selection.unitIds.length" class="ml-1 rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
                  {{ selection.unitIds.length }}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="staff" class="mt-4 space-y-3">
              <p v-if="staffUnitScopeIds.length === 0" class="text-sm text-muted-foreground">
                Seleccione al menos un área arriba para habilitar la lista de funcionarios.
              </p>
              <template v-else>
                <p v-if="loadingScopedStaff" class="text-sm text-muted-foreground flex items-center gap-2">
                  <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
                  Cargando funcionarios…
                </p>
                <div v-else class="space-y-2">
                  <Label class="text-muted-foreground text-xs">Funcionarios (nombre · sede/área · cargo actual)</Label>
                  <Multiselect
                    v-model="selection.staffIds"
                    mode="tags"
                    :options="scopedStaffAsOptions"
                    value-prop="value"
                    label="label"
                    :close-on-select="false"
                    :searchable="true"
                    placeholder="Buscar…"
                    class="wg-members-ms"
                  />
                </div>
              </template>
            </TabsContent>
            <TabsContent value="positions" class="mt-4 space-y-3">
              <p class="text-xs text-muted-foreground leading-relaxed">
                Cada cargo del listado ya incluye su área. Opcionalmente acote por áreas.
              </p>
              <div v-if="allPositions.length > 0" class="space-y-2">
                <Label class="text-muted-foreground text-xs">Mostrar solo cargos de estas áreas (opcional)</Label>
                <Multiselect
                  v-model="positionFilterUnitIds"
                  mode="tags"
                  :options="unitOpts"
                  value-prop="value"
                  label="label"
                  :close-on-select="false"
                  :searchable="true"
                  placeholder="Áreas para filtrar cargos…"
                  class="wg-members-ms"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-muted-foreground text-xs">Cargos</Label>
                <Multiselect
                  v-model="selection.positionIds"
                  mode="tags"
                  :options="filteredPositionOptions"
                  value-prop="value"
                  label="label"
                  :close-on-select="false"
                  :searchable="true"
                  placeholder="Código o nombre de cargo…"
                  class="wg-members-ms"
                />
              </div>
            </TabsContent>
            <TabsContent value="units" class="mt-4 space-y-2">
              <Label class="text-muted-foreground text-xs">Áreas / dependencias (todos los asignados)</Label>
              <Multiselect
                v-model="selection.unitIds"
                mode="tags"
                :options="unitOpts"
                value-prop="value"
                label="label"
                :close-on-select="false"
                :searchable="true"
                placeholder="Código o nombre de área…"
                class="wg-members-ms"
              />
            </TabsContent>
          </Tabs>

          <div v-if="totalCount > 0" class="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <span class="font-medium text-foreground">Resumen miembros:</span>
            {{ selection.staffIds.length }} funcionario(s),
            {{ selection.positionIds.length }} cargo(s),
            {{ selection.unitIds.length }} área(s)
            ({{ totalCount }} referencia(s) en total).
          </div>
        </template>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Directiva del comité</CardTitle>
        <CardDescription class="text-sm leading-relaxed">
          Presidente y secretario(a) (uno cada uno); delegados opcionales. El listado es el mismo que en el tab Funcionarios (áreas seleccionadas arriba).
          No puede repetirse la misma persona en otro cargo de la directiva; si hay conflicto, se limpia el cargo que choque.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6 max-w-2xl">
        <template v-if="staffUnitScopeIds.length === 0">
          <p class="text-sm text-muted-foreground">
            Seleccione al menos un área en «Área(s) para listar funcionarios como miembros» para habilitar presidente, secretario(a) y delegados.
          </p>
        </template>
        <template v-else-if="loadingScopedStaff">
          <p class="text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            Cargando personal para la directiva…
          </p>
        </template>
        <template v-else-if="scopedStaffList.length === 0">
          <p class="text-sm text-muted-foreground">
            No hay funcionarios con asignación vigente en las áreas elegidas.
          </p>
        </template>
        <template v-else>
          <div class="space-y-2">
            <Label>{{ ORG_WORK_GROUP_OFFICE_ROLE_LABELS.president }}</Label>
            <Multiselect
              v-model="presidentStaffId"
              :options="presidentOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              placeholder="Seleccione…"
              class="wg-members-ms"
            />
          </div>
          <div class="space-y-2">
            <Label>{{ ORG_WORK_GROUP_OFFICE_ROLE_LABELS.secretary }}</Label>
            <Multiselect
              v-model="secretaryStaffId"
              :options="secretaryOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              placeholder="Seleccione…"
              class="wg-members-ms"
            />
          </div>
          <div class="space-y-2">
            <Label>{{ ORG_WORK_GROUP_OFFICE_ROLE_LABELS.president_delegate }}</Label>
            <Multiselect
              v-model="presidentDelegateIds"
              mode="tags"
              :options="presidentDelegateOptions"
              value-prop="value"
              label="label"
              :close-on-select="false"
              :searchable="true"
              placeholder="Uno o varios suplentes…"
              class="wg-members-ms"
            />
          </div>
          <div class="space-y-2">
            <Label>{{ ORG_WORK_GROUP_OFFICE_ROLE_LABELS.secretary_delegate }}</Label>
            <Multiselect
              v-model="secretaryDelegateIds"
              mode="tags"
              :options="secretaryDelegateOptions"
              value-prop="value"
              label="label"
              :close-on-select="false"
              :searchable="true"
              placeholder="Uno o varios suplentes…"
              class="wg-members-ms"
            />
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.wg-members-ms :deep(.multiselect) {
  min-height: 2.75rem;
}
</style>
