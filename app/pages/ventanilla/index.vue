<script setup lang="ts">
import {
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
} from '~/constants/ventanilla'
import type {
  VentanillaCatalogData,
  VentanillaFilingSummary,
  VentanillaFunctionalTypeRow,
  VentanillaTrafficLightValue,
} from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_ver',
})

const router = useRouter()
const ventanillaApi = useVentanillaApi()
const { hasPermission } = usePermissions()

const filings = ref<VentanillaFilingSummary[]>([])
const catalog = ref<VentanillaCatalogData | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const filterType = ref('all')
const filterFunctionalType = ref('all')
const filterTrafficLight = ref('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const pagination = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })

const canCreate = computed(() => hasPermission('ventanilla_crear'))
const canClassify = computed(() => hasPermission('ventanilla_clasificar'))
const hasActiveFilters = computed(() =>
  search.value.trim()
  || filterType.value !== 'all'
  || filterFunctionalType.value !== 'all'
  || filterTrafficLight.value !== 'all'
  || filterDateFrom.value
  || filterDateTo.value,
)

async function loadList() {
  if (filterDateFrom.value && filterDateTo.value && filterDateFrom.value > filterDateTo.value) {
    errorMessage.value = 'La fecha inicial no puede ser posterior a la fecha final'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const query: Record<string, string | number> = {
      page: pagination.value.current_page,
      per_page: pagination.value.per_page,
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
    if (filterDateFrom.value) {
      query.filed_from = filterDateFrom.value
    }
    if (filterDateTo.value) {
      query.filed_to = filterDateTo.value
    }
    const res = await ventanillaApi.fetchFilings(query)
    filings.value = res.data ?? []
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
    }
  } catch {
    errorMessage.value = 'No se pudo cargar el listado de radicados'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    catalog.value = await ventanillaApi.fetchCatalog()
  } catch {
    catalog.value = null
  }
  await loadList()
})

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
  filterDateFrom.value = ''
  filterDateTo.value = ''
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

function trafficLightLabel(status: string): string {
  if (status === 'all') {
    return 'Todos'
  }

  return VENTANILLA_TRAFFIC_LIGHT_LABELS[status as VentanillaTrafficLightValue] ?? status
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
        <Button v-if="canCreate" @click="router.push('/ventanilla/nueva')">
          <Icon name="i-lucide-plus" class="mr-2 size-4" />
          Radicar documento
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            v-model="search"
            placeholder="Buscar por número, asunto o remitente…"
            class="md:col-span-2"
            @keyup.enter="filterAndLoad"
          />
          <Select v-model="filterType" @update:model-value="filterAndLoad">
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
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
          <Select v-model="filterFunctionalType" @update:model-value="filterAndLoad">
            <SelectTrigger>
              <SelectValue placeholder="Tipo funcional" />
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
          <Select v-model="filterTrafficLight" @update:model-value="filterAndLoad">
            <SelectTrigger>
              <SelectValue placeholder="Semáforo">
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
          <Input v-model="filterDateFrom" type="date" @change="filterAndLoad" />
          <Input v-model="filterDateTo" type="date" @change="filterAndLoad" />
          <div class="flex gap-2 md:col-span-2 xl:col-span-6">
            <Button variant="secondary" :disabled="loading" @click="filterAndLoad">
              <Icon name="i-lucide-search" class="mr-2 size-4" />
              Buscar
            </Button>
            <Button v-if="hasActiveFilters" variant="ghost" :disabled="loading" @click="resetFilters">
              Limpiar filtros
            </Button>
          </div>
          <p v-if="errorMessage" class="text-destructive text-sm md:col-span-2 xl:col-span-6">
            {{ errorMessage }}
          </p>
        </div>
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
              <TableHead>SLA</TableHead>
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
                <VentanillaTrafficLightBadge :status="row.traffic_light_status" />
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
