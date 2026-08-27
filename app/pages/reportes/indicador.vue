<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import {
  creditApplicationStatusReportIndicatorOptions,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

definePageMeta({
  middleware: 'permission',
  permissions: 'reportes_ver',
})

interface SucursalCatalogItem {
  id: number
  name: string
  code?: string | null
}

interface IndicadorResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
      status: string | null
    }
    total_radicadas: number
    count_reached_status: number | null
    percentage: number | null
    methodology_note: string
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loading = ref(false)
const exportingIndicadorXlsx = ref(false)
const exportingIndicadorPdf = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<IndicadorResponse['data'] | null>(null)
const sucursales = ref<SucursalCatalogItem[]>([])

const sucursalesSorted = computed(() => {
  return [...sucursales.value].sort((a, b) =>
    a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' }),
  )
})

const filterDateFrom = ref('')
const filterDateTo = ref('')
const sucursalId = ref<number | null>(null)
const selectedStatus = ref<string | null>(null)

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

const selectedStatusLabel = computed(() => {
  const s = reportData.value?.filters?.status
  if (!s) {
    return ''
  }
  return getCreditApplicationStatusLabel(s)
})

function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

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
  if (selectedStatus.value != null && selectedStatus.value !== '') {
    q.status = selectedStatus.value
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

async function exportIndicadorEstado(format: 'xlsx' | 'pdf'): Promise<void> {
  if (!assertValidDateRange()) {
    return
  }
  const busy = format === 'xlsx' ? exportingIndicadorXlsx : exportingIndicadorPdf
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    const q: Record<string, string | number> = { ...buildReportQuery(), format }
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `reporte-indicador-estado-${stamp}`
    if (format === 'xlsx') {
      await downloadReportFile(
        '/reports/indicador-estado/export',
        q,
        `${base}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toast.success('Archivo Excel descargado')
    } else {
      await downloadReportFile(
        '/reports/indicador-estado/export',
        q,
        `${base}.pdf`,
        'application/pdf',
      )
      toast.success('Archivo PDF descargado')
    }
  } catch (e: unknown) {
    console.error('Error exportando indicador:', e)
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
    const res = await $api<IndicadorResponse>('/reports/indicador-estado', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    console.error('Error cargando indicador:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el indicador')
    reportData.value = null
  } finally {
    loading.value = false
  }
}

function onStatusUpdate(value: unknown): void {
  if (value === null || value === undefined || value === '') {
    selectedStatus.value = null
  } else {
    selectedStatus.value = String(value)
  }
  fetchReport()
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
        Indicador
      </h2>
      <p class="text-sm text-muted-foreground">
        Compare el total de radicaciones creadas en el período con cuántas alcanzaron un estado del flujo
        (estado actual o registro en trazabilidad). Elija un solo estado en el listado para ver cantidad y porcentaje sobre el total.
      </p>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Mismo criterio de fechas que «Solicitudes tramitadas» (<code class="rounded bg-muted px-1 py-0.5 text-[11px]">created_at</code>).
          </CardDescription>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingIndicadorXlsx"
            @click="exportIndicadorEstado('xlsx')"
          >
            <Icon
              :name="exportingIndicadorXlsx ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
              class="size-4"
              :class="{ 'animate-spin': exportingIndicadorXlsx }"
            />
            {{ exportingIndicadorXlsx ? 'Generando…' : 'Excel' }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            :disabled="exportingIndicadorPdf"
            @click="exportIndicadorEstado('pdf')"
          >
            <Icon
              :name="exportingIndicadorPdf ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
              class="size-4"
              :class="{ 'animate-spin': exportingIndicadorPdf }"
            />
            {{ exportingIndicadorPdf ? 'Generando…' : 'PDF' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-xl border bg-muted/30 px-4 py-4">
          <div class="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <div class="min-w-0 flex-1 lg:max-w-xl">
              <DateRangeStringPicker
                id="reportes-indicador-dates"
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
              <Label for="report-indicador-sucursal">Sucursal de la radicación</Label>
              <Select
                :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                :disabled="loadingSucursales"
                @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
              >
                <SelectTrigger id="report-indicador-sucursal" class="w-full">
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
            <div class="w-full min-w-0 space-y-1.5 lg:max-w-md lg:flex-1">
              <Label for="report-indicador-estado">Estado a medir (una opción)</Label>
              <Multiselect
                id="report-indicador-estado"
                :model-value="selectedStatus"
                mode="single"
                :object="false"
                :options="creditApplicationStatusReportIndicatorOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="true"
                placeholder="Seleccionar estado…"
                no-options-text="Sin opciones"
                no-results-text="Sin coincidencias"
                class="multiselect-report-indicador w-full"
                @update:model-value="onStatusUpdate"
              />
            </div>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            La vista previa se actualiza al cambiar fechas, sucursal o estado.
          </p>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <p v-if="rangeSummaryText" class="text-sm text-muted-foreground">
            Período: <span class="font-medium text-foreground">{{ rangeSummaryText }}</span>
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <Card class="border-primary/20 bg-primary/5">
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Solicitudes radicadas en el período</CardDescription>
                <CardTitle class="text-3xl tabular-nums">
                  {{ reportData.total_radicadas }}
                </CardTitle>
                <p class="text-xs text-muted-foreground">
                  Total en el rango y filtros (denominador del porcentaje).
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <template v-if="reportData.filters.status">
                  <CardDescription>
                    Llegaron a: <span class="font-medium text-foreground">{{ selectedStatusLabel }}</span>
                  </CardDescription>
                  <CardTitle class="text-3xl tabular-nums">
                    {{ reportData.count_reached_status ?? '—' }}
                  </CardTitle>
                  <p class="text-lg font-semibold text-muted-foreground tabular-nums">
                    {{ formatPercent(reportData.percentage) }} del total
                  </p>
                </template>
                <template v-else>
                  <CardDescription>Estado del flujo</CardDescription>
                  <CardTitle class="text-base font-normal text-muted-foreground">
                    Seleccione un estado arriba para ver la cantidad y el porcentaje sobre las radicaciones del período.
                  </CardTitle>
                </template>
              </CardHeader>
            </Card>
          </div>

          <p class="text-xs text-muted-foreground leading-relaxed border-t pt-4">
            {{ reportData.methodology_note }}
          </p>
        </template>
      </CardContent>
    </Card>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-report-indicador {
  --ms-radius: 0.375rem;
  --ms-border-color: hsl(var(--input));
  --ms-bg: hsl(var(--background));
  --ms-py: 0.5rem;
  min-height: 2.5rem;
}
.multiselect-report-indicador :deep(.multiselect-wrapper) {
  min-height: 2.5rem;
  border-radius: var(--ms-radius);
}
</style>
