<script setup lang="ts">
import { toast } from 'vue-sonner'
import { DonutChart } from '~/components/ui/chart-donut'
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
  ventanillaTrafficLightRowClass,
} from '~/constants/ventanilla'
import type { VentanillaHomeDashboardData, VentanillaFilingTypeValue } from '~/types/ventanilla'

const TRAFFIC_LIGHT_CHART_COLORS = ['#16a34a', '#d97706', '#dc2626'] as const
const FILING_TYPE_KEYS: VentanillaFilingTypeValue[] = ['incoming', 'outgoing', 'internal']

const props = defineProps<{
  dateFrom: string
  dateTo: string
}>()

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const router = useRouter()

const loading = ref(true)
const data = ref<VentanillaHomeDashboardData | null>(null)
let summaryDateDebounce: ReturnType<typeof setTimeout> | null = null

const trafficLightChartData = computed(() => {
  if (!data.value) {
    return []
  }

  return [
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.green, cantidad: data.value.by_traffic_light.green },
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.orange, cantidad: data.value.by_traffic_light.orange },
    { label: VENTANILLA_TRAFFIC_LIGHT_LABELS.red, cantidad: data.value.by_traffic_light.red },
  ].filter(row => row.cantidad > 0)
})

const chartNumberFormatter = (n: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

function formatShortDate(iso: string | null) {
  if (!iso) {
    return '—'
  }
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function filingTypeLabel(type: VentanillaFilingTypeValue) {
  return VENTANILLA_FILING_TYPE_LABELS[type] ?? type
}

function filingStatusLabel(status: keyof typeof VENTANILLA_FILING_STATUS_LABELS) {
  return VENTANILLA_FILING_STATUS_LABELS[status] ?? status
}

const summaryLine = computed(() => {
  if (!data.value) {
    return ''
  }

  const red = data.value.sla.red
  const pending = data.value.pending_classification
  const open = data.value.open_filings

  if (red > 0) {
    return `${red.toLocaleString('es-CO')} radicado(s) vencido(s) en abierto. ${open.toLocaleString('es-CO')} en gestión. ${pending.toLocaleString('es-CO')} pendiente(s) de clasificar.`
  }

  return `${open.toLocaleString('es-CO')} radicado(s) abiertos. ${pending.toLocaleString('es-CO')} pendiente(s) de clasificar. SLA en término: ${data.value.sla.green.toLocaleString('es-CO')}.`
})

function buildSummaryQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  const from = props.dateFrom?.trim()
  const to = props.dateTo?.trim()
  if (from) {
    q.filed_from = from
  }
  if (to) {
    q.filed_to = to
  }
  return q
}

async function loadSummary() {
  const from = props.dateFrom?.trim()
  const to = props.dateTo?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return
  }

  loading.value = true
  try {
    const res = await $api<{ data: VentanillaHomeDashboardData }>('/dashboard/ventanilla-summary', {
      query: buildSummaryQuery(),
    })
    data.value = res.data
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo cargar el dashboard de ventanilla')
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.dateFrom, props.dateTo],
  () => {
    if (summaryDateDebounce) {
      clearTimeout(summaryDateDebounce)
    }
    summaryDateDebounce = setTimeout(() => {
      summaryDateDebounce = null
      loadSummary()
    }, 400)
  },
)

onMounted(() => {
  loadSummary()
})

onUnmounted(() => {
  if (summaryDateDebounce) {
    clearTimeout(summaryDateDebounce)
    summaryDateDebounce = null
  }
})
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <template v-else-if="data">
      <Tabs default-value="semaforo" class="w-full">
        <TabsList class="grid h-auto w-full grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-3">
          <TabsTrigger value="semaforo" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-gauge" class="size-4 shrink-0 opacity-70" />
            Semáforo SLA
          </TabsTrigger>
          <TabsTrigger value="volumen" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-chart-pie" class="size-4 shrink-0 opacity-70" />
            Volumen
          </TabsTrigger>
          <TabsTrigger value="recientes" class="gap-2 px-3 py-2.5 text-sm">
            <Icon name="i-lucide-history" class="size-4 shrink-0 opacity-70" />
            Recientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="semaforo" class="mt-4 space-y-4 outline-none">
          <p class="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed">
            {{ summaryLine }}
          </p>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              class="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-left shadow-xs transition hover:bg-emerald-500/15 sm:p-5"
              @click="router.push('/ventanilla?traffic_light_status=green')"
            >
              <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {{ VENTANILLA_TRAFFIC_LIGHT_LABELS.green }}
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-4xl">
                {{ data.sla.green }}
              </p>
              <p class="mt-1 text-xs text-emerald-900/70 dark:text-emerald-200/70">
                Abiertos dentro de plazo
              </p>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left shadow-xs transition hover:bg-amber-500/15 sm:p-5"
              @click="router.push('/ventanilla?traffic_light_status=orange')"
            >
              <p class="text-sm font-medium text-amber-800 dark:text-amber-300">
                {{ VENTANILLA_TRAFFIC_LIGHT_LABELS.orange }}
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400 sm:text-4xl">
                {{ data.sla.orange }}
              </p>
              <p class="mt-1 text-xs text-amber-900/70 dark:text-amber-200/70">
                Abiertos por vencer
              </p>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-left shadow-xs transition hover:bg-red-500/15 sm:p-5"
              @click="router.push('/ventanilla?traffic_light_status=red')"
            >
              <p class="text-sm font-medium text-red-800 dark:text-red-300">
                {{ VENTANILLA_TRAFFIC_LIGHT_LABELS.red }}
              </p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-red-700 dark:text-red-400 sm:text-4xl">
                {{ data.sla.red }}
              </p>
              <p class="mt-1 text-xs text-red-900/70 dark:text-red-200/70">
                Abiertos vencidos
              </p>
            </button>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Pendientes de clasificar</CardDescription>
                <CardTitle class="text-3xl tabular-nums">
                  {{ data.pending_classification }}
                </CardTitle>
                <p class="text-xs text-muted-foreground">
                  Formulario público y canales
                </p>
              </CardHeader>
            </Card>
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Radicados abiertos</CardDescription>
                <CardTitle class="text-3xl tabular-nums">
                  {{ data.open_filings }}
                </CardTitle>
                <p class="text-xs text-muted-foreground">
                  Registrados + en gestión
                </p>
              </CardHeader>
            </Card>
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Cerrados en término</CardDescription>
                <CardTitle class="text-3xl tabular-nums text-emerald-700 dark:text-emerald-400">
                  {{ data.sla.closed_on_time }}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card class="shadow-xs">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Cerrados fuera de término</CardDescription>
                <CardTitle class="text-3xl tabular-nums text-red-700 dark:text-red-400">
                  {{ data.sla.closed_late }}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <p class="text-sm text-muted-foreground">
            El detalle gerencial de plazos está en
            <NuxtLink
              v-if="hasPermission('ventanilla_ver')"
              to="/ventanilla/cumplimiento"
              class="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Cumplimiento SLA
            </NuxtLink>
            <span v-else>Cumplimiento SLA</span>.
          </p>
        </TabsContent>

        <TabsContent value="volumen" class="mt-4 outline-none">
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card class="shadow-sm">
              <CardHeader>
                <CardTitle>Distribución SLA</CardTitle>
                <CardDescription>
                  Abiertos en vivo más cerrados según resultado de plazo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientOnly>
                  <DonutChart
                    v-if="trafficLightChartData.length"
                    class="h-64 min-h-[16rem] sm:h-72 sm:min-h-[18rem]"
                    :data="trafficLightChartData"
                    index="label"
                    category="cantidad"
                    :colors="[...TRAFFIC_LIGHT_CHART_COLORS]"
                    :value-formatter="chartNumberFormatter"
                    :show-legend="true"
                  />
                  <p v-else class="py-12 text-center text-sm text-muted-foreground">
                    Aún no hay radicados con semáforo en el alcance.
                  </p>
                </ClientOnly>
              </CardContent>
            </Card>

            <Card class="shadow-sm">
              <CardHeader>
                <CardTitle>Volumen por tipo de radicado</CardTitle>
                <CardDescription>
                  Entrada, salida e interna (sin anulados)
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div
                  v-for="type in FILING_TYPE_KEYS"
                  :key="type"
                  class="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <span class="text-sm">{{ filingTypeLabel(type) }}</span>
                  <span class="text-lg font-semibold tabular-nums">{{ data.by_filing_type[type] }}</span>
                </div>
                <div v-if="data.by_functional_type.length" class="pt-2">
                  <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tipos funcionales con más movimiento
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="row in data.by_functional_type"
                      :key="row.key"
                      class="flex items-center justify-between text-sm"
                    >
                      <span class="truncate pr-3">{{ row.label }}</span>
                      <span class="tabular-nums text-muted-foreground">{{ row.total }}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recientes" class="mt-4 outline-none">
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle>Radicados recientes</CardTitle>
              <CardDescription>
                Últimos 8 radicados vigentes, con semáforo SLA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="data.recent.length === 0" class="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No hay radicados para mostrar.
              </div>
              <div v-else class="overflow-hidden rounded-lg border">
                <div class="max-h-[min(420px,55vh)] overflow-auto">
                  <Table>
                    <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                      <TableRow class="hover:bg-transparent">
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          Número
                        </TableHead>
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          Tipo
                        </TableHead>
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          Asunto
                        </TableHead>
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          Estado
                        </TableHead>
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          SLA
                        </TableHead>
                        <TableHead class="h-10 px-3 py-2 text-sm font-medium">
                          Radicado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="row in data.recent"
                        :key="row.id"
                        class="cursor-pointer"
                        :class="ventanillaTrafficLightRowClass(row.traffic_light_status, row.requires_response)"
                        @click="hasPermission('ventanilla_ver') && router.push(`/ventanilla/${row.id}`)"
                      >
                        <TableCell class="px-3 py-2.5 font-mono text-sm">
                          {{ row.filing_number }}
                        </TableCell>
                        <TableCell class="px-3 py-2.5 text-sm">
                          {{ row.functional_type_label ?? row.functional_type_key }}
                        </TableCell>
                        <TableCell class="max-w-[16rem] truncate px-3 py-2.5 text-sm">
                          {{ row.subject }}
                        </TableCell>
                        <TableCell class="px-3 py-2.5 text-sm">
                          {{ filingStatusLabel(row.status) }}
                        </TableCell>
                        <TableCell class="px-3 py-2">
                          <VentanillaTrafficLightBadge
                            :status="row.traffic_light_status"
                            :requires-response="row.requires_response"
                          />
                        </TableCell>
                        <TableCell class="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
                          {{ formatShortDate(row.filed_at) }}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>
  </section>
</template>
