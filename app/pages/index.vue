<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
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
  '#d97706',
  '#16a34a',
  '#dc2626',
] as const

definePageMeta({
  middleware: 'permission',
  permissions: 'dashboard_ver',
})

interface CreditSummaryRow {
  id: number
  code: string | null
  status: string
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

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const summaryLoading = ref(true)
const summary = ref<CreditSummaryData | null>(null)

/** Se rellena en `onMounted` con el día actual (local) para no mezclar TZ en SSR. */
const filterDateFrom = ref('')
const filterDateTo = ref('')

function localTodayYmd(): string {
  return today(getLocalTimeZone()).toString()
}

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
  return Boolean(filterDateFrom.value?.trim()) || Boolean(filterDateTo.value?.trim())
})

const isTodayOnlyRange = computed(() => {
  const f = filterDateFrom.value?.trim()
  const t = filterDateTo.value?.trim()
  if (!f || !t || f !== t || !import.meta.client) {
    return false
  }
  return f === localTodayYmd()
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
  else if (isTodayOnlyRange.value) {
    filtro = 'Mostrando solo solicitudes creadas en la fecha de hoy.'
  }
  else {
    filtro = 'Filtro de fechas activo según el rango seleccionado.'
  }
  return `${t.toLocaleString('es-CO')} radicaciones · ${m} solicitados en total. ${filtro}`
})

const skipDateFilterWatch = ref(false)
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
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from) {
    q.created_from = from
  }
  if (to) {
    q.created_to = to
  }
  return q
}

async function fetchSummary() {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
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

watch([filterDateFrom, filterDateTo], () => {
  if (skipDateFilterWatch.value)
    return
  if (summaryDateDebounce)
    clearTimeout(summaryDateDebounce)
  summaryDateDebounce = setTimeout(() => {
    summaryDateDebounce = null
    fetchSummary()
  }, 400)
})

function clearDateFilters() {
  if (summaryDateDebounce) {
    clearTimeout(summaryDateDebounce)
    summaryDateDebounce = null
  }
  skipDateFilterWatch.value = true
  filterDateFrom.value = ''
  filterDateTo.value = ''
  nextTick(() => {
    skipDateFilterWatch.value = false
    fetchSummary()
  })
}

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
  const ymd = localTodayYmd()
  skipDateFilterWatch.value = true
  filterDateFrom.value = ymd
  filterDateTo.value = ymd
  nextTick(() => {
    skipDateFilterWatch.value = false
  })
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
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-2xl font-bold tracking-tight">
        Dashboard
      </h2>
      <div class="flex max-w-full flex-wrap items-center justify-end gap-2">
        <PermissionGate permission="radicacion_ver">
          <Button variant="outline" size="default" class="h-10 gap-2 px-4 text-sm" as-child>
            <NuxtLink to="/radicacion">
              <Icon name="i-lucide-file-text" class="size-4 shrink-0" />
              Radicación
            </NuxtLink>
          </Button>
        </PermissionGate>
        <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar']">
          <Button variant="outline" size="default" class="h-10 gap-2 px-4 text-sm" as-child>
            <NuxtLink to="/radicacion/nueva">
              <Icon name="i-lucide-plus" class="size-4 shrink-0" />
              Nueva
            </NuxtLink>
          </Button>
        </PermissionGate>
        <PermissionGate permission="solicitantes_ver">
          <Button variant="outline" size="default" class="h-10 gap-2 px-4 text-sm" as-child>
            <NuxtLink to="/solicitantes">
              <Icon name="i-lucide-user-check" class="size-4 shrink-0" />
              Solicitantes
            </NuxtLink>
          </Button>
        </PermissionGate>
        <PermissionGate permission="plantillas_ver">
          <Button variant="outline" size="default" class="h-10 gap-2 px-4 text-sm" as-child>
            <NuxtLink to="/parametrizacion/plantillas">
              <Icon name="i-lucide-layout-template" class="size-4 shrink-0" />
              Plantillas
            </NuxtLink>
          </Button>
        </PermissionGate>
      </div>
    </div>

    <main class="@container/main flex flex-1 flex-col gap-5">
      <Card class="shadow-sm">
        
        <CardContent class="space-y-5 px-5 pb-6">
          <div class="rounded-xl border bg-muted/30 px-4 py-4">
            <div
              class="mx-auto flex w-full max-w-3xl flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              <div class="w-full min-w-0 sm:max-w-md sm:flex-1">
                <DateRangeStringPicker
                  id="dash-credit-dates"
                  v-model:from="filterDateFrom"
                  v-model:to="filterDateTo"
                />
              </div>
              <div class="flex shrink-0 items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  class="h-11 min-w-[8rem] px-4"
                  :disabled="!hasActiveDateFilters"
                  @click="clearDateFilters"
                >
                  Limpiar fechas
                </Button>
              </div>
            </div>
          </div>

          <div v-if="summaryLoading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
          </div>

          <template v-else-if="summary">
            <Tabs default-value="indicadores" class="w-full">
              <TabsList class="grid h-auto w-full grid-cols-1 gap-1.5 p-1.5 @sm/main:grid-cols-3">
                <TabsTrigger value="indicadores" class="gap-2 px-3 py-3 text-sm @sm/main:text-base">
                  <Icon name="i-lucide-layout-dashboard" class="size-4 shrink-0 opacity-70" />
                  Indicadores
                </TabsTrigger>
                <TabsTrigger value="distribucion" class="gap-2 px-3 py-3 text-sm @sm/main:text-base">
                  <Icon name="i-lucide-chart-pie" class="size-4 shrink-0 opacity-70" />
                  Distribución
                </TabsTrigger>
                <TabsTrigger value="recientes" class="gap-2 px-3 py-3 text-sm @sm/main:text-base">
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
                            :key="`donut-${summary.total}-${filterDateFrom}-${filterDateTo}`"
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
                            :key="`pie-${summary.total}-${filterDateFrom}-${filterDateTo}`"
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
                            :key="`bar-${summary.total}-${filterDateFrom}-${filterDateTo}`"
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
                              {{ getCreditApplicationStatusLabel(row.status) }}
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
        </CardContent>
      </Card>
    </main>
  </div>
</template>
