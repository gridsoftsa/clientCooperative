<script setup lang="ts">
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
  ventanillaFilingRowClass,
  ventanillaFilingStatusBadgeVariant,
} from '~/constants/ventanilla'
import type {
  VentanillaCatalogData,
  VentanillaFilingSummary,
  VentanillaFunctionalTypeRow,
  VentanillaResponsibleUserRow,
  VentanillaTrafficLightValue,
} from '~/types/ventanilla'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'

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
const route = useRoute()
const ventanillaApi = useVentanillaApi()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const {
  open: inlinePreviewOpen,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  presentBlob,
} = useInlineFilePreview()
const openingResponseFileId = ref<number | null>(null)

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
const pagination = ref({ current_page: 1, last_page: 1, per_page: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const exportingMetadata = ref(false)
const responseDialogOpen = ref(false)
const responseDialogFiling = ref<VentanillaFilingSummary | null>(null)
let dateFilterDebounce: ReturnType<typeof setTimeout> | null = null

const searchableMetadataFields = computed(
  () => catalog.value?.searchable_metadata_fields ?? [],
)

const canCreate = computed(() =>
  hasPermission('ventanilla_crear')
  || hasPermission('ventanilla_crear_entrada')
  || hasPermission('ventanilla_crear_salida')
  || hasPermission('ventanilla_crear_interna'),
)
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
  const trafficFromQuery = String(route.query.traffic_light_status ?? '')
  if (trafficFromQuery === 'green' || trafficFromQuery === 'orange' || trafficFromQuery === 'red') {
    filterTrafficLight.value = trafficFromQuery
  }

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

  if (row.status === 'voided' || workflow.instance_status === 'cancelled') {
    return 'Proceso anulado'
  }

  if (workflow.instance_status === 'completed') {
    return 'Proceso completado'
  }

  if (workflow.open_task?.stage_name) {
    return workflow.open_task.stage_name
  }

  if (workflow.current_stage_name) {
    return workflow.current_stage_name
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
  const nextPage = Math.min(Math.max(page, 1), Math.max(1, pagination.value.last_page))
  if (nextPage === pagination.value.current_page) {
    return
  }
  pagination.value.current_page = nextPage
  loadList()
}

function changePerPage(size: number) {
  pagination.value.per_page = size
  pagination.value.current_page = 1
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

function hasOfficialResponse(row: VentanillaFilingSummary): boolean {
  return row.status === 'closed' && Boolean(row.response_text?.trim())
}

function openResponseDialog(row: VentanillaFilingSummary): void {
  responseDialogFiling.value = row
  responseDialogOpen.value = true
}

async function viewResponseFile(fileId: number): Promise<void> {
  const filing = responseDialogFiling.value
  const file = filing?.response_files?.find(item => item.id === fileId)

  if (!filing || !file || !hasPermission('ventanilla_archivos_ver')) {
    return
  }

  openingResponseFileId.value = fileId

  try {
    const blob = await ventanillaApi.fetchFilingFileBlob(filing.id, file.id)
    presentBlob(blob, file.original_name || file.title || 'documento', file.mime_type)
  }
  catch {
    errorMessage.value = 'No se pudo abrir el documento de la respuesta.'
  }
  finally {
    openingResponseFileId.value = null
  }
}

function formatListDate(value?: string | null): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatListTime(value?: string | null): string {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-w-0 space-y-6 p-4 md:p-6">
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

    <Card class="min-w-0 overflow-hidden">
      <CardHeader class="pb-3">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 xl:flex-row xl:flex-wrap xl:items-end">
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
                  <SelectItem
                    v-for="(label, key) in VENTANILLA_TRAFFIC_LIGHT_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
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
      <CardContent class="min-w-0 overflow-hidden">
        <div v-if="loading" class="py-8 text-center text-muted-foreground text-sm">
          Cargando…
        </div>
        <div v-else-if="filings.length" class="min-w-0 overflow-x-hidden">
        <Table class="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead class="w-[8.5rem]">
                Radicado
              </TableHead>
              <TableHead>
                Asunto
              </TableHead>
              <TableHead class="w-[12rem]">
                Área
              </TableHead>
              <TableHead class="w-[7.5rem]">
                Estado
              </TableHead>
              <TableHead class="w-[8.5rem]">
                SLA
              </TableHead>
              <TableHead class="w-[9.5rem]">
                Workflow
              </TableHead>
              <TableHead class="w-[5.75rem] text-right">
                <span class="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in filings"
              :key="row.id"
              class="cursor-pointer"
              :class="ventanillaFilingRowClass(row.status, row.traffic_light_status, row.requires_response)"
              @click="router.push(`/ventanilla/${row.id}`)"
            >
              <TableCell class="align-top whitespace-normal">
                <div class="min-w-0 space-y-1">
                  <p class="truncate font-mono text-xs font-medium">
                    {{ row.filing_number }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ VENTANILLA_FILING_TYPE_LABELS[row.filing_type] }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="align-top whitespace-normal">
                <div class="min-w-0 space-y-1">
                  <p class="truncate text-xs text-muted-foreground">
                    {{ functionalLabel(row) }}
                  </p>
                  <p class="truncate font-medium" :title="row.subject">
                    {{ row.subject }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="align-top whitespace-normal">
                <p
                  class="truncate text-xs text-muted-foreground"
                  :title="`${row.org_unit_responsible?.code ?? ''} — ${row.org_unit_responsible?.name ?? ''}`"
                >
                  {{ row.org_unit_responsible?.code }} — {{ row.org_unit_responsible?.name }}
                </p>
              </TableCell>
              <TableCell class="align-top whitespace-normal">
                <div class="space-y-1">
                  <Badge :variant="ventanillaFilingStatusBadgeVariant(row.status)">
                    {{ statusLabel(row.status) }}
                  </Badge>
                  <p class="text-xs leading-tight text-muted-foreground">
                    {{ formatListDate(row.filed_at) }}
                    <span class="block">{{ formatListTime(row.filed_at) }}</span>
                  </p>
                </div>
              </TableCell>
              <TableCell class="align-middle whitespace-normal py-3">
                <span v-if="row.status === 'voided'" class="text-xs text-muted-foreground">
                  SLA anulado
                </span>
                <VentanillaSlaProgressBar
                  v-else-if="row.requires_response && row.sla_business_days"
                  dense
                  :sla-business-days="row.sla_business_days"
                  :elapsed-business-days="row.sla_elapsed_business_days"
                />
                <VentanillaTrafficLightBadge
                  v-else
                  :status="row.traffic_light_status"
                  :requires-response="row.requires_response"
                />
              </TableCell>
              <TableCell class="align-top whitespace-normal">
                <div class="min-w-0 space-y-1">
                  <p class="truncate text-xs" :title="workflowStageLabel(row)">
                    {{ workflowStageLabel(row) }}
                  </p>
                  <span v-if="row.status === 'voided'" class="text-xs text-muted-foreground">
                    —
                  </span>
                  <VentanillaTrafficLightBadge
                    v-else-if="row.workflow?.open_task?.traffic_light_status"
                    :status="row.workflow.open_task.traffic_light_status"
                  />
                  <span v-else class="text-muted-foreground text-xs">—</span>
                </div>
              </TableCell>
              <TableCell class="whitespace-normal text-right">
                <div class="flex items-center justify-end gap-0.5" @click.stop>
                  <Button
                    v-if="hasOfficialResponse(row)"
                    variant="outline"
                    size="icon"
                    class="size-8"
                    title="Ver respuesta"
                    @click="openResponseDialog(row)"
                  >
                    <Icon name="i-lucide-message-square-reply" class="size-4" />
                    <span class="sr-only">Ver respuesta</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    title="Ver radicado"
                    @click="router.push(`/ventanilla/${row.id}`)"
                  >
                    <Icon name="i-lucide-eye" class="size-4" />
                    <span class="sr-only">Ver</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
        <p v-else class="py-8 text-center text-muted-foreground text-sm">
          No hay radicados registrados.
        </p>
        <ListPaginationBar
          v-if="pagination.total > 0"
          class="mt-4"
          :page="pagination.current_page"
          :last-page="pagination.last_page"
          :per-page="pagination.per_page"
          :total="pagination.total"
          item-label="radicados"
          :loading="loading"
          @update:page="goToPage"
          @update:per-page="changePerPage"
        />
      </CardContent>
    </Card>

    <Dialog v-model:open="responseDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Respuesta del radicado</DialogTitle>
          <DialogDescription>
            {{ responseDialogFiling?.filing_number }}
            <template v-if="responseDialogFiling?.subject">
              · {{ responseDialogFiling.subject }}
            </template>
          </DialogDescription>
        </DialogHeader>
        <VentanillaOfficialResponse
          v-if="responseDialogFiling?.response_text"
          :response-text="responseDialogFiling.response_text"
          :closed-at="responseDialogFiling.closed_at"
          :files="responseDialogFiling.response_files"
          @view-file="viewResponseFile"
        />
        <DialogFooter>
          <Button variant="outline" @click="responseDialogOpen = false">
            Cerrar
          </Button>
          <Button
            v-if="responseDialogFiling"
            @click="router.push(`/ventanilla/${responseDialogFiling.id}`)"
          >
            Abrir radicado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
  </div>
</template>
