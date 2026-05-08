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

interface SegmentDef {
  key: string
  label: string
  description: string
}

interface SegmentCell {
  avg_days: number | null
  sample_count: number
}

interface DemoraRow {
  sucursal: {
    id: number
    name: string
    code?: string | null
  }
  by_segment: Record<string, SegmentCell>
}

interface PromedioDemoraResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
    }
    segments: SegmentDef[]
    rows: DemoraRow[]
    totals: {
      by_segment: Record<string, SegmentCell>
    }
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loading = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<PromedioDemoraResponse['data'] | null>(null)
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

function formatDays(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function segmentCell(row: DemoraRow, key: string): SegmentCell {
  return row.by_segment?.[key] ?? { avg_days: null, sample_count: 0 }
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
    const res = await $api<PromedioDemoraResponse>('/reports/promedio-demora-etapas', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    console.error('Error cargando reporte promedio demora:', error)
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
    const base = `reporte-promedio-demora-${stamp}`
    if (format === 'xlsx') {
      await downloadReportFile(
        '/reports/promedio-demora-etapas/export',
        q,
        `${base}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toast.success('Archivo Excel descargado')
    } else {
      await downloadReportFile(
        '/reports/promedio-demora-etapas/export',
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
        Promedio de demora
      </h2>
      <p class="text-sm text-muted-foreground">
        Días promedio entre etapas del flujo de radicación (marcas de trazabilidad), por sucursal. Solo se incluyen radicaciones creadas en el rango; «N» es la cantidad de tramos completados observados en esa sucursal.
      </p>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1.5">
          <CardTitle>Filtros y vista previa</CardTitle>
          <CardDescription>
            Exportación Excel o PDF con la misma rejilla.
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
                id="reportes-demora-dates"
                label="Rango (fecha de creación de la radicación)"
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
              <Label for="report-demora-sucursal">Sucursal de la radicación</Label>
              <Select
                :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                :disabled="loadingSucursales"
                @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
              >
                <SelectTrigger id="report-demora-sucursal" class="w-full">
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
            se actualiza al cambiar fechas o sucursal. Los días usan fracción según horas entre eventos.
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <p v-if="rangeSummaryText" class="text-sm text-muted-foreground">
            Período del reporte: <span class="font-medium text-foreground">{{ rangeSummaryText }}</span>
          </p>

          <div v-if="reportData.segments.length" class="rounded-lg border bg-card px-4 py-3">
            <p class="text-xs font-medium text-foreground">
              Definición de etapas
            </p>
            <ul class="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li v-for="seg in reportData.segments" :key="seg.key">
                <span class="font-medium text-foreground">{{ seg.label }}:</span>
                {{ seg.description }}
              </li>
            </ul>
          </div>

          <div class="overflow-hidden rounded-lg border">
            <div class="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead rowspan="2" class="min-w-[160px] align-bottom">
                      Sucursal
                    </TableHead>
                    <TableHead
                      v-for="seg in reportData.segments"
                      :key="`h1-${seg.key}`"
                      colspan="2"
                      class="border-l text-center"
                    >
                      {{ seg.label }}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <template v-for="seg in reportData.segments" :key="`h2-${seg.key}`">
                      <TableHead class="border-l text-right text-xs font-normal">
                        Ø días
                      </TableHead>
                      <TableHead class="text-right text-xs font-normal">
                        N
                      </TableHead>
                    </template>
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
                    <template v-for="seg in reportData.segments" :key="`${row.sucursal.id}-${seg.key}`">
                      <TableCell class="border-l text-right tabular-nums">
                        {{ formatDays(segmentCell(row, seg.key).avg_days) }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums text-muted-foreground">
                        {{ segmentCell(row, seg.key).sample_count }}
                      </TableCell>
                    </template>
                  </TableRow>
                  <TableRow class="bg-muted/50 font-medium">
                    <TableCell>Totales</TableCell>
                    <template v-for="seg in reportData.segments" :key="`tot-${seg.key}`">
                      <TableCell class="border-l text-right tabular-nums">
                        {{ formatDays(reportData.totals.by_segment[seg.key]?.avg_days) }}
                      </TableCell>
                      <TableCell class="text-right tabular-nums">
                        {{ reportData.totals.by_segment[seg.key]?.sample_count ?? 0 }}
                      </TableCell>
                    </template>
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
