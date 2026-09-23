<script setup lang="ts">
import { toast } from 'vue-sonner'
import { BarChart } from '~/components/ui/chart-bar'
import { DonutChart } from '~/components/ui/chart-donut'
import {
  creditApplicationStatusOrder,
  getCreditApplicationStatusBadgeVariant,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

/** Colores alineados con la gravedad del flujo (Unovis / CSS hex). */
const STATUS_CHART_COLORS = [
  '#64748b',
  '#2563eb',
  '#7c3aed',
  '#d97706',
  '#16a34a',
  '#dc2626',
] as const

interface CreditSummaryRow {
  id: number
  code: string | null
  status: string
  skip_next_director_review?: boolean
  resubmit_to_analyst_after_return?: boolean
  amount_requested: string
  created_at: string | null
  sucursal: { id: number; name: string; code: string | null } | null
}

interface CreditSummaryData {
  filters: {
    created_from: string | null
    created_to: string | null
    sucursal_id: number | null
  }
  total: number
  amount_requested_sum: string
  by_status: Record<string, number>
  recent: CreditSummaryRow[]
}

const props = defineProps<{
  dateFrom: string
  dateTo: string
}>()

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const summaryLoading = ref(true)
const summary = ref<CreditSummaryData | null>(null)

const applicantsTotal = ref<number | null>(null)

const statusChartData = computed(() => {
  if (!summary.value) {
    return []
  }
  return creditApplicationStatusOrder.map(st => ({
    estado: getCreditApplicationStatusLabel(st),
    cantidad: summary.value!.by_status[st] ?? 0,
  }))
})

/** Una serie por estado (solo el índice activo tiene valor); permite barras apiladas con color por estado. */
const statusBarStackedData = computed(() => {
  if (!summary.value) {
    return []
  }
  return creditApplicationStatusOrder.map((st, rowIdx) => {
    const row: Record<string, string | number> = {
      estado: getCreditApplicationStatusLabel(st),
    }
    for (let j = 0; j < creditApplicationStatusOrder.length; j++) {
      const stKey = creditApplicationStatusOrder[j]!
      const key = `s${j}`
      row[key] = rowIdx === j ? (summary.value!.by_status[stKey] ?? 0) : 0
    }
    return row
  })
})

const statusBarStackCategories = computed(() =>
  creditApplicationStatusOrder.map((_, j) => `s${j}` as const),
)

const chartNumberFormatter = (n: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

const chartAxisYFormatter = (tick: number | Date) => {
  const n = tick instanceof Date ? tick.getTime() : tick
  return chartNumberFormatter(n)
}

const hasActiveDateFilters = computed(() => {
  return Boolean(props.dateFrom?.trim()) || Boolean(props.dateTo?.trim())
})

/** Texto breve para la pestaña Indicadores (vista de primera mano). */
const indicadoresResumenLine = computed(() => {
  if (!summary.value) {
    return ''
  }
  const t = summary.value.total
  const m = formatCurrency(Number(summary.value.amount_requested_sum))
  let filtro: string
  if (!hasActiveDateFilters.value) {
    filtro = 'Sin filtro de fechas: incluye todas las solicitudes visibles para tu perfil.'
  }
  else {
    filtro = 'Filtro de fechas activo según el periodo seleccionado.'
  }
  return `${t.toLocaleString('es-CO')} radicaciones · ${m} solicitados en total. ${filtro}`
})

const skipDateFilterWatch = ref(true)
let summaryDateDebounce: ReturnType<typeof setTimeout> | null = null

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatShortDate(iso: string | null) {
  if (!iso) {
    return '—'
  }
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function buildSummaryQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  const from = props.dateFrom?.trim()
  const to = props.dateTo?.trim()
  if (from) {
    q.created_from = from
  }
  if (to) {
    q.created_to = to
  }
  return q
}

async function fetchSummary() {
  const from = props.dateFrom?.trim()
  const to = props.dateTo?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return
  }

  summaryLoading.value = true
  try {
    const res = await $api<{ data: CreditSummaryData }>('/dashboard/credit-summary', {
      query: buildSummaryQuery(),
    })
    summary.value = res.data
  } catch (e: any) {
    console.error('Error cargando resumen:', e)
    toast.error(e?.data?.message ?? 'No se pudo cargar el resumen de radicación')
    summary.value = null
  } finally {
    summaryLoading.value = false
  }
}

watch(
  () => [props.dateFrom, props.dateTo],
  () => {
    if (skipDateFilterWatch.value) {
      return
    }
    if (summaryDateDebounce) {
      clearTimeout(summaryDateDebounce)
    }
    summaryDateDebounce = setTimeout(() => {
      summaryDateDebounce = null
      fetchSummary()
    }, 400)
  },
)

async function fetchApplicantsCount() {
  if (!hasPermission('solicitantes_ver')) {
    return
  }
  try {
    const res = await $api<{ meta: { total: number } }>('/applicants', { query: { per_page: 1 } })
    applicantsTotal.value = res.meta?.total ?? 0
  } catch {
    applicantsTotal.value = null
  }
}

onMounted(() => {
  skipDateFilterWatch.value = false
  fetchSummary()
  fetchApplicantsCount()
})

onUnmounted(() => {
  if (summaryDateDebounce) {
    clearTimeout(summaryDateDebounce)
    summaryDateDebounce = null
  }
})
</script>

<template>
  <section class="@container/main flex w-full flex-col gap-4">
    <div v-if="summaryLoading" class="flex justify-center py-10">
      <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <template v-else-if="summary">
      <Tabs default-value="indicadores" class="w-full">
        <TabsList class="grid h-auto w-full grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-3">
          <TabsTrigger value="indicadores" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-layout-dashboard" class="size-4 shrink-0 opacity-70" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="distribucion" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-chart-pie" class="size-4 shrink-0 opacity-70" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="recientes" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-history" class="size-4 shrink-0 opacity-70" />
            Últimas solicitudes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" class="mt-5 space-y-4 outline-none">
          <p class="text-balance rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
            {{ indicadoresResumenLine }}
          </p>
          <div class="grid grid-cols-1 gap-3 @md/main:grid-cols-2 @lg/main:grid-cols-4">
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription class="text-sm leading-tight">
                  Radicaciones
                </CardDescription>
                <CardTitle class="text-3xl font-semibold tabular-nums leading-none @lg/main:text-4xl">
                  {{ summary.total }}
                </CardTitle>
                <p class="text-xs leading-snug text-muted-foreground">
                  En el alcance del filtro o todas las visibles.
                </p>
              </CardHeader>
            </Card>
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription class="text-sm leading-tight">
                  Monto solicitado
                </CardDescription>
                <CardTitle class="text-2xl font-semibold tabular-nums leading-tight @lg/main:text-3xl">
                  {{ formatCurrency(Number(summary.amount_requested_sum)) }}
                </CardTitle>
                <p class="text-xs leading-snug text-muted-foreground">
                  Suma de montos en el mismo alcance.
                </p>
              </CardHeader>
            </Card>
            <Card v-if="applicantsTotal !== null" class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription class="text-sm leading-tight">
                  Solicitantes
                </CardDescription>
                <CardTitle class="text-3xl font-semibold tabular-nums leading-none @lg/main:text-4xl">
                  {{ applicantsTotal }}
                </CardTitle>
                <p class="text-xs leading-snug text-muted-foreground">
                  Total en el catálogo de solicitantes.
                </p>
              </CardHeader>
            </Card>
          </div>
          <p class="text-sm leading-snug text-muted-foreground">
            Usa las pestañas <span class="font-medium text-foreground/80">Distribución</span> para gráficos por estado y
            <span class="font-medium text-foreground/80">Últimas solicitudes</span> para el detalle reciente.
          </p>
        </TabsContent>

        <TabsContent value="distribucion" class="mt-5 space-y-3 outline-none">
          <p class="text-sm leading-relaxed text-muted-foreground">
            Conteo de radicaciones por estado según el mismo alcance y fechas de arriba.
          </p>
          <div class="rounded-xl border border-dashed bg-muted/10">
            <div class="p-4">
              <ClientOnly>
                <template #fallback>
                  <div class="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/20">
                    <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
                  </div>
                </template>
                <Tabs default-value="donut" class="w-full">
                  <TabsList class="mx-auto grid h-10 w-full max-w-lg grid-cols-3 gap-1 p-1">
                    <TabsTrigger value="donut" class="text-sm">
                      Dona
                    </TabsTrigger>
                    <TabsTrigger value="pie" class="text-sm">
                      Pastel
                    </TabsTrigger>
                    <TabsTrigger value="bar" class="text-sm">
                      Barras
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="donut" class="mt-4 outline-none">
                    <DonutChart
                      :key="`donut-${summary.total}-${dateFrom}-${dateTo}`"
                      class="h-72 min-h-[18rem]"
                      :data="statusChartData"
                      index="estado"
                      category="cantidad"
                      :colors="[...STATUS_CHART_COLORS]"
                      :value-formatter="chartNumberFormatter"
                      :show-legend="true"
                    />
                  </TabsContent>
                  <TabsContent value="pie" class="mt-4 outline-none">
                    <DonutChart
                      :key="`pie-${summary.total}-${dateFrom}-${dateTo}`"
                      class="h-72 min-h-[18rem]"
                      type="pie"
                      :data="statusChartData"
                      index="estado"
                      category="cantidad"
                      :colors="[...STATUS_CHART_COLORS]"
                      :value-formatter="chartNumberFormatter"
                      :show-legend="true"
                    />
                  </TabsContent>
                  <TabsContent value="bar" class="mt-4 outline-none">
                    <BarChart
                      :key="`bar-${summary.total}-${dateFrom}-${dateTo}`"
                      class="min-h-[280px] h-[320px]"
                      type="stacked"
                      :data="statusBarStackedData"
                      index="estado"
                      :categories="[...statusBarStackCategories]"
                      :colors="[...STATUS_CHART_COLORS]"
                      :y-formatter="chartAxisYFormatter"
                      :rounded-corners="6"
                      :show-legend="false"
                      :margin="{ top: 12, bottom: 12, left: 12, right: 12 }"
                    />
                  </TabsContent>
                </Tabs>
              </ClientOnly>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recientes" class="mt-5 space-y-3 outline-none">
          <p class="text-sm leading-relaxed text-muted-foreground">
            Solicitudes más recientes en el alcance actual (mismas fechas y permisos que el resumen).
          </p>
          <div v-if="summary.recent.length === 0" class="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            No hay solicitudes en este alcance.
          </div>
          <div
            v-else
            class="overflow-hidden rounded-lg border"
          >
            <div class="max-h-[min(420px,55vh)] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow class="hover:bg-transparent">
                    <TableHead class="h-10 whitespace-nowrap px-3 py-2 text-sm font-medium">
                      Código
                    </TableHead>
                    <TableHead class="h-10 whitespace-nowrap px-3 py-2 text-sm font-medium">
                      Sucursal
                    </TableHead>
                    <TableHead class="h-10 whitespace-nowrap px-3 py-2 text-sm font-medium">
                      Monto
                    </TableHead>
                    <TableHead class="h-10 whitespace-nowrap px-3 py-2 text-sm font-medium">
                      Estado
                    </TableHead>
                    <TableHead class="h-10 whitespace-nowrap px-3 py-2 text-sm font-medium">
                      Creada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in summary.recent" :key="row.id" class="hover:bg-muted/40">
                    <TableCell class="px-3 py-2.5 font-mono text-sm">
                      {{ row.code ?? '—' }}
                    </TableCell>
                    <TableCell class="max-w-[10rem] truncate px-3 py-2.5 text-sm @lg/main:max-w-[14rem]">
                      {{ row.sucursal?.name ?? '—' }}
                    </TableCell>
                    <TableCell class="whitespace-nowrap px-3 py-2.5 text-sm tabular-nums">
                      {{ formatCurrency(Number(row.amount_requested)) }}
                    </TableCell>
                    <TableCell class="px-3 py-2">
                      <Badge
                        :variant="getCreditApplicationStatusBadgeVariant(row.status)"
                        class="px-2 py-0.5 text-xs font-normal leading-tight"
                      >
                        {{ getCreditApplicationStatusLabel(row.status, {
                          skipNextDirectorReview: row.skip_next_director_review,
                          resubmitToAnalystAfterReturn: row.resubmit_to_analyst_after_return,
                        }) }}
                      </Badge>
                    </TableCell>
                    <TableCell class="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
                      {{ formatShortDate(row.created_at) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </template>
  </section>
</template>

