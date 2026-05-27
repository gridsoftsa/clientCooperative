<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'
import {
  REPORT_CONSOLIDATION_MODE_OPTIONS,
  REPORT_MODE_CONSOLIDATED,
  REPORT_MODE_DETAIL,
  type ReportConsolidationMode,
} from '~/constants/report-consolidation-mode'

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

interface PeriodCellData {
  count: number
  amount_sum: string
}

interface TramitadasRow {
  sucursal: {
    id: number
    name: string
    code?: string | null
  }
  by_period: Record<string, PeriodCellData>
  total_count: number
  total_amount_sum: string
}

interface TramitadasResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
      mode: ReportConsolidationMode
    }
    periods: PeriodColumn[]
    rows: TramitadasRow[]
    totals: {
      count: number
      amount_sum: string
    }
    detail_rows?: Array<{
      code: string | null
      numero_radicado_externo: string | null
      status: string
      status_label: string
      amount_requested: string
      created_at_local: string | null
      sucursal: { id: number, name: string, code?: string | null } | null
      adviser: { id: number, name: string, email?: string | null } | null
      debtor: { name?: string | null, document_number?: string | null } | null
    }>
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loading = ref(false)
const exportingTramitadasXlsx = ref(false)
const exportingTramitadasPdf = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<TramitadasResponse['data'] | null>(null)
const sucursales = ref<SucursalCatalogItem[]>([])

/** Lista ordenada por nombre para el selector (primera opción: todas). */
const sucursalesSorted = computed(() => {
  return [...sucursales.value].sort((a, b) =>
    a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' }),
  )
})

const filterDateFrom = ref('')
const filterDateTo = ref('')
const sucursalId = ref<number | null>(null)
const reportMode = ref<ReportConsolidationMode>(REPORT_MODE_CONSOLIDATED)

const skipDateFilterWatch = ref(false)
let reportDateDebounce: ReturnType<typeof setTimeout> | null = null

function defaultRangeStartOfYear(): { from: string, to: string } {
  const t = today(getLocalTimeZone())
  return {
    from: `${t.year}-01-01`,
    to: `${t.year}-12-31`,
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function amountFromString(value: string | number | null | undefined): number {
  if (value == null) {
    return 0
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function periodCell(row: TramitadasRow, periodKey: string): PeriodCellData {
  return row.by_period?.[periodKey] ?? { count: 0, amount_sum: '0' }
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
  q.mode = reportMode.value
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
    const res = await $api<TramitadasResponse>('/reports/tramitadas-by-sucursal', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    console.error('Error cargando reporte de tramitadas:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el reporte')
    reportData.value = null
  } finally {
    loading.value = false
  }
}

async function exportTramitadasBySucursal(format: 'xlsx' | 'pdf'): Promise<void> {
  if (!assertValidDateRangeForExport()) {
    return
  }
  const busy = format === 'xlsx' ? exportingTramitadasXlsx : exportingTramitadasPdf
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    const q = { ...buildReportQuery(), format }
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `reporte-tramitadas-sucursal-${stamp}`
    if (format === 'xlsx') {
      await downloadReportFile(
        '/reports/tramitadas-by-sucursal/export',
        q,
        `${base}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toast.success('Archivo Excel descargado')
    } else {
      await downloadReportFile(
        '/reports/tramitadas-by-sucursal/export',
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

watch(reportMode, () => {
  fetchReport()
})

function onReportModeChange(value: unknown): void {
  reportMode.value = String(value) === REPORT_MODE_DETAIL ? REPORT_MODE_DETAIL : REPORT_MODE_CONSOLIDATED
}

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
        Solicitudes tramitadas por sucursal
      </h2>
      <p class="text-sm text-muted-foreground">
        Entre fechas: cantidad de radicaciones generadas y suma de los montos solicitados en cada una, agrupados por mes calendario y por sucursal en que quedó registrada la radicación. Elija una sucursal o todas.
      </p>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1.5">
          <CardTitle>Filtros y vista previa</CardTitle>
          <CardDescription>
            Columnas por mes que caen en el rango; totales al final de cada fila (sucursal).
          </CardDescription>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingTramitadasXlsx"
            @click="exportTramitadasBySucursal('xlsx')"
          >
            <Icon
              :name="exportingTramitadasXlsx ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
              class="size-4"
              :class="{ 'animate-spin': exportingTramitadasXlsx }"
            />
            {{ exportingTramitadasXlsx ? 'Generando…' : 'Excel' }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingTramitadasPdf"
            @click="exportTramitadasBySucursal('pdf')"
          >
            <Icon
              :name="exportingTramitadasPdf ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
              class="size-4"
              :class="{ 'animate-spin': exportingTramitadasPdf }"
            />
            {{ exportingTramitadasPdf ? 'Generando…' : 'PDF' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-xl border bg-muted/30 px-4 py-4">
          <div class="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <div class="min-w-0 flex-1 lg:max-w-xl">
              <DateRangeStringPicker
                id="reportes-tramitadas-dates"
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
              <Label for="report-sucursal">Sucursal de la radicación</Label>
              <Select
                :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                :disabled="loadingSucursales"
                @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
              >
                <SelectTrigger id="report-sucursal" class="w-full">
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
            <div class="w-full space-y-1.5 lg:w-64 lg:shrink-0">
              <Label for="report-mode">Vista</Label>
              <Select
                :model-value="reportMode"
                @update:model-value="onReportModeChange"
              >
                <SelectTrigger id="report-mode" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in REPORT_CONSOLIDATION_MODE_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            <span class="font-medium text-foreground">Vista previa:</span>
            se actualiza sola al cambiar fechas o sucursal (tras un breve momento al escribir fechas). No hay otro botón para generarla.
          </p>
          <p class="mt-2 text-xs text-muted-foreground">
            Sin fechas, el servidor usa el año calendario actual. Criterio: día en que se generó la radicación (<code class="rounded bg-muted px-1 py-0.5 text-[11px]">created_at</code>).
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <p v-if="rangeSummaryText" class="text-sm text-muted-foreground">
            Período del reporte: <span class="font-medium text-foreground">{{ rangeSummaryText }}</span>
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Total radicaciones</CardDescription>
                <CardTitle class="text-3xl">{{ reportData.totals.count }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Suma montos solicitados</CardDescription>
                <CardTitle class="text-2xl">{{ formatCurrency(amountFromString(reportData.totals.amount_sum)) }}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div
            v-if="reportMode === REPORT_MODE_CONSOLIDATED && reportData.periods.length === 0"
            class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
          >
            El rango no incluye ningún mes calendario.
          </div>
          <div v-else-if="reportMode === REPORT_MODE_CONSOLIDATED" class="overflow-hidden rounded-lg border">
            <div class="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead class="min-w-[200px]">
                      Sucursal
                    </TableHead>
                    <TableHead
                      v-for="p in reportData.periods"
                      :key="p.key"
                      class="min-w-[128px]"
                    >
                      {{ p.label }}
                    </TableHead>
                    <TableHead class="min-w-[150px]">
                      Total
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
                    <TableCell
                      v-for="p in reportData.periods"
                      :key="`${row.sucursal.id}-${p.key}`"
                      class="align-top"
                    >
                      <div class="text-sm font-medium">
                        {{ periodCell(row, p.key).count }} radicaciones
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {{ formatCurrency(amountFromString(periodCell(row, p.key).amount_sum)) }}
                      </div>
                    </TableCell>
                    <TableCell class="align-top">
                      <div class="text-sm font-medium">
                        {{ row.total_count }} radicaciones
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {{ formatCurrency(amountFromString(row.total_amount_sum)) }}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <div v-else class="overflow-hidden rounded-lg border">
            <div class="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Rad. externo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Deudor</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Fecha creación</TableHead>
                    <TableHead class="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="row in reportData.detail_rows ?? []"
                    :key="`${row.code}-${row.created_at_local}`"
                  >
                    <TableCell class="font-mono text-xs">{{ row.code ?? '—' }}</TableCell>
                    <TableCell>{{ row.numero_radicado_externo || '—' }}</TableCell>
                    <TableCell>{{ row.status_label }}</TableCell>
                    <TableCell>
                      <div>{{ row.debtor?.name || '—' }}</div>
                      <div v-if="row.debtor?.document_number" class="text-xs text-muted-foreground">
                        {{ row.debtor.document_number }}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{{ row.adviser?.name || '—' }}</div>
                      <div v-if="row.adviser?.email" class="text-xs text-muted-foreground">
                        {{ row.adviser.email }}
                      </div>
                    </TableCell>
                    <TableCell>{{ row.sucursal?.name || '—' }}</TableCell>
                    <TableCell>{{ row.created_at_local || '—' }}</TableCell>
                    <TableCell class="text-right">{{ formatCurrency(amountFromString(row.amount_requested)) }}</TableCell>
                  </TableRow>
                  <TableRow v-if="(reportData.detail_rows ?? []).length === 0">
                    <TableCell colspan="8" class="text-center text-muted-foreground py-8">
                      No hay radicaciones para los filtros actuales.
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
