<script setup lang="ts">
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
} from '~/constants/ventanilla'
import type {
  VentanillaCatalogData,
  VentanillaFilingSummary,
  VentanillaFunctionalTypeRow,
  VentanillaResponsibleUserRow,
  VentanillaTrafficLightValue,
} from '~/types/ventanilla'

interface OrgUnitOption {
  id: number
  name: string
  code: string | null
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_ver',
})

const router = useRouter()
const ventanillaApi = useVentanillaApi()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const filings = ref<VentanillaFilingSummary[]>([])
const catalog = ref<VentanillaCatalogData | null>(null)
const orgUnits = ref<OrgUnitOption[]>([])
const responsibleUsers = ref<VentanillaResponsibleUserRow[]>([])
const loadingResponsibleUsers = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const showAdvancedSearch = ref(false)
const search = ref('')
const filterType = ref('all')
const filterFunctionalType = ref('all')
const filterTrafficLight = ref('all')
const filterStatus = ref('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterOrgUnitId = ref('all')
const filterAssignedUserId = ref('all')
const filterRequiresResponse = ref('all')
const filterMetadataFieldCode = ref('none')
const filterMetadataValue = ref('')
const pagination = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })
const exportingMetadata = ref(false)
let dateFilterDebounce: ReturnType<typeof setTimeout> | null = null

const searchableMetadataFields = computed(
  () => catalog.value?.searchable_metadata_fields ?? [],
)

const canCreate = computed(() => hasPermission('ventanilla_crear'))
const canClassify = computed(() => hasPermission('ventanilla_clasificar'))
const hasActiveFilters = computed(() =>
  search.value.trim()
  || filterType.value !== 'all'
  || filterFunctionalType.value !== 'all'
  || filterTrafficLight.value !== 'all'
  || filterStatus.value !== 'all'
  || filterDateFrom.value
  || filterDateTo.value
  || filterOrgUnitId.value !== 'all'
  || filterAssignedUserId.value !== 'all'
  || filterRequiresResponse.value !== 'all'
  || (filterMetadataFieldCode.value !== 'none' && filterMetadataValue.value.trim()),
)

const hasAdvancedFilters = computed(() =>
  filterOrgUnitId.value !== 'all'
  || filterAssignedUserId.value !== 'all'
  || filterRequiresResponse.value !== 'all'
  || (filterMetadataFieldCode.value !== 'none' && filterMetadataValue.value.trim()),
)

function buildListQuery(includePagination = true): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (includePagination) {
    query.page = pagination.value.current_page
    query.per_page = pagination.value.per_page
  }
  if (search.value.trim()) {
    query.search = search.value.trim()
  }
  if (filterType.value !== 'all') {
    query.filing_type = filterType.value
  }
  if (filterFunctionalType.value !== 'all') {
    query.functional_type_key = filterFunctionalType.value
  }
  if (filterTrafficLight.value !== 'all') {
    query.traffic_light_status = filterTrafficLight.value
  }
  if (filterStatus.value !== 'all') {
    query.status = filterStatus.value
  }
  if (filterDateFrom.value) {
    query.filed_from = filterDateFrom.value
  }
  if (filterDateTo.value) {
    query.filed_to = filterDateTo.value
  }
  if (filterOrgUnitId.value !== 'all') {
    query.org_unit_responsible_id = Number(filterOrgUnitId.value)
  }
  if (filterAssignedUserId.value !== 'all') {
    query.assigned_user_id = Number(filterAssignedUserId.value)
  }
  if (filterRequiresResponse.value === 'yes') {
    query.requires_response = 1
  } else if (filterRequiresResponse.value === 'no') {
    query.requires_response = 0
  }
  if (filterMetadataFieldCode.value !== 'none' && filterMetadataValue.value.trim()) {
    query.metadata_field_code = filterMetadataFieldCode.value
    query.metadata_value = filterMetadataValue.value.trim()
  }

  return query
}

async function exportMetadataReport() {
  exportingMetadata.value = true
  errorMessage.value = ''
  try {
    await ventanillaApi.downloadMetadataReportExport(buildListQuery(false))
  } catch {
    errorMessage.value = 'No se pudo exportar el reporte de metadatos'
  } finally {
    exportingMetadata.value = false
  }
}

async function loadList() {
  if (filterDateFrom.value && filterDateTo.value && filterDateFrom.value > filterDateTo.value) {
    errorMessage.value = 'La fecha inicial no puede ser posterior a la fecha final'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const res = await ventanillaApi.fetchFilings(buildListQuery())
    filings.value = res.data ?? []
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    errorMessage.value = err?.data?.errors?.metadata_field_code?.[0]
      ?? err?.data?.errors?.metadata_value?.[0]
      ?? err?.data?.message
      ?? 'No se pudo cargar el listado de radicados'
  } finally {
    loading.value = false
  }
}

async function loadResponsibleUsers(orgUnitId: string): Promise<void> {
  if (orgUnitId === 'all') {
    responsibleUsers.value = []
    filterAssignedUserId.value = 'all'
    return
  }

  loadingResponsibleUsers.value = true
  try {
    responsibleUsers.value = await ventanillaApi.fetchResponsibleUsers(Number(orgUnitId))
  } catch {
    responsibleUsers.value = []
  } finally {
    loadingResponsibleUsers.value = false
  }
}

watch(filterOrgUnitId, async (orgUnitId, previousOrgUnitId) => {
  if (orgUnitId !== previousOrgUnitId) {
    filterAssignedUserId.value = 'all'
    await loadResponsibleUsers(orgUnitId)
  }
})

onMounted(async () => {
  try {
    const [catalogData, orgUnitsRes] = await Promise.all([
      ventanillaApi.fetchCatalog(),
      $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
        query: { active_only: 1 },
      }).catch(() => ({ data: [] as OrgUnitOption[] })),
    ])
    catalog.value = catalogData
    orgUnits.value = orgUnitsRes.data ?? []
  } catch {
    catalog.value = null
    orgUnits.value = []
  }
  await loadList()
})

onUnmounted(() => {
  if (dateFilterDebounce) {
    clearTimeout(dateFilterDebounce)
    dateFilterDebounce = null
  }
})

function workflowStageLabel(row: VentanillaFilingSummary): string {
  const workflow = row.workflow

  if (!workflow) {
    return '—'
  }

  if (workflow.open_task?.stage_name) {
    return workflow.open_task.stage_name
  }

  if (workflow.current_stage_name) {
    return workflow.current_stage_name
  }

  if (workflow.instance_status === 'completed') {
    return 'Proceso completado'
  }

  if (workflow.instance_status === 'cancelled') {
    return 'Proceso cancelado'
  }

  return '—'
}

function functionalLabel(row: VentanillaFilingSummary): string {
  return row.functional_type_label
    ?? catalog.value?.functional_types.find((t: VentanillaFunctionalTypeRow) => t.key === row.functional_type_key)?.label
    ?? row.functional_type_key
}

function resetFilters() {
  search.value = ''
  filterType.value = 'all'
  filterFunctionalType.value = 'all'
  filterTrafficLight.value = 'all'
  filterStatus.value = 'all'
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterOrgUnitId.value = 'all'
  filterAssignedUserId.value = 'all'
  filterRequiresResponse.value = 'all'
  filterMetadataFieldCode.value = 'none'
  filterMetadataValue.value = ''
  responsibleUsers.value = []
  pagination.value.current_page = 1
  loadList()
}

function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), pagination.value.last_page)
  if (nextPage === pagination.value.current_page) {
    return
  }
  pagination.value.current_page = nextPage
  loadList()
}

function filterAndLoad() {
  pagination.value.current_page = 1
  loadList()
}

watch([filterDateFrom, filterDateTo], () => {
  if (dateFilterDebounce) {
    clearTimeout(dateFilterDebounce)
  }
  dateFilterDebounce = setTimeout(() => {
    dateFilterDebounce = null
    filterAndLoad()
  }, 300)
})

function trafficLightLabel(status: string): string {
  if (status === 'all') {
    return 'Todos'
  }

  return VENTANILLA_TRAFFIC_LIGHT_LABELS[status as VentanillaTrafficLightValue] ?? status
}

function statusLabel(status: string): string {
  return VENTANILLA_FILING_STATUS_LABELS[status as keyof typeof VENTANILLA_FILING_STATUS_LABELS] ?? status
}
</script>

<template>
  <div class="space-y-6 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Ventanilla única
        </h1>
        <p class="text-muted-foreground text-sm">
          Radicación de documentos (entrada, salida e interna)
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="canClassify" variant="outline" @click="router.push('/ventanilla/bandeja')">
          <Icon name="i-lucide-list-filter" class="mr-2 size-4" />
          Bandeja
        </Button>
        <Button
          variant="outline"
          :disabled="exportingMetadata"
          @click="exportMetadataReport"
        >
          <Icon
            :name="exportingMetadata ? 'i-lucide-loader-2' : 'i-lucide-file-down'"
            class="mr-2 size-4"
            :class="{ 'animate-spin': exportingMetadata }"
          />
          Exportar metadatos
        </Button>
        <Button v-if="canCreate" @click="router.push('/ventanilla/nueva')">
          <Icon name="i-lucide-plus" class="mr-2 size-4" />
          Radicar documento
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 xl:flex-row xl:flex-nowrap xl:items-end">
          <div class="min-w-0 space-y-1 xl:flex-1">
            <Label for="ventanilla-filter-search" class="text-xs text-muted-foreground">
              Buscar
            </Label>
            <Input
              id="ventanilla-filter-search"
              v-model="search"
              placeholder="Número, asunto, remitente o destinatario…"
              class="min-w-0"
              @keyup.enter="filterAndLoad"
            />
          </div>
          <div class="grid w-full gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0 xl:gap-3">
            <div class="space-y-1 xl:w-[8.5rem]">
              <Label for="ventanilla-filter-type" class="text-xs text-muted-foreground">
                Tipo de radicación
              </Label>
              <Select v-model="filterType" @update:model-value="filterAndLoad">
                <SelectTrigger id="ventanilla-filter-type" class="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los tipos
                  </SelectItem>
                  <SelectItem value="incoming">
                    Entrada
                  </SelectItem>
                  <SelectItem value="outgoing">
                    Salida
                  </SelectItem>
                  <SelectItem value="internal">
                    Interna
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1 xl:w-[10.5rem]">
              <Label for="ventanilla-filter-functional" class="text-xs text-muted-foreground">
                Tipo funcional
              </Label>
              <Select v-model="filterFunctionalType" @update:model-value="filterAndLoad">
                <SelectTrigger id="ventanilla-filter-functional" class="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos
                  </SelectItem>
                  <SelectItem
                    v-for="t in catalog?.functional_types ?? []"
                    :key="t.key"
                    :value="t.key"
                  >
                    {{ t.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1 xl:w-[9.5rem]">
              <Label for="ventanilla-filter-status" class="text-xs text-muted-foreground">
                Estado
              </Label>
              <Select v-model="filterStatus" @update:model-value="filterAndLoad">
                <SelectTrigger id="ventanilla-filter-status" class="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los estados
                  </SelectItem>
                  <SelectItem
                    v-for="(label, key) in VENTANILLA_FILING_STATUS_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1 xl:w-[9.5rem]">
              <Label for="ventanilla-filter-traffic-light" class="text-xs text-muted-foreground">
                Semáforo SLA
              </Label>
              <Select v-model="filterTrafficLight" @update:model-value="filterAndLoad">
                <SelectTrigger id="ventanilla-filter-traffic-light" class="w-full">
                  <SelectValue placeholder="Todos">
                    {{ trafficLightLabel(filterTrafficLight) }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos
                  </SelectItem>
                  <SelectItem value="green">
                    En término
                  </SelectItem>
                  <SelectItem value="orange">
                    Próximo a vencer
                  </SelectItem>
                  <SelectItem value="red">
                    Vencido
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1 xl:w-[12.5rem]">
              <Label for="ventanilla-index-date-range" class="text-xs text-muted-foreground">
                Fecha de radicación
              </Label>
              <DateRangeStringPicker
                id="ventanilla-index-date-range"
                v-model:from="filterDateFrom"
                v-model:to="filterDateTo"
                placeholder-text="Desde — Hasta"
                compact
                full-width
              />
            </div>
          </div>
          <div class="flex shrink-0 gap-2 xl:pb-0.5">
            <Button
              variant="outline"
              :disabled="loading"
              @click="showAdvancedSearch = !showAdvancedSearch"
            >
              <Icon name="i-lucide-sliders-horizontal" class="mr-2 size-4" />
              Avanzada
              <Badge
                v-if="hasAdvancedFilters"
                variant="secondary"
                class="ml-2 px-1.5 py-0 text-[10px]"
              >
                {{ [
                  filterOrgUnitId !== 'all',
                  filterAssignedUserId !== 'all',
                  filterRequiresResponse !== 'all',
                  filterMetadataFieldCode !== 'none' && filterMetadataValue.trim(),
                ].filter(Boolean).length }}
              </Badge>
            </Button>
            <Button variant="secondary" :disabled="loading" @click="filterAndLoad">
              <Icon name="i-lucide-search" class="mr-2 size-4" />
              Buscar
            </Button>
            <Button v-if="hasActiveFilters" variant="ghost" :disabled="loading" @click="resetFilters">
              Limpiar
            </Button>
          </div>
        </div>
        <Collapsible v-model:open="showAdvancedSearch" class="mt-3">
          <CollapsibleContent>
            <div class="rounded-lg border bg-background p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div class="space-y-1">
                <Label for="ventanilla-filter-org-unit" class="text-xs text-muted-foreground">
                  Área responsable
                </Label>
                <Select v-model="filterOrgUnitId" @update:model-value="filterAndLoad">
                  <SelectTrigger id="ventanilla-filter-org-unit">
                    <SelectValue placeholder="Todas las áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas las áreas
                    </SelectItem>
                    <SelectItem
                      v-for="unit in orgUnits"
                      :key="unit.id"
                      :value="String(unit.id)"
                    >
                      {{ unit.code }} — {{ unit.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1">
                <Label for="ventanilla-filter-assigned-user" class="text-xs text-muted-foreground">
                  Responsable asignado
                </Label>
                <Select
                  v-model="filterAssignedUserId"
                  :disabled="filterOrgUnitId === 'all' || loadingResponsibleUsers"
                  @update:model-value="filterAndLoad"
                >
                  <SelectTrigger id="ventanilla-filter-assigned-user">
                    <SelectValue :placeholder="filterOrgUnitId === 'all' ? 'Seleccione un área' : 'Todos'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todos
                    </SelectItem>
                    <SelectItem
                      v-for="user in responsibleUsers"
                      :key="user.id"
                      :value="String(user.id)"
                    >
                      {{ user.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1">
                <Label for="ventanilla-filter-requires-response" class="text-xs text-muted-foreground">
                  Requiere respuesta
                </Label>
                <Select v-model="filterRequiresResponse" @update:model-value="filterAndLoad">
                  <SelectTrigger id="ventanilla-filter-requires-response">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todos
                    </SelectItem>
                    <SelectItem value="yes">
                      Sí
                    </SelectItem>
                    <SelectItem value="no">
                      No
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1 md:col-span-2 xl:col-span-2">
                <Label class="text-xs text-muted-foreground">
                  Metadato archivístico
                </Label>
                <div class="grid gap-2 sm:grid-cols-2">
                  <Select v-model="filterMetadataFieldCode">
                    <SelectTrigger>
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Sin filtro por metadato
                      </SelectItem>
                      <SelectItem
                        v-for="field in searchableMetadataFields"
                        :key="field.code"
                        :value="field.code"
                      >
                        {{ field.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    v-model="filterMetadataValue"
                    :disabled="filterMetadataFieldCode === 'none'"
                    placeholder="Valor a buscar…"
                    @keyup.enter="filterAndLoad"
                  />
                </div>
                <p
                  v-if="searchableMetadataFields.length === 0"
                  class="text-xs text-muted-foreground"
                >
                  No hay campos marcados como buscables en esquemas de metadatos activos.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <p v-if="errorMessage" class="text-destructive mt-2 text-sm">
          {{ errorMessage }}
        </p>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-8 text-center text-muted-foreground text-sm">
          Cargando…
        </div>
        <Table v-else-if="filings.length">
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Tipo funcional</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Área responsable</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>SLA radicado</TableHead>
              <TableHead>Etapa workflow</TableHead>
              <TableHead>SLA etapa</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in filings"
              :key="row.id"
              class="cursor-pointer"
              @click="router.push(`/ventanilla/${row.id}`)"
            >
              <TableCell class="font-mono text-xs">
                {{ row.filing_number }}
              </TableCell>
              <TableCell>
                {{ VENTANILLA_FILING_TYPE_LABELS[row.filing_type] }}
              </TableCell>
              <TableCell>
                {{ functionalLabel(row) }}
              </TableCell>
              <TableCell class="max-w-[240px] truncate">
                {{ row.subject }}
              </TableCell>
              <TableCell class="max-w-[180px] truncate text-xs text-muted-foreground">
                {{ row.org_unit_responsible?.code }} — {{ row.org_unit_responsible?.name }}
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ row.filed_at ? new Date(row.filed_at).toLocaleString('es-CO') : '—' }}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {{ statusLabel(row.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <VentanillaTrafficLightBadge
                  :status="row.traffic_light_status"
                  :requires-response="row.requires_response"
                />
              </TableCell>
              <TableCell class="max-w-[140px] truncate text-xs">
                {{ workflowStageLabel(row) }}
              </TableCell>
              <TableCell>
                <VentanillaTrafficLightBadge
                  v-if="row.workflow?.open_task?.traffic_light_status"
                  :status="row.workflow.open_task.traffic_light_status"
                />
                <span v-else class="text-muted-foreground text-xs">—</span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" @click.stop="router.push(`/ventanilla/${row.id}`)">
                  Ver
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-else class="py-8 text-center text-muted-foreground text-sm">
          No hay radicados registrados.
        </p>
        <div
          v-if="!loading && pagination.total > 0"
          class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p class="text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
            · {{ pagination.total }} radicado{{ pagination.total === 1 ? '' : 's' }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="goToPage(pagination.current_page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="goToPage(pagination.current_page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
