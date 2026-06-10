<script setup lang="ts">
import { toast } from 'vue-sonner'
import { BarChart } from '~/components/ui/chart-bar'
import { DonutChart } from '~/components/ui/chart-donut'
import { LineChart } from '~/components/ui/chart-line'
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
} from '~/constants/ventanilla'
import type {
  VentanillaCatalogData,
  VentanillaSlaComplianceDashboardData,
} from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_ver',
})

interface OrgUnitOption {
  id: number
  name: string
  code: string | null
}

const TRAFFIC_LIGHT_CHART_COLORS = ['#16a34a', '#d97706', '#dc2626'] as const

const api = useVentanillaApi()
const { $api } = useNuxtApp()

const loading = ref(true)
const exporting = ref(false)
const errorMessage = ref('')
const data = ref<VentanillaSlaComplianceDashboardData | null>(null)
const catalog = ref<VentanillaCatalogData | null>(null)
const orgUnits = ref<OrgUnitOption[]>([])

const filterOrgUnitId = ref('all')
const filterFunctionalType = ref('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')

let filterDebounce: ReturnType<typeof setTimeout> | null = null

const trafficLightChartData = computed(() => {
  if (!data.value) {
    return []
  }

  return [
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.green, cantidad: data.value.by_traffic_light.green },
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.orange, cantidad: data.value.by_traffic_light.orange },
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.red, cantidad: data.value.by_traffic_light.red },
  ].filter((row) => row.cantidad > 0)
})

const filingStatusChartData = computed(() => {
  if (!data.value) {
    return []
  }

  return [
    { label: VENTANILLA_FILING_STATUS_LABELS.registered, cantidad: data.value.by_filing_status.registered },
    { label: VENTANILLA_FILING_STATUS_LABELS.in_progress, cantidad: data.value.by_filing_status.in_progress },
    { label: VENTANILLA_FILING_STATUS_LABELS.closed, cantidad: data.value.by_filing_status.closed },
  ].filter((row) => row.cantidad > 0)
})

const complianceTrendChartData = computed(() => {
  if (!data.value) {
    return []
  }

  return data.value.compliance_trend.map((row) => ({
    periodo: row.period,
    cumplimiento: row.compliance_rate ?? 0,
  }))
})

const chartNumberFormatter = (n: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

const chartPercentFormatter = (tick: number | Date) => {
  const n = tick instanceof Date ? tick.getTime() : tick
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n)} %`
}

const chartAxisYFormatter = (tick: number | Date) => {
  const n = tick instanceof Date ? tick.getTime() : tick
  return chartNumberFormatter(n)
}

const summaryLine = computed(() => {
  if (!data.value) {
    return ''
  }

  const k = data.value.kpis
  const sla = k.average_sla_business_days != null
    ? `${k.average_sla_business_days} día(s) hábil(es) de SLA promedio`
    : 'Sin SLA promedio en el alcance'
  const response = k.average_response_business_days != null
    ? `${k.average_response_business_days} día(s) hábil(es) promedio de respuesta`
    : 'Sin cierres con respuesta en el alcance'

  return `${k.total.toLocaleString('es-CO')} radicados con obligación de respuesta. ${sla}. ${response}.`
})

function buildQuery(): Record<string, string> {
  const query: Record<string, string> = {}
  if (filterOrgUnitId.value !== 'all') {
    query.org_unit_responsible_id = filterOrgUnitId.value
  }
  if (filterFunctionalType.value !== 'all') {
    query.functional_type_key = filterFunctionalType.value
  }
  if (filterDateFrom.value) {
    query.filed_from = filterDateFrom.value
  }
  if (filterDateTo.value) {
    query.filed_to = filterDateTo.value
  }

  return query
}

async function loadDashboard() {
  if (filterDateFrom.value && filterDateTo.value && filterDateFrom.value > filterDateTo.value) {
    errorMessage.value = 'La fecha inicial no puede ser posterior a la fecha final'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await api.fetchSlaDashboard(buildQuery())
  } catch {
    errorMessage.value = 'No se pudo cargar el dashboard de cumplimiento SLA'
    data.value = null
  } finally {
    loading.value = false
  }
}

async function exportDashboard() {
  exporting.value = true
  try {
    await api.downloadSlaDashboardExport(buildQuery())
    toast.success('Exportación descargada')
  } catch {
    toast.error('No se pudo exportar el dashboard')
  } finally {
    exporting.value = false
  }
}

function scheduleReload() {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
  }
  filterDebounce = setTimeout(() => {
    filterDebounce = null
    loadDashboard()
  }, 400)
}

watch([filterOrgUnitId, filterFunctionalType, filterDateFrom, filterDateTo], scheduleReload)

onMounted(async () => {
  try {
    const [catalogData, orgUnitsRes] = await Promise.all([
      api.fetchCatalog().catch(() => null),
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

  await loadDashboard()
})

onUnmounted(() => {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
    filterDebounce = null
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Cumplimiento SLA
        </h1>
        <p class="text-muted-foreground text-sm">
          Monitoreo gerencial de tiempos de respuesta (HU-11C)
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" as-child>
          <NuxtLink to="/ventanilla">
            <Icon name="lucide:list" class="mr-1 size-4" />
            Radicados
          </NuxtLink>
        </Button>
        <Button variant="outline" :disabled="loading || exporting" @click="exportDashboard">
          <Icon
            :name="exporting ? 'lucide:loader-2' : 'lucide:download'"
            class="mr-1 size-4"
            :class="{ 'animate-spin': exporting }"
          />
          Exportar CSV
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="space-y-2">
          <Label>Área responsable</Label>
          <Select v-model="filterOrgUnitId">
            <SelectTrigger>
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas las áreas
              </SelectItem>
              <SelectItem v-for="unit in orgUnits" :key="unit.id" :value="String(unit.id)">
                {{ unit.code }} — {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label>Tipo funcional</Label>
          <Select v-model="filterFunctionalType">
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos los tipos
              </SelectItem>
              <SelectItem
                v-for="type in catalog?.functional_types ?? []"
                :key="type.key"
                :value="type.key"
              >
                {{ type.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2 md:col-span-2">
          <Label>Rango de radicación</Label>
          <DateRangeStringPicker
            id="ventanilla-sla-dashboard-dates"
            v-model:from="filterDateFrom"
            v-model:to="filterDateTo"
          />
        </div>
      </CardContent>
    </Card>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="lucide:loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <template v-else-if="data">
      <p class="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed">
        {{ summaryLine }}
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Total radicados</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ data.kpis.total }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>En término (abiertos)</CardDescription>
            <CardTitle class="text-3xl tabular-nums text-emerald-700 dark:text-emerald-400">
              {{ data.kpis.green }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Próximo a vencer</CardDescription>
            <CardTitle class="text-3xl tabular-nums text-amber-700 dark:text-amber-400">
              {{ data.kpis.orange }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Vencidos (abiertos)</CardDescription>
            <CardTitle class="text-3xl tabular-nums text-red-700 dark:text-red-400">
              {{ data.kpis.red }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Cerrados en término</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ data.kpis.closed_on_time }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Cerrados fuera de término</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ data.kpis.closed_late }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>SLA promedio</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ data.kpis.average_sla_business_days ?? '—' }}
            </CardTitle>
            <p class="text-muted-foreground text-xs">
              Días hábiles configurados
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="space-y-1 px-4 py-4">
            <CardDescription>Respuesta promedio</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ data.kpis.average_response_business_days ?? '—' }}
            </CardTitle>
            <p class="text-muted-foreground text-xs">
              Días hábiles hasta cierre con respuesta
            </p>
          </CardHeader>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por semáforo</CardTitle>
            <CardDescription>
              Abiertos en vivo + cerrados según resultado de cierre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly>
              <DonutChart
                v-if="trafficLightChartData.length"
                class="h-72 min-h-[18rem]"
                :data="trafficLightChartData"
                index="label"
                category="cantidad"
                :colors="[...TRAFFIC_LIGHT_CHART_COLORS]"
                :value-formatter="chartNumberFormatter"
              />
              <p v-else class="text-muted-foreground py-12 text-center text-sm">
                Sin datos en el alcance actual.
              </p>
            </ClientOnly>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por estado de gestión</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientOnly>
              <BarChart
                v-if="filingStatusChartData.length"
                class="min-h-[280px] h-[320px]"
                :data="filingStatusChartData"
                index="label"
                :categories="['cantidad']"
                :colors="['#2563eb']"
                :y-formatter="chartAxisYFormatter"
                :rounded-corners="6"
                :show-legend="false"
              />
              <p v-else class="text-muted-foreground py-12 text-center text-sm">
                Sin datos en el alcance actual.
              </p>
            </ClientOnly>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de cumplimiento</CardTitle>
          <CardDescription>
            Porcentaje de cierres en término por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientOnly>
            <LineChart
              v-if="complianceTrendChartData.length"
              class="min-h-[280px] h-[320px]"
              :data="complianceTrendChartData"
              index="periodo"
              :categories="['cumplimiento']"
              :colors="['#16a34a']"
              :y-formatter="chartPercentFormatter"
              :show-legend="false"
            />
            <p v-else class="text-muted-foreground py-12 text-center text-sm">
              Aún no hay cierres con resultado de SLA en el alcance.
            </p>
          </ClientOnly>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
