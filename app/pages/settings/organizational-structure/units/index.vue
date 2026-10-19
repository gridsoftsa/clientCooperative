<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const units = ref<OrgUnitRow[]>([])
const offices = ref<Array<{ id: number; name: string; code: string }>>([])
const parentCandidates = ref<OrgUnitRow[]>([])
const loading = ref(false)
const filterQuery = ref('')
const filterOfficeId = ref<number | null>(null)
const filterStatus = ref<'all' | 'active' | 'inactive'>('all')
const filterProducer = ref<'all' | 'yes' | 'no'>('all')
const filterHierarchy = ref<'all' | 'roots' | number>('all')
const deactivatingId = ref<number | null>(null)
const activatingId = ref<number | null>(null)
const expandedUnitId = ref<number | null>(null)
const unitPositions = ref<Record<number, OrgPositionRow[]>>({})
const loadingPositionsFor = ref<number | null>(null)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const officeFilterOptions = computed(() => [
  { value: 'all', label: 'Todas las agencias' },
  ...offices.value.map(o => ({ value: String(o.id), label: o.name })),
])

const statusFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
]

const producerFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'yes', label: 'Sí — productora TRD' },
  { value: 'no', label: 'No' },
]

const hierarchyFilterOptions = computed(() => [
  { value: 'all', label: 'Todas' },
  { value: 'roots', label: 'Solo raíz (sin padre)' },
  ...parentCandidates.value.map(u => ({
    value: String(u.id),
    label: `Hijas de ${u.name}`,
  })),
])

const hasActiveFilters = computed(() =>
  filterQuery.value.trim() !== ''
  || filterOfficeId.value != null
  || filterStatus.value !== 'all'
  || filterProducer.value !== 'all'
  || filterHierarchy.value !== 'all',
)

const officeFilterModel = computed({
  get: () => (filterOfficeId.value == null ? 'all' : String(filterOfficeId.value)),
  set: (value: string | number | null) => {
    filterOfficeId.value = value === 'all' || value == null || value === '' ? null : Number(value)
  },
})

const hierarchyFilterModel = computed({
  get: () => (filterHierarchy.value === 'all' || filterHierarchy.value === 'roots'
    ? filterHierarchy.value
    : String(filterHierarchy.value)),
  set: (value: string | number | null) => {
    if (value === 'all' || value === 'roots' || value == null || value === '') {
      filterHierarchy.value = value === 'roots' ? 'roots' : 'all'
      return
    }
    filterHierarchy.value = Number(value)
  },
})

async function loadOffices() {
  try {
    offices.value = await orgApi.fetchOffices()
  } catch {
    offices.value = []
  }
}

async function fetchParentCandidates() {
  try {
    parentCandidates.value = await orgApi.fetchUnits({
      activeOnly: false,
      orgOfficeId: filterOfficeId.value ?? undefined,
    })
  }
  catch {
    parentCandidates.value = []
  }
}

async function fetchUnits() {
  loading.value = true
  try {
    const q: Record<string, string | number | boolean> = {
      per_page: pagination.value.per_page,
      page: pagination.value.current_page,
    }
    const search = filterQuery.value.trim()
    if (search)
      q.q = search
    if (filterOfficeId.value != null)
      q.org_office_id = filterOfficeId.value
    if (filterStatus.value === 'active')
      q.is_active = 1
    if (filterStatus.value === 'inactive')
      q.is_active = 0
    if (filterProducer.value === 'yes')
      q.is_document_producer = 1
    if (filterProducer.value === 'no')
      q.is_document_producer = 0
    if (filterHierarchy.value === 'roots')
      q.roots_only = 1
    else if (typeof filterHierarchy.value === 'number')
      q.parent_id = filterHierarchy.value
    const res = await $api<{
      data: OrgUnitRow[]
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/organizational-structure/org-units', { query: q })
    units.value = res.data
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
    }
  } catch {
    toast.error('Error al cargar áreas')
    units.value = []
    pagination.value = { ...pagination.value, current_page: 1, last_page: 1, total: 0 }
  } finally {
    loading.value = false
  }
}

function resetToFirstPageAndFetch() {
  pagination.value.current_page = 1
  void fetchUnits()
}

function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), Math.max(1, pagination.value.last_page))
  if (nextPage === pagination.value.current_page) {
    return
  }
  pagination.value.current_page = nextPage
  void fetchUnits()
}

function changePerPage(size: number) {
  pagination.value.per_page = size
  pagination.value.current_page = 1
  void fetchUnits()
}

async function refreshUnitsKeepingPage() {
  await fetchUnits()
  if (units.value.length === 0 && pagination.value.current_page > 1) {
    pagination.value.current_page -= 1
    await fetchUnits()
  }
}

function clearFilters() {
  filterQuery.value = ''
  filterOfficeId.value = null
  filterStatus.value = 'all'
  filterProducer.value = 'all'
  filterHierarchy.value = 'all'
}

watch(filterQuery, () => {
  if (searchDebounce)
    clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    resetToFirstPageAndFetch()
  }, 400)
})

watch([filterOfficeId, filterStatus, filterProducer, filterHierarchy], () => {
  resetToFirstPageAndFetch()
})

watch(filterOfficeId, () => {
  if (typeof filterHierarchy.value === 'number')
    filterHierarchy.value = 'all'
  void fetchParentCandidates()
})

async function toggleUnitPositions(unitId: number) {
  if (expandedUnitId.value === unitId) {
    expandedUnitId.value = null
    return
  }
  expandedUnitId.value = unitId
  if (unitPositions.value[unitId])
    return
  loadingPositionsFor.value = unitId
  try {
    unitPositions.value = {
      ...unitPositions.value,
      [unitId]: await orgApi.fetchPositions({ orgUnitId: unitId }),
    }
  }
  catch {
    toast.error('No se pudieron cargar los cargos del área')
    expandedUnitId.value = null
  }
  finally {
    loadingPositionsFor.value = null
  }
}

function managerLabel(unit: OrgUnitRow): string {
  const manager = unit.manager_staff
  if (!manager) {
    return '—'
  }

  const name = [manager.first_name, manager.first_last_name].filter(Boolean).join(' ')

  return name || '—'
}

async function deactivateUnit(id: number) {
  if (!hasPermission('estructura_org_editar') || deactivatingId.value != null)
    return
  const confirmed = window.confirm(
    '¿Inactivar esta área? El código seguirá reservado: no podrá crear otra con el mismo código. Si más adelante la necesita, use Activar.',
  )
  if (!confirmed)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-units/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Área inactivada')
    await refreshUnitsKeepingPage()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo inactivar')
  } finally {
    deactivatingId.value = null
  }
}

async function activateUnit(id: number) {
  if (!hasPermission('estructura_org_editar') || activatingId.value != null)
    return
  activatingId.value = id
  try {
    await $api(`/organizational-structure/org-units/${id}/activate`, { method: 'PATCH' })
    toast.success('Área reactivada')
    await refreshUnitsKeepingPage()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo reactivar')
  } finally {
    activatingId.value = null
  }
}

onMounted(async () => {
  await loadOffices()
  await fetchParentCandidates()
  await fetchUnits()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Módulo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Áreas y dependencias
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button @click="router.push('/settings/organizational-structure/units/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva área
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de áreas
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Jerarquía por agencia, indicador TRD/producora documental y estado de cada dependencia.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div class="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
              <Label for="fsearch" class="text-xs text-muted-foreground">Buscar</Label>
              <Input
                id="fsearch"
                v-model="filterQuery"
                class="h-11"
                placeholder="Nombre o código…"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <Label for="foffice" class="text-xs text-muted-foreground">Agencia</Label>
              <ArchivalSingleMultiselect
                id="foffice"
                v-model="officeFilterModel"
                :can-clear="false"
                :options="officeFilterOptions"
                placeholder="Todas las agencias"
                no-options-text="No hay agencias"
                no-results-text="Sin coincidencias"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <Label for="fstatus" class="text-xs text-muted-foreground">Estado</Label>
              <ArchivalSingleMultiselect
                id="fstatus"
                v-model="filterStatus"
                :can-clear="false"
                :searchable="false"
                :options="statusFilterOptions"
                placeholder="Todas"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <Label for="fproducer" class="text-xs text-muted-foreground">Productora TRD</Label>
              <ArchivalSingleMultiselect
                id="fproducer"
                v-model="filterProducer"
                :can-clear="false"
                :searchable="false"
                :options="producerFilterOptions"
                placeholder="Todas"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <Label for="fhierarchy" class="text-xs text-muted-foreground">Jerarquía</Label>
              <ArchivalSingleMultiselect
                id="fhierarchy"
                v-model="hierarchyFilterModel"
                :can-clear="false"
                :options="hierarchyFilterOptions"
                placeholder="Todas"
                no-results-text="Sin coincidencias"
              />
            </div>
            <div class="flex items-end">
              <Button
                type="button"
                variant="outline"
                class="h-11 w-full"
                :disabled="!hasActiveFilters"
                @click="clearFilters"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="units.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            {{ hasActiveFilters ? 'Ningún área coincide con los filtros.' : 'No hay áreas. Cree antes al menos una agencia.' }}
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Padre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Productora doc.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="u in units" :key="u.id">
              <TableRow>
                <TableCell class="font-medium">
                  <div class="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-8 w-8 shrink-0 px-0"
                      :aria-expanded="expandedUnitId === u.id"
                      :aria-label="expandedUnitId === u.id ? 'Ocultar cargos' : 'Ver cargos relacionados'"
                      @click="toggleUnitPositions(u.id)"
                    >
                      <Icon
                        :name="expandedUnitId === u.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="h-4 w-4"
                      />
                    </Button>
                    <span>{{ u.name }}</span>
                    <Badge variant="outline" class="ml-1">
                      {{ u.org_positions_count ?? 0 }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{{ u.code }}</TableCell>
                <TableCell>{{ u.org_office?.name ?? '—' }}</TableCell>
                <TableCell>{{ u.parent?.name ?? '—' }}</TableCell>
                <TableCell>{{ managerLabel(u) }}</TableCell>
                <TableCell>
                  {{ u.is_document_producer ? 'Sí' : 'No' }}
                </TableCell>
                <TableCell>
                  <Badge :variant="u.is_active ? 'default' : 'secondary'">
                    {{ u.is_active ? 'Activa' : 'Inactiva' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex flex-wrap justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 gap-1.5 px-2 text-xs"
                      @click="router.push(`/settings/organizational-structure/units/${u.id}/positions`)"
                    >
                      <Icon name="i-lucide-briefcase" class="size-4 shrink-0" />
                      Cargos
                    </Button>
                    <PermissionGate permission="estructura_org_editar">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        @click="router.push(`/settings/organizational-structure/units/${u.id}/edit`)"
                      >
                        Editar
                      </Button>
                      <Button
                        v-if="u.is_active"
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        :disabled="deactivatingId === u.id"
                        @click="deactivateUnit(u.id)"
                      >
                        <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                        Desactivar
                      </Button>
                      <Button
                        v-else
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        :disabled="activatingId === u.id"
                        @click="activateUnit(u.id)"
                      >
                        <Icon name="i-lucide-check-circle" class="size-4 shrink-0" />
                        Activar
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="expandedUnitId === u.id" class="bg-muted/30 hover:bg-muted/30">
                <TableCell colspan="8" class="p-3">
                  <div v-if="loadingPositionsFor === u.id" class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
                    Cargando cargos…
                  </div>
                  <p v-else-if="(unitPositions[u.id] ?? []).length === 0" class="text-sm text-muted-foreground">
                    Esta área no tiene cargos.
                    <button
                      type="button"
                      class="ml-1 underline underline-offset-2"
                      @click="router.push(`/settings/organizational-structure/units/${u.id}/positions`)"
                    >
                      Crear el primero
                    </button>
                  </p>
                  <div v-else class="overflow-hidden rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Nivel</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="position in unitPositions[u.id]" :key="position.id">
                          <TableCell class="font-medium">
                            {{ position.name }}
                          </TableCell>
                          <TableCell class="font-mono">
                            {{ position.code }}
                          </TableCell>
                          <TableCell>{{ position.hierarchy_level }}</TableCell>
                          <TableCell>
                            <Badge :variant="position.is_active ? 'default' : 'secondary'">
                              {{ position.is_active ? 'Activo' : 'Inactivo' }}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TableCell>
              </TableRow>
              </template>
            </TableBody>
          </Table>
          </div>
          <ListPaginationBar
            v-if="pagination.total > 0"
            :page="pagination.current_page"
            :last-page="pagination.last_page"
            :per-page="pagination.per_page"
            :total="pagination.total"
            item-label="áreas"
            :loading="loading"
            @update:page="goToPage"
            @update:per-page="changePerPage"
          />
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
