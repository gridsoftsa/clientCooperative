<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import type { ArchivalFileModel, ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const FILTER_ALL = 'all'
const ORG_UNIT_NONE = 'none'

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
    trdPending: rows.filter(type => !type.doc_series_id || !type.doc_subseries_id).length,
    withoutOrgUnit: rows.filter(type => !type.org_unit_id).length,
  }
})

const orgUnitPills = computed(() => {
  const counts = new Map<number, number>()
  let withoutArea = 0

  for (const type of summaryTypes.value) {
    if (type.org_unit_id) {
      counts.set(type.org_unit_id, (counts.get(type.org_unit_id) ?? 0) + 1)
    }
    else {
      withoutArea += 1
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

const groupedByArea = computed(() => {
  const groups = new Map<string, { key: string, label: string, types: ArchivalFileType[] }>()

  for (const type of types.value) {
    const key = type.org_unit_id ? String(type.org_unit_id) : ORG_UNIT_NONE
    const label = type.org_unit?.name ?? 'Sin área productora'

    const group = groups.get(key) ?? { key, label, types: [] }
    group.types.push(type)
    groups.set(key, group)
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
    org_unit_id: type.org_unit_id ?? null,
    doc_series_id: type.doc_series_id ?? null,
    doc_subseries_id: type.doc_subseries_id ?? null,
    doc_document_type_id: type.doc_document_type_id ?? null,
    trd_table_id: type.trd_table_id ?? null,
    archival_metadata_schema_id: type.archival_metadata_schema_id ?? null,
    allows_master_documents: type.allows_master_documents,
    is_active: type.is_active,
    sort_order: type.sort_order,
    ...overrides,
  }
}

function buildQueryParams(): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {}

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
    summaryTypes.value = await archivalApi.fetchFileTypesAdmin({}, false)
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

async function load() {
  loading.value = true

  try {
    const includeInactive = statusFilter.value !== 'active'
    types.value = await archivalApi.fetchFileTypesAdmin(buildQueryParams(), !includeInactive)

    if (statusFilter.value === 'inactive') {
      types.value = types.value.filter(type => !type.is_active)
    }
  }
  catch {
    toast.error('No se pudieron cargar los tipos de expediente.')
  }
  finally {
    loading.value = false
  }
}

async function refreshAll() {
  await loadSummary()
  await load()
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

function selectOrgUnitPill(value: string) {
  orgUnitFilter.value = value
  void load()
}

function clearFilters() {
  search.value = ''
  orgUnitFilter.value = FILTER_ALL
  modelFilter.value = FILTER_ALL
  statusFilter.value = FILTER_ALL
  systemFilter.value = FILTER_ALL
  trdFilter.value = FILTER_ALL
  void load()
}

function requiredCount(type: ArchivalFileType): number {
  return type.required_documents?.length ?? 0
}

function catalogSummary(type: ArchivalFileType): string {
  if (type.doc_series && type.doc_subseries) {
    return `${type.doc_series.code} — ${type.doc_subseries.code}`
  }

  if (type.doc_series) {
    return type.doc_series.code
  }

  return 'Sin TRD'
}

function catalogDetail(type: ArchivalFileType): string | null {
  if (type.doc_series && type.doc_subseries) {
    return `${type.doc_series.name} / ${type.doc_subseries.name}`
  }

  if (type.doc_series) {
    return type.doc_series.name
  }

  return null
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
              @keyup.enter="load"
            />
          </div>
          <Select v-model="modelFilter" @update:model-value="load">
            <SelectTrigger class="w-44">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="FILTER_ALL">
                Todos los modelos
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
          <Select v-model="statusFilter" @update:model-value="load">
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
          <Select v-model="systemFilter" @update:model-value="load">
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
          <Select v-model="trdFilter" @update:model-value="load">
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
          <Button variant="secondary" :disabled="loading" @click="load">
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

        <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <p class="text-sm text-muted-foreground">
            {{ types.length }} de {{ summary.total }} tipo{{ summary.total === 1 ? '' : 's' }}
            · {{ summary.active }} activos
            · {{ summary.trdPending }} TRD pendiente{{ summary.trdPending === 1 ? '' : 's' }}
          </p>
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

        <Table v-else-if="viewMode === 'table'">
          <TableHeader>
            <TableRow>
              <TableHead class="min-w-[14rem]">
                Nombre
              </TableHead>
              <TableHead class="w-[10rem]">
                Modelo
              </TableHead>
              <TableHead class="min-w-[16rem]">
                Catálogo / TRD
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
            <TableRow v-for="type in types" :key="type.id">
              <TableCell>
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ type.name }}</span>
                    <Badge v-if="type.is_system" variant="outline" class="text-xs">
                      Sistema
                    </Badge>
                  </div>
                  <p v-if="type.org_unit" class="text-xs text-muted-foreground">
                    {{ type.org_unit.name }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="text-sm">
                {{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }}
              </TableCell>
              <TableCell>
                <div class="space-y-1 text-sm">
                  <div class="font-mono text-xs">
                    {{ catalogSummary(type) }}
                  </div>
                  <div v-if="catalogDetail(type)" class="text-muted-foreground">
                    {{ catalogDetail(type) }}
                  </div>
                  <div v-if="type.trd_table?.org_unit" class="text-xs text-muted-foreground">
                    TRD: {{ type.trd_table.org_unit.name }}
                  </div>
                </div>
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
          </TableBody>
        </Table>

        <div v-else class="space-y-6">
          <section
            v-for="group in groupedByArea"
            :key="group.key"
            class="space-y-3"
          >
            <div class="border-b pb-2">
              <h2 class="font-semibold">
                {{ group.label }}
              </h2>
              <p class="text-xs text-muted-foreground">
                {{ group.types.length }} tipo{{ group.types.length === 1 ? '' : 's' }}
              </p>
            </div>

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="type in group.types"
                :key="type.id"
                class="rounded-lg border p-4"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium">
                    {{ type.name }}
                  </p>
                  <Badge v-if="type.is_system" variant="outline" class="text-xs">
                    Sistema
                  </Badge>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }} · {{ catalogSummary(type) }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="router.push(`/expedientes/tipos/${type.id}`)"
                  >
                    Editar
                  </Button>
                  <Button
                    v-if="type.is_active"
                    variant="ghost"
                    size="sm"
                    :disabled="togglingId === type.id"
                    @click="toggleActive(type, false)"
                  >
                    Desactivar
                  </Button>
                  <Button
                    v-else
                    variant="secondary"
                    size="sm"
                    :disabled="togglingId === type.id"
                    @click="toggleActive(type, true)"
                  >
                    Activar
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
