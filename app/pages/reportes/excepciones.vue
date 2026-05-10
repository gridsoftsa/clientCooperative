<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'
import {
  REPORT_CONSOLIDATION_MODE_OPTIONS,
  REPORT_MODE_CONSOLIDATED,
  REPORT_MODE_DETAIL,
  type ReportConsolidationMode,
} from '~/constants/report-consolidation-mode'
import { formatPesosConSimboloDesdeTexto } from '~/composables/usePesosFormat'

definePageMeta({
  middleware: 'permission',
  permissions: 'reportes_ver',
})

interface SucursalCatalogItem {
  id: number
  name: string
  code?: string | null
}

interface SucursalBlock {
  name?: string
  code?: string | null
}

interface ActorBlock {
  name?: string
  email?: string | null
}

interface ByStatusRow {
  status: string
  label: string
  count: number
}

interface ExcepcionesDetailRow {
  code: string
  numero_radicado_externo?: string | null
  amount_requested: string
  sucursal: SucursalBlock | null
  status_label: string
  justification_parts: string[]
  decision_at_local?: string | null
  actor: ActorBlock | null
}

interface ExcepcionesResponse {
  data: {
    report: string
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
      mode: string
    }
    methodology_note: string
    summary?: {
      total: number
      by_status_rows?: ByStatusRow[]
    }
    rows?: ExcepcionesDetailRow[]
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loading = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<ExcepcionesResponse['data'] | null>(null)
const sucursales = ref<SucursalCatalogItem[]>([])

const reportMode = ref<ReportConsolidationMode>(REPORT_MODE_CONSOLIDATED)

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

const isConsolidated = computed(() => reportData.value?.filters?.mode === REPORT_MODE_CONSOLIDATED)

function sucursalLabel(su: SucursalBlock | null | undefined): string {
  if (!su?.name) {
    return '—'
  }
  return su.code ? `${su.name} (${su.code})` : su.name
}

function buildReportQuery(): Record<string, string | number> {
  const q: Record<string, string | number> = { mode: reportMode.value }
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

function assertValidDateRange(): boolean {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return false
  }
  return true
}

async function exportReport(format: 'xlsx' | 'pdf'): Promise<void> {
  if (!assertValidDateRange()) {
    return
  }
  const busy = format === 'xlsx' ? exportingXlsx : exportingPdf
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    const q: Record<string, string | number> = { ...buildReportQuery(), format }
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `reporte-excepciones-${stamp}`
    if (format === 'xlsx') {
      await downloadReportFile(
        '/reports/excepciones/export',
        q,
        `${base}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toast.success('Archivo Excel descargado')
    } else {
      await downloadReportFile(
        '/reports/excepciones/export',
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

async function fetchReport(): Promise<void> {
  if (!assertValidDateRange()) {
    return
  }

  loading.value = true
  try {
    const res = await $api<ExcepcionesResponse>('/reports/excepciones', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    console.error('Error cargando reporte:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el reporte')
    reportData.value = null
  } finally {
    loading.value = false
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
        Excepciones
      </h2>
      <p class="text-sm text-muted-foreground">
        Radicaciones con excepción «Sí» en la decisión del director de crédito. Consolidado por estado actual o detalle con justificación, fecha y usuario.
      </p>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1">
          <CardTitle>Filtros y vista</CardTitle>
          <CardDescription>
            Período por <code class="rounded bg-muted px-1 py-0.5 text-[11px]">created_at</code> de la radicación.
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
        <div class="rounded-xl border bg-muted/30 px-4 py-5 sm:px-5">
          <div class="flex flex-col gap-5">
            <div
              class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,min(100%,28rem))_auto] md:items-end md:gap-4"
            >
              <DateRangeStringPicker
                id="reportes-excepciones-dates"
                label="Período (fecha de creación de la radicación)"
                v-model:from="filterDateFrom"
                v-model:to="filterDateTo"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-9 shrink-0 justify-self-start whitespace-nowrap px-3 text-sm"
                :disabled="!hasActiveDateFilters"
                @click="clearDateFilters"
              >
                Limpiar fechas
              </Button>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-2xl">
              <div class="min-w-0 space-y-1.5">
                <Label for="report-excepciones-sucursal">Sucursal de la radicación</Label>
                <Select
                  :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                  :disabled="loadingSucursales"
                  @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
                >
                  <SelectTrigger id="report-excepciones-sucursal" class="w-full">
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
              <div class="min-w-0 space-y-1.5">
                <Label for="report-excepciones-mode">Tipo de informe</Label>
                <Select
                  :model-value="reportMode"
                  @update:model-value="reportMode = $event as ReportConsolidationMode"
                >
                  <SelectTrigger id="report-excepciones-mode" class="w-full">
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
          </div>
          <p class="mt-4 text-xs text-muted-foreground">
            Sin fechas, el servidor usa el año calendario actual.
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <p v-if="rangeSummaryText" class="text-sm text-muted-foreground">
            Período: <span class="font-medium text-foreground">{{ rangeSummaryText }}</span>
          </p>

          <template v-if="isConsolidated && reportData.summary">
            <div class="grid gap-3 sm:grid-cols-2">
              <Card class="border-primary/20 bg-primary/5">
                <CardHeader class="space-y-1 px-4 py-4">
                  <CardDescription>Total con excepción</CardDescription>
                  <CardTitle class="text-3xl tabular-nums">
                    {{ reportData.summary.total }}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            <div v-if="!(reportData.summary.by_status_rows?.length)" class="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No hay registros en el período y filtros.
            </div>
            <div v-else class="overflow-hidden rounded-lg border">
              <div class="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead class="min-w-[200px]">
                        Estado actual
                      </TableHead>
                      <TableHead class="min-w-[100px] text-right">
                        Cantidad
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="br in reportData.summary.by_status_rows"
                      :key="br.status"
                    >
                      <TableCell class="align-top">
                        {{ br.label }}
                      </TableCell>
                      <TableCell class="align-top text-right tabular-nums">
                        {{ br.count }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </template>

          <template v-else-if="reportData.filters?.mode === REPORT_MODE_DETAIL">
            <div v-if="!reportData.rows?.length" class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No hay radicaciones con excepción en el período y filtros.
            </div>
            <div v-else class="overflow-hidden rounded-lg border">
              <div class="max-h-[65vh] overflow-auto">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead class="min-w-[110px]">
                        Código
                      </TableHead>
                      <TableHead class="min-w-[110px]">
                        Radicado
                      </TableHead>
                      <TableHead class="min-w-[100px] text-right">
                        Monto
                      </TableHead>
                      <TableHead class="min-w-[130px]">
                        Sucursal
                      </TableHead>
                      <TableHead class="min-w-[140px]">
                        Estado
                      </TableHead>
                      <TableHead class="min-w-[200px]">
                        Justificación
                      </TableHead>
                      <TableHead class="min-w-[130px]">
                        Fecha referencia
                      </TableHead>
                      <TableHead class="min-w-[140px]">
                        Usuario
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, idx) in reportData.rows"
                      :key="`${row.code}-${idx}`"
                    >
                      <TableCell class="align-top font-medium text-sm">
                        {{ row.code }}
                      </TableCell>
                      <TableCell class="align-top text-sm">
                        {{ row.numero_radicado_externo ?? '—' }}
                      </TableCell>
                      <TableCell class="align-top text-right tabular-nums text-sm">
                        {{ formatPesosConSimboloDesdeTexto(row.amount_requested) }}
                      </TableCell>
                      <TableCell class="align-top text-sm">
                        {{ sucursalLabel(row.sucursal) }}
                      </TableCell>
                      <TableCell class="align-top text-sm">
                        {{ row.status_label }}
                      </TableCell>
                      <TableCell class="align-top text-sm">
                        <ul v-if="row.justification_parts?.length" class="list-disc space-y-1 pl-4">
                          <li v-for="(p, j) in row.justification_parts" :key="j">
                            {{ p }}
                          </li>
                        </ul>
                        <span v-else>—</span>
                      </TableCell>
                      <TableCell class="align-top text-sm tabular-nums">
                        {{ row.decision_at_local ?? '—' }}
                      </TableCell>
                      <TableCell class="align-top text-sm">
                        <div>{{ row.actor?.name ?? '—' }}</div>
                        <div v-if="row.actor?.email" class="text-xs text-muted-foreground">
                          {{ row.actor.email }}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </template>

          <p class="text-xs text-muted-foreground leading-relaxed border-t pt-4">
            {{ reportData.methodology_note }}
          </p>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
