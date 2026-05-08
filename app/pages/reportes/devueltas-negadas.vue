<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: 'permission',
  permissions: 'reportes_ver',
})

interface SucursalCatalogItem {
  id: number
  name: string
  code?: string | null
}

interface PeriodColumn {
  key: string
  label: string
}

interface SeguimientoPeriodCell {
  tramitadas: number
  devueltas: number
  correcciones: number
  negadas: number
  error_pct: number | null
  mejoro_pct: number | null
}

interface SeguimientoRow {
  sucursal: {
    id: number
    name: string
    code?: string | null
  }
  by_period: Record<string, SeguimientoPeriodCell>
  totals: {
    tramitadas: number
    devueltas: number
    correcciones: number
    negadas: number
    error_pct: number | null
  }
}

interface DevueltasNegadasResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
    }
    periods: PeriodColumn[]
    rows: SeguimientoRow[]
    totals: {
      by_period: Record<string, SeguimientoPeriodCell>
      grand: {
        tramitadas: number
        devueltas: number
        correcciones: number
        negadas: number
        error_pct: number | null
      }
    }
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loading = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<DevueltasNegadasResponse['data'] | null>(null)
const sucursales = ref<SucursalCatalogItem[]>([])

const sucursalesSorted = computed(() => {
  return [...sucursales.value].sort((a, b) =>
    a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' }),
  )
})

const filterDateFrom = ref('')
const filterDateTo = ref('')
const sucursalId = ref<number | null>(null)

const skipDateFilterWatch = ref(false)
let reportDateDebounce: ReturnType<typeof setTimeout> | null = null

function defaultRangeStartOfYear(): { from: string, to: string } {
  const t = today(getLocalTimeZone())
  return {
    from: `${t.year}-01-01`,
    to: `${t.year}-12-31`,
  }
}

function pctLabel(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }
  return `${value}%`
}

function periodCell(row: SeguimientoRow, periodKey: string): SeguimientoPeriodCell {
  return row.by_period?.[periodKey] ?? {
    tramitadas: 0,
    devueltas: 0,
    correcciones: 0,
    negadas: 0,
    error_pct: null,
    mejoro_pct: null,
  }
}

const hasActiveDateFilters = computed(() => {
  return Boolean(filterDateFrom.value?.trim()) || Boolean(filterDateTo.value?.trim())
})

const rangeSummaryText = computed(() => {
  if (!reportData.value?.filters) {
    return ''
  }
  const { created_from: from, created_to: to } = reportData.value.filters
  try {
    const df = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
    return `${df.format(new Date(`${from}T12:00:00`))} – ${df.format(new Date(`${to}T12:00:00`))}`
  } catch {
    return `${from} – ${to}`
  }
})

function buildReportQuery(): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from) {
    q.created_from = from
  }
  if (to) {
    q.created_to = to
  }
  if (sucursalId.value != null) {
    q.sucursal_id = sucursalId.value
  }
  return q
}

async function fetchSucursales(): Promise<void> {
  loadingSucursales.value = true
  try {
    const res = await $api<{ data: SucursalCatalogItem[] }>('/catalogs/sucursales')
    sucursales.value = res.data ?? []
  } catch (error: any) {
    console.error('Error cargando sucursales para reportes:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el catálogo de sucursales')
  } finally {
    loadingSucursales.value = false
  }
}

function assertValidDateRangeForExport(): boolean {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return false
  }
  return true
}

async function fetchReport(): Promise<void> {
  if (!assertValidDateRangeForExport()) {
    return
  }

  loading.value = true
  try {
    const res = await $api<DevueltasNegadasResponse>('/reports/devueltas-negadas-seguimiento', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    console.error('Error cargando reporte devueltas/negadas:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el reporte')
    reportData.value = null
  } finally {
    loading.value = false
  }
}

async function exportReport(format: 'xlsx' | 'pdf'): Promise<void> {
  if (!assertValidDateRangeForExport()) {
    return
  }
  const busy = format === 'xlsx' ? exportingXlsx : exportingPdf
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    const q = { ...buildReportQuery(), format }
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `reporte-devueltas-negadas-${stamp}`
    if (format === 'xlsx') {
      await downloadReportFile(
        '/reports/devueltas-negadas-seguimiento/export',
        q,
        `${base}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toast.success('Archivo Excel descargado')
    } else {
      await downloadReportFile(
        '/reports/devueltas-negadas-seguimiento/export',
        q,
        `${base}.pdf`,
        'application/pdf',
      )
      toast.success('Archivo PDF descargado')
    }
  } catch (e: unknown) {
    console.error('Error exportando reporte:', e)
    toast.error(e instanceof Error ? e.message : 'No se pudo generar el archivo')
  } finally {
    busy.value = false
  }
}

watch([filterDateFrom, filterDateTo], () => {
  if (skipDateFilterWatch.value) {
    return
  }
  if (reportDateDebounce) {
    clearTimeout(reportDateDebounce)
  }
  reportDateDebounce = setTimeout(() => {
    reportDateDebounce = null
    fetchReport()
  }, 400)
})

watch(sucursalId, () => {
  fetchReport()
})

function clearDateFilters() {
  if (reportDateDebounce) {
    clearTimeout(reportDateDebounce)
    reportDateDebounce = null
  }
  skipDateFilterWatch.value = true
  filterDateFrom.value = ''
  filterDateTo.value = ''
  nextTick(() => {
    skipDateFilterWatch.value = false
    fetchReport()
  })
}

onMounted(async () => {
  const { from, to } = defaultRangeStartOfYear()
  skipDateFilterWatch.value = true
  filterDateFrom.value = from
  filterDateTo.value = to
  nextTick(() => {
    skipDateFilterWatch.value = false
  })
  await fetchSucursales()
  await fetchReport()
})

onUnmounted(() => {
  if (reportDateDebounce) {
    clearTimeout(reportDateDebounce)
    reportDateDebounce = null
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" class="w-fit gap-2 px-2 text-muted-foreground" as-child>
        <NuxtLink to="/reportes">
          <Icon name="i-lucide-arrow-left" class="size-4" />
          Todos los reportes
        </NuxtLink>
      </Button>
    </div>

    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Devueltas y negadas
      </h2>
      <p class="text-sm text-muted-foreground">
        Por mes de creación de la radicación y sucursal: tramitadas, devoluciones registradas, reenvíos tras corrección, negadas por director de crédito, porcentaje de error y comparación con el mes anterior (misma sucursal).
      </p>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1.5">
          <CardTitle>Filtros y vista previa</CardTitle>
          <CardDescription>
            Seis columnas por cada mes del rango; fila de totales al pie.
          </CardDescription>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingXlsx"
            @click="exportReport('xlsx')"
          >
            <Icon
              :name="exportingXlsx ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
              class="size-4"
              :class="{ 'animate-spin': exportingXlsx }"
            />
            {{ exportingXlsx ? 'Generando…' : 'Excel' }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingPdf"
            @click="exportReport('pdf')"
          >
            <Icon
              :name="exportingPdf ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
              class="size-4"
              :class="{ 'animate-spin': exportingPdf }"
            />
            {{ exportingPdf ? 'Generando…' : 'PDF' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-xl border bg-muted/30 px-4 py-4">
          <div class="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <div class="min-w-0 flex-1 lg:max-w-xl">
              <DateRangeStringPicker
                id="reportes-dev-neg-dates"
                label="Rango (fecha de generación de la radicación)"
                v-model:from="filterDateFrom"
                v-model:to="filterDateTo"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              class="h-10 w-full shrink-0 px-4 sm:w-auto lg:w-auto"
              :disabled="!hasActiveDateFilters"
              @click="clearDateFilters"
            >
              Limpiar fechas
            </Button>
            <div class="w-full space-y-1.5 lg:w-72 lg:shrink-0">
              <Label for="report-dev-neg-sucursal">Sucursal de la radicación</Label>
              <Select
                :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                :disabled="loadingSucursales"
                @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
              >
                <SelectTrigger id="report-dev-neg-sucursal" class="w-full">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todas las sucursales
                  </SelectItem>
                  <SelectItem
                    v-for="s in sucursalesSorted"
                    :key="s.id"
                    :value="String(s.id)"
                  >
                    {{ s.name }}{{ s.code ? ` (${s.code})` : '' }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            <span class="font-medium text-foreground">Vista previa:</span>
            se actualiza al cambiar fechas o sucursal. % error = (devueltas + correcciones) / tramitadas. Mejoró = % error del mes − % error del mes calendario previo.
          </p>
          <p class="mt-2 text-xs text-muted-foreground">
            Sin fechas, el servidor usa el año calendario actual. Las métricas provienen de la trazabilidad de eventos de cada radicación.
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <p v-if="rangeSummaryText" class="text-sm text-muted-foreground">
            Período del reporte: <span class="font-medium text-foreground">{{ rangeSummaryText }}</span>
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Tramitadas (rango)</CardDescription>
                <CardTitle class="text-3xl">{{ reportData.totals.grand.tramitadas }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Devueltas (suma meses)</CardDescription>
                <CardTitle class="text-3xl">{{ reportData.totals.grand.devueltas }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Correcciones (suma meses)</CardDescription>
                <CardTitle class="text-3xl">{{ reportData.totals.grand.correcciones }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>% error global (rango)</CardDescription>
                <CardTitle class="text-3xl">{{ pctLabel(reportData.totals.grand.error_pct) }}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div v-if="reportData.periods.length === 0" class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            El rango no incluye ningún mes calendario.
          </div>
          <div v-else class="overflow-hidden rounded-lg border">
            <div class="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead rowspan="2" class="min-w-[160px] align-bottom">
                      Sucursal
                    </TableHead>
                    <TableHead
                      v-for="p in reportData.periods"
                      :key="`h1-${p.key}`"
                      colspan="6"
                      class="border-l text-center"
                    >
                      {{ p.label }}
                    </TableHead>
                    <TableHead colspan="5" class="min-w-[200px] border-l text-center">
                      Total en el rango
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <template v-for="p in reportData.periods" :key="`h2-${p.key}`">
                      <TableHead class="border-l text-right text-xs font-normal">
                        Tram.
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        Dev.
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        Corr.
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        Neg.
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        % err.
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        Mejoró
                      </TableHead>
                    </template>
                    <TableHead class="border-l text-right text-xs font-normal">
                      Tram.
                    </TableHead>
                    <TableHead class="text-right text-xs font-normal">
                      Dev.
                    </TableHead>
                    <TableHead class="text-right text-xs font-normal">
                      Corr.
                    </TableHead>
                    <TableHead class="text-right text-xs font-normal">
                      Neg.
                    </TableHead>
                    <TableHead class="text-right text-xs font-normal">
                      % err.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="row in reportData.rows"
                    :key="row.sucursal.id"
                  >
                    <TableCell class="align-top">
                      <div class="font-medium">
                        {{ row.sucursal.name }}
                      </div>
                      <div v-if="row.sucursal.code" class="text-xs text-muted-foreground">
                        {{ row.sucursal.code }}
                      </div>
                    </TableCell>
                    <template v-for="p in reportData.periods" :key="`${row.sucursal.id}-${p.key}`">
                      <TableCell class="border-l text-right tabular-nums">
                        {{ periodCell(row, p.key).tramitadas }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ periodCell(row, p.key).devueltas }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ periodCell(row, p.key).correcciones }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ periodCell(row, p.key).negadas }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ pctLabel(periodCell(row, p.key).error_pct) }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ pctLabel(periodCell(row, p.key).mejoro_pct) }}
                      </TableCell>
                    </template>
                    <TableCell class="border-l text-right tabular-nums font-medium">
                      {{ row.totals.tramitadas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ row.totals.devueltas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ row.totals.correcciones }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ row.totals.negadas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ pctLabel(row.totals.error_pct) }}
                    </TableCell>
                  </TableRow>
                  <TableRow class="bg-muted/50 font-medium">
                    <TableCell>Totales</TableCell>
                    <template v-for="p in reportData.periods" :key="`tot-${p.key}`">
                      <TableCell class="border-l text-right tabular-nums">
                        {{ reportData.totals.by_period[p.key]?.tramitadas ?? 0 }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ reportData.totals.by_period[p.key]?.devueltas ?? 0 }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ reportData.totals.by_period[p.key]?.correcciones ?? 0 }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ reportData.totals.by_period[p.key]?.negadas ?? 0 }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ pctLabel(reportData.totals.by_period[p.key]?.error_pct) }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ pctLabel(reportData.totals.by_period[p.key]?.mejoro_pct) }}
                      </TableCell>
                    </template>
                    <TableCell class="border-l text-right tabular-nums">
                      {{ reportData.totals.grand.tramitadas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ reportData.totals.grand.devueltas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ reportData.totals.grand.correcciones }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ reportData.totals.grand.negadas }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ pctLabel(reportData.totals.grand.error_pct) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
