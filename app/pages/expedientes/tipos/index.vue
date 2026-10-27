<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import type { ArchivalFileModel, ArchivalFileType } from '~/types/archival-file'
import { DEFAULT_LIST_PAGE_SIZE, LIST_PAGE_SIZE_OPTIONS } from '~/constants/list-pagination'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const FILTER_ALL = 'all'
const ORG_UNIT_NONE = 'none'
const PER_PAGE_OPTIONS = LIST_PAGE_SIZE_OPTIONS
const AREA_PREVIEW_LIMIT = 6

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const types = ref<ArchivalFileType[]>([])
const summaryTypes = ref<ArchivalFileType[]>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const loading = ref(true)
const togglingId = ref<number | null>(null)
const viewMode = ref<'table' | 'by_area'>('table')
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: DEFAULT_LIST_PAGE_SIZE })

const showPagination = computed(() => viewMode.value === 'table' && meta.value.total > 0)
const areaShowAll = ref<Record<string, boolean>>({})
const expandedTypeId = ref<number | null>(null)

const search = ref('')
const orgUnitFilter = ref<string>(FILTER_ALL)
const modelFilter = ref<ArchivalFileModel | typeof FILTER_ALL>(FILTER_ALL)
const statusFilter = ref<'active' | 'inactive' | typeof FILTER_ALL>(FILTER_ALL)
const systemFilter = ref<'system' | 'custom' | typeof FILTER_ALL>(FILTER_ALL)
const trdFilter = ref<'configured' | 'pending' | typeof FILTER_ALL>(FILTER_ALL)

const summary = computed(() => {
  const rows = summaryTypes.value

  return {
    total: rows.length,
    active: rows.filter(type => type.is_active).length,
    inactive: rows.filter(type => !type.is_active).length,
    orgArea: rows.filter(type => type.model === 'org_area').length,
    trdPending: rows.filter(type =>
      !(type.producer_areas ?? []).some(area => area.doc_series_id && area.doc_subseries_id)
      && (!type.doc_series_id || !type.doc_subseries_id)).length,
    withoutOrgUnit: rows.filter(type => !(type.producer_areas?.length)).length,
  }
})

const orgUnitPills = computed(() => {
  const counts = new Map<number, number>()
  let withoutArea = 0

  for (const type of summaryTypes.value) {
    const areas = type.producer_areas ?? []

    if (areas.length === 0) {
      withoutArea += 1
      continue
    }

    for (const area of areas) {
      if (area.org_unit_id) {
        counts.set(area.org_unit_id, (counts.get(area.org_unit_id) ?? 0) + 1)
      }
    }
  }

  const pills = orgUnits.value
    .filter(unit => counts.has(unit.id))
    .map(unit => ({
      id: String(unit.id),
      label: unit.name,
      count: counts.get(unit.id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))

  return { pills, withoutArea }
})

function typeHasTrdConfigured(type: ArchivalFileType): boolean {
  const areas = type.producer_areas ?? []

  if (areas.some(area => area.doc_series_id && area.doc_subseries_id)) {
    return true
  }

  return Boolean(type.doc_series_id && type.doc_subseries_id)
}

function matchesListFilters(type: ArchivalFileType): boolean {
  const term = search.value.trim().toLowerCase()

  if (term) {
    const haystack = `${type.name} ${type.type_key} ${type.description ?? ''}`.toLowerCase()
    if (!haystack.includes(term)) {
      return false
    }
  }

  if (orgUnitFilter.value === ORG_UNIT_NONE && (type.producer_areas?.length ?? 0) > 0) {
    return false
  }

  if (orgUnitFilter.value !== FILTER_ALL && orgUnitFilter.value !== ORG_UNIT_NONE) {
    const unitId = Number(orgUnitFilter.value)
    if (!(type.producer_areas ?? []).some(area => area.org_unit_id === unitId)) {
      return false
    }
  }

  if (modelFilter.value !== FILTER_ALL && type.model !== modelFilter.value) {
    return false
  }

  if (statusFilter.value === 'active' && !type.is_active) {
    return false
  }

  if (statusFilter.value === 'inactive' && type.is_active) {
    return false
  }

  if (systemFilter.value === 'system' && !type.is_system) {
    return false
  }

  if (systemFilter.value === 'custom' && type.is_system) {
    return false
  }

  if (trdFilter.value === 'configured' && !typeHasTrdConfigured(type)) {
    return false
  }

  if (trdFilter.value === 'pending' && typeHasTrdConfigured(type)) {
    return false
  }

  return true
}

const groupedByArea = computed(() => {
  const groups = new Map<string, { key: string, label: string, types: ArchivalFileType[] }>()

  for (const type of summaryTypes.value.filter(matchesListFilters)) {
    const areas = type.producer_areas ?? []

    if (areas.length === 0) {
      const key = ORG_UNIT_NONE
      const label = 'Sin área productora'
      const group = groups.get(key) ?? { key, label, types: [] }
      group.types.push(type)
      groups.set(key, group)
      continue
    }

    for (const area of areas) {
      const key = String(area.org_unit_id)
      const label = area.org_unit?.name ?? `Área #${area.org_unit_id}`
      const group = groups.get(key) ?? { key, label, types: [] }
      group.types.push(type)
      groups.set(key, group)
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === ORG_UNIT_NONE) {
      return 1
    }

    if (b.key === ORG_UNIT_NONE) {
      return -1
    }

    return a.label.localeCompare(b.label, 'es')
  })
})

const areaViewTypeCount = computed(() =>
  groupedByArea.value.reduce((sum, group) => sum + group.types.length, 0),
)

const hasActiveFilters = computed(() =>
  search.value.trim() !== ''
  || orgUnitFilter.value !== FILTER_ALL
  || modelFilter.value !== FILTER_ALL
  || statusFilter.value !== FILTER_ALL
  || systemFilter.value !== FILTER_ALL
  || trdFilter.value !== FILTER_ALL,
)

function fileTypePayload(type: ArchivalFileType, overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    type_key: type.type_key,
    name: type.name,
    description: type.description ?? null,
    model: type.model,
    producer_areas: (type.producer_areas ?? []).map((area, index) => ({
      org_unit_id: area.org_unit_id,
      trd_table_id: area.trd_table_id ?? null,
      doc_series_id: area.doc_series_id ?? null,
      doc_subseries_id: area.doc_subseries_id ?? null,
      doc_document_type_id: area.doc_document_type_id ?? null,
      sort_order: area.sort_order ?? index,
    })),
    archival_metadata_schema_id: type.archival_metadata_schema_id ?? null,
    allows_master_documents: type.allows_master_documents,
    is_active: type.is_active,
    sort_order: type.sort_order,
    ...overrides,
  }
}

function buildQueryParams(page: number): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {
    page,
    per_page: meta.value.per_page,
  }

  if (search.value.trim()) {
    params.search = search.value.trim()
  }

  if (orgUnitFilter.value === ORG_UNIT_NONE) {
    params.without_org_unit = true
  }
  else if (orgUnitFilter.value !== FILTER_ALL) {
    params.org_unit_id = Number(orgUnitFilter.value)
  }

  if (modelFilter.value !== FILTER_ALL) {
    params.model = modelFilter.value
  }

  if (statusFilter.value === 'active') {
    params.active_only = true
  }
  else if (statusFilter.value === 'inactive') {
    params.is_active = false
  }

  if (systemFilter.value === 'system') {
    params.is_system = true
  }
  else if (systemFilter.value === 'custom') {
    params.is_system = false
  }

  if (trdFilter.value === 'configured') {
    params.trd_configured = true
  }
  else if (trdFilter.value === 'pending') {
    params.trd_configured = false
  }

  return params
}

async function loadSummary() {
  try {
    const res = await archivalApi.fetchFileTypesAdmin({}, false)
    summaryTypes.value = res.data
  }
  catch {
    summaryTypes.value = []
  }
}

async function loadOrgUnits() {
  try {
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
  }
  catch {
    orgUnits.value = []
  }
}

async function load(page = 1) {
  loading.value = true

  try {
    const includeInactive = statusFilter.value !== 'active'
    const res = await archivalApi.fetchFileTypesAdmin(buildQueryParams(page), !includeInactive)
    types.value = res.data
    meta.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      total: res.meta.total,
      per_page: res.meta.per_page,
    }
  }
  catch {
    toast.error('No se pudieron cargar los tipos de expediente.')
  }
  finally {
    loading.value = false
  }
}

function onPerPageChange(value: unknown) {
  meta.value.per_page = Number(value)
  void load(1)
}

async function refreshAll() {
  await loadSummary()
  await load(meta.value.current_page)
}

async function toggleActive(type: ArchivalFileType, isActive: boolean) {
  if (togglingId.value != null) {
    return
  }

  togglingId.value = type.id

  try {
    await archivalApi.saveFileType(fileTypePayload(type, { is_active: isActive }), type.id)
    toast.success(isActive ? 'Tipo de expediente activado.' : 'Tipo de expediente desactivado.')
    await refreshAll()
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo actualizar el tipo.')
  }
  finally {
    togglingId.value = null
  }
}

function typesForAreaPreview(group: { key: string, types: ArchivalFileType[] }): ArchivalFileType[] {
  if (areaShowAll.value[group.key]) {
    return group.types
  }

  return group.types.slice(0, AREA_PREVIEW_LIMIT)
}

function toggleAreaShowAll(key: string) {
  areaShowAll.value = {
    ...areaShowAll.value,
    [key]: !areaShowAll.value[key],
  }
}

function selectOrgUnitPill(value: string) {
  orgUnitFilter.value = value
  areaShowAll.value = {}
  void load(1)
}

function clearFilters() {
  search.value = ''
  orgUnitFilter.value = FILTER_ALL
  modelFilter.value = FILTER_ALL
  statusFilter.value = FILTER_ALL
  systemFilter.value = FILTER_ALL
  trdFilter.value = FILTER_ALL
  areaShowAll.value = {}
  void load(1)
}

function requiredCount(type: ArchivalFileType): number {
  return type.required_documents?.length ?? 0
}

function producerAreaExpandRows(type: ArchivalFileType): Array<{
  name: string
  code: string
  catalog: string
  configured: boolean
}> {
  const areas = type.producer_areas ?? []

  if (areas.length === 0) {
    if (type.doc_series && type.doc_subseries) {
      return [{
        name: type.trd_table?.org_unit?.name ?? 'TRD',
        code: `${type.doc_series.code} — ${type.doc_subseries.code}`,
        catalog: `${type.doc_series.name} / ${type.doc_subseries.name}`,
        configured: true,
      }]
    }

    return []
  }

  return areas.map(area => ({
    name: area.org_unit?.name ?? `Área #${area.org_unit_id}`,
    code: area.doc_series && area.doc_subseries
      ? `${area.doc_series.code}/${area.doc_subseries.code}`
      : '—',
    catalog: area.doc_series && area.doc_subseries
      ? `${area.doc_series.name} / ${area.doc_subseries.name}`
      : 'Sin TRD',
    configured: Boolean(area.doc_series && area.doc_subseries),
  }))
}

function toggleTypeAreas(typeId: number): void {
  expandedTypeId.value = expandedTypeId.value === typeId ? null : typeId
}

function catalogSummary(type: ArchivalFileType): string {
  const areas = type.producer_areas ?? []

  if (areas.length === 0) {
    if (type.doc_series && type.doc_subseries) {
      return `${type.doc_series.code} — ${type.doc_subseries.code}`
    }

    return 'Sin TRD'
  }

  if (areas.length === 1 && areas[0]?.doc_series && areas[0]?.doc_subseries) {
    return `${areas[0].doc_series.code} — ${areas[0].doc_subseries.code}`
  }

  const configured = areas.filter(area => area.doc_series && area.doc_subseries).length

  return `${configured} área${configured === 1 ? '' : 's'} con TRD`
}

onMounted(async () => {
  await loadOrgUnits()
  await loadSummary()
  await load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Tipos de expediente
        </h1>
        <p class="text-sm text-muted-foreground">
          Configure series, TRD, metadatos y documentos obligatorios por tipo.
        </p>
      </div>
      <Button @click="router.push('/expedientes/tipos/nuevo')">
        <Icon name="i-lucide-plus" class="mr-2 size-4" />
        Nuevo tipo
      </Button>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div class="flex flex-wrap gap-3">
          <div class="relative min-w-[14rem] flex-1">
            <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="search"
              class="max-w-md pl-9"
              placeholder="Buscar por nombre, clave o descripción..."
              @keyup.enter="load(1)"
            />
          </div>
          <Select v-model="modelFilter" @update:model-value="() => load(1)">
            <SelectTrigger class="w-52">
              <SelectValue placeholder="De quién es" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="FILTER_ALL">
                Todos
              </SelectItem>
              <SelectItem
                v-for="(label, value) in ARCHIVAL_FILE_MODEL_LABELS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="statusFilter" @update:model-value="() => load(1)">
            <SelectTrigger class="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="FILTER_ALL">
                Todos
              </SelectItem>
              <SelectItem value="active">
                Solo activos
              </SelectItem>
              <SelectItem value="inactive">
                Solo inactivos
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="systemFilter" @update:model-value="() => load(1)">
            <SelectTrigger class="w-40">
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="FILTER_ALL">
                Todos
              </SelectItem>
              <SelectItem value="system">
                Sistema
              </SelectItem>
              <SelectItem value="custom">
                Personalizados
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="trdFilter" @update:model-value="() => load(1)">
            <SelectTrigger class="w-44">
              <SelectValue placeholder="TRD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="FILTER_ALL">
                TRD: todos
              </SelectItem>
              <SelectItem value="configured">
                TRD configurado
              </SelectItem>
              <SelectItem value="pending">
                TRD pendiente
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" :disabled="loading" @click="load(1)">
            Buscar
          </Button>
          <Button
            v-if="hasActiveFilters"
            variant="outline"
            :disabled="loading"
            @click="clearFilters"
          >
            Limpiar
          </Button>
        </div>

        <div class="space-y-2">
          <Label class="text-muted-foreground">Filtrar por área productora</Label>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              class="rounded-full"
              :variant="orgUnitFilter === FILTER_ALL ? 'default' : 'outline'"
              @click="selectOrgUnitPill(FILTER_ALL)"
            >
              Todas las áreas
            </Button>
            <Button
              v-for="pill in orgUnitPills.pills"
              :key="pill.id"
              size="sm"
              class="rounded-full"
              :variant="orgUnitFilter === pill.id ? 'default' : 'outline'"
              @click="selectOrgUnitPill(pill.id)"
            >
              {{ pill.label }}
              <span class="ml-1 text-xs opacity-80">({{ pill.count }})</span>
            </Button>
            <Button
              v-if="orgUnitPills.withoutArea > 0"
              size="sm"
              class="rounded-full"
              :variant="orgUnitFilter === ORG_UNIT_NONE ? 'default' : 'outline'"
              @click="selectOrgUnitPill(ORG_UNIT_NONE)"
            >
              Sin área
              <span class="ml-1 text-xs opacity-80">({{ orgUnitPills.withoutArea }})</span>
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <p class="min-w-0 text-sm text-muted-foreground">
            {{ viewMode === 'table' ? meta.total : areaViewTypeCount }}
            tipo{{ (viewMode === 'table' ? meta.total : areaViewTypeCount) === 1 ? '' : 's' }} según filtros
            · {{ summary.active }} activos
            · {{ summary.trdPending }} TRD pendiente{{ summary.trdPending === 1 ? '' : 's' }}
          </p>
          <div class="flex shrink-0 items-center gap-2">
            <Select
              v-if="viewMode === 'table'"
              :model-value="String(meta.per_page)"
              :disabled="loading"
              @update:model-value="onPerPageChange"
            >
              <SelectTrigger id="tipos-per-page" class="h-9 w-[8.25rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in PER_PAGE_OPTIONS"
                  :key="option"
                  :value="String(option)"
                >
                  {{ option }} / pág.
                </SelectItem>
              </SelectContent>
            </Select>
            <Tabs v-model="viewMode" class="w-auto">
              <TabsList class="h-9">
                <TabsTrigger value="table" class="text-xs sm:text-sm">
                  Tabla
                </TabsTrigger>
                <TabsTrigger value="by_area" class="text-xs sm:text-sm">
                  Por área
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div v-if="loading" class="py-8 text-center text-muted-foreground">
          Cargando tipos…
        </div>

        <div
          v-else-if="types.length === 0"
          class="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground"
        >
          No hay tipos que coincidan con los filtros.
          <Button v-if="hasActiveFilters" variant="link" size="sm" class="mt-1" @click="clearFilters">
            Limpiar filtros
          </Button>
        </div>

        <div v-else-if="viewMode === 'table'" class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="min-w-[16rem]">
                  Nombre
                </TableHead>
                <TableHead class="w-[10rem]">
                  De quién es
                </TableHead>
                <TableHead class="w-[7rem] text-center">
                  Obligatorios
                </TableHead>
                <TableHead class="w-[7rem]">
                  Estado
                </TableHead>
                <TableHead class="w-[11rem] text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="type in types" :key="type.id">
                <TableRow>
                  <TableCell class="font-medium">
                    <div class="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 shrink-0 px-0"
                        :aria-expanded="expandedTypeId === type.id"
                        :aria-label="expandedTypeId === type.id ? 'Ocultar áreas TRD' : 'Ver áreas TRD'"
                        @click="toggleTypeAreas(type.id)"
                      >
                        <Icon
                          :name="expandedTypeId === type.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                          class="size-4"
                        />
                      </Button>
                      <span>{{ type.name }}</span>
                      <Badge v-if="type.is_system" variant="outline" class="ml-1 text-xs">
                        Sistema
                      </Badge>
                      <Badge variant="outline" class="ml-1">
                        {{ producerAreaExpandRows(type).length }}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }}
                  </TableCell>
                  <TableCell class="text-center">
                    {{ requiredCount(type) }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="type.is_active ? 'default' : 'secondary'">
                      {{ type.is_active ? 'Activo' : 'Inactivo' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        @click="router.push(`/expedientes/tipos/${type.id}`)"
                      >
                        Editar
                      </Button>
                      <Button
                        v-if="type.is_active"
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        :disabled="togglingId === type.id"
                        @click="toggleActive(type, false)"
                      >
                        <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                        Desactivar
                      </Button>
                      <Button
                        v-else
                        type="button"
                        variant="secondary"
                        size="sm"
                        class="h-8 px-2 text-xs"
                        :disabled="togglingId === type.id"
                        @click="toggleActive(type, true)"
                      >
                        Activar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="expandedTypeId === type.id" class="bg-muted/30 hover:bg-muted/30">
                  <TableCell colspan="5" class="p-3">
                    <p
                      v-if="producerAreaExpandRows(type).length === 0"
                      class="text-sm text-muted-foreground"
                    >
                      Este tipo no tiene áreas productoras.
                      <button
                        type="button"
                        class="ml-1 underline underline-offset-2"
                        @click="router.push(`/expedientes/tipos/${type.id}?tab=areas`)"
                      >
                        Configurar la primera
                      </button>
                    </p>
                    <div v-else class="overflow-hidden rounded-md border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Área productora</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Serie / subserie</TableHead>
                            <TableHead>TRD</TableHead>
                            <TableHead class="text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="(row, rowIndex) in producerAreaExpandRows(type)"
                            :key="`${type.id}-area-${rowIndex}`"
                          >
                            <TableCell class="font-medium">
                              {{ row.name }}
                            </TableCell>
                            <TableCell class="font-mono">
                              {{ row.code }}
                            </TableCell>
                            <TableCell class="text-sm text-muted-foreground">
                              {{ row.catalog }}
                            </TableCell>
                            <TableCell>
                              <Badge :variant="row.configured ? 'default' : 'secondary'">
                                {{ row.configured ? 'Configurada' : 'Pendiente' }}
                              </Badge>
                            </TableCell>
                            <TableCell class="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                class="h-8 gap-1.5 px-2 text-xs"
                                @click="router.push(`/expedientes/tipos/${type.id}?tab=areas`)"
                              >
                                Editar
                              </Button>
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

        <div v-else class="space-y-2">
          <p v-if="groupedByArea.length === 0" class="py-8 text-center text-sm text-muted-foreground">
            No hay tipos que coincidan con los filtros.
          </p>
          <Collapsible
            v-for="group in groupedByArea"
            :key="group.key"
            :default-open="groupedByArea.length === 1"
            class="group/collapsible rounded-md border"
          >
            <CollapsibleTrigger
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              <div class="flex min-w-0 items-center gap-2">
                <Icon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
                <span class="truncate font-medium">{{ group.label }}</span>
              </div>
              <Badge variant="secondary" class="shrink-0">
                {{ group.types.length }} tipo{{ group.types.length === 1 ? '' : 's' }}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent class="border-t">
              <ul class="divide-y">
                <li
                  v-for="type in typesForAreaPreview(group)"
                  :key="type.id"
                  class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                >
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-medium">
                        {{ type.name }}
                      </p>
                      <Badge v-if="type.is_system" variant="outline" class="text-xs">
                        Sistema
                      </Badge>
                      <Badge :variant="type.is_active ? 'default' : 'secondary'" class="text-xs">
                        {{ type.is_active ? 'Activo' : 'Inactivo' }}
                      </Badge>
                    </div>
                    <p class="text-xs text-muted-foreground">
                      {{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }} · {{ catalogSummary(type) }}
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 gap-1.5 px-2 text-xs"
                      @click="router.push(`/expedientes/tipos/${type.id}`)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="type.is_active"
                      type="button"
                      variant="destructive"
                      size="sm"
                      class="h-8 gap-1.5 px-2 text-xs"
                      :disabled="togglingId === type.id"
                      @click="toggleActive(type, false)"
                    >
                      <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                      Desactivar
                    </Button>
                    <Button
                      v-else
                      variant="secondary"
                      size="sm"
                      class="h-8 px-2 text-xs"
                      :disabled="togglingId === type.id"
                      @click="toggleActive(type, true)"
                    >
                      Activar
                    </Button>
                  </div>
                </li>
              </ul>
              <div
                v-if="group.types.length > AREA_PREVIEW_LIMIT"
                class="border-t px-4 py-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 px-0 text-xs"
                  @click="toggleAreaShowAll(group.key)"
                >
                  {{ areaShowAll[group.key]
                    ? 'Ver menos'
                    : `Ver ${group.types.length - AREA_PREVIEW_LIMIT} más` }}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <ListPaginationBar
          v-if="showPagination"
          class="mt-6"
          :page="meta.current_page"
          :last-page="meta.last_page"
          :per-page="meta.per_page"
          :total="meta.total"
          item-label="tipos"
          :loading="loading"
          @update:page="load"
          @update:per-page="onPerPageChange"
        />
      </CardContent>
    </Card>
  </div>
</template>
