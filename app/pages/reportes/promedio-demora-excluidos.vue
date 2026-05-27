<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'
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

interface ExcludedRow {
  code: string | null
  numero_radicado_externo: string | null
  status_label: string
  amount_requested: string
  created_at_local: string | null
  sucursal: { id: number, name: string, code?: string | null } | null
  adviser: { id: number, name: string, email?: string | null } | null
  reasons: string[]
}

interface ExcludedResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
    }
    summary: {
      modification_count: number
      real_estate_review_count: number
      excluded_total: number
    }
    rows: ExcludedRow[]
    methodology_note: string
  }
}

const { $api } = useNuxtApp()
const loading = ref(false)
const loadingSucursales = ref(false)
const reportData = ref<ExcludedResponse['data'] | null>(null)
const sucursales = ref<SucursalCatalogItem[]>([])

const filterDateFrom = ref('')
const filterDateTo = ref('')
const sucursalId = ref<number | null>(null)

const sucursalesSorted = computed(() =>
  [...sucursales.value].sort((a, b) => a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' })),
)

const skipDateFilterWatch = ref(false)
let reportDateDebounce: ReturnType<typeof setTimeout> | null = null

function defaultRangeStartOfYear(): { from: string, to: string } {
  const t = today(getLocalTimeZone())
  return {
    from: `${t.year}-01-01`,
    to: `${t.year}-12-31`,
  }
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

  return q
}

async function fetchSucursales(): Promise<void> {
  loadingSucursales.value = true
  try {
    const res = await $api<{ data: SucursalCatalogItem[] }>('/catalogs/sucursales')
    sucursales.value = res.data ?? []
  } catch (error: any) {
    toast.error(error?.data?.message ?? 'No se pudo cargar sucursales')
  } finally {
    loadingSucursales.value = false
  }
}

async function fetchReport(): Promise<void> {
  loading.value = true
  try {
    const res = await $api<ExcludedResponse>('/reports/promedio-demora-excluidos', {
      query: buildReportQuery(),
    })
    reportData.value = res.data
  } catch (error: any) {
    reportData.value = null
    toast.error(error?.data?.message ?? 'No se pudo cargar el reporte de excluidos')
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
    <Button variant="ghost" class="w-fit gap-2 px-2 text-muted-foreground" as-child>
      <NuxtLink to="/reportes">
        <Icon name="i-lucide-arrow-left" class="size-4" />
        Todos los reportes
      </NuxtLink>
    </Button>

    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Excluidos del indicador de demora
      </h2>
      <p class="text-sm text-muted-foreground">
        Este reporte separa casos que no deben afectar el indicador de tiempos del proceso estándar.
      </p>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
          <div class="min-w-0 flex-1 lg:max-w-xl">
            <DateRangeStringPicker
              id="reportes-excluidos-demora-dates"
              label="Rango (fecha de generación de la radicación)"
              v-model:from="filterDateFrom"
              v-model:to="filterDateTo"
            />
          </div>
          <div class="w-full space-y-1.5 lg:w-72 lg:shrink-0">
            <Label for="report-sucursal-excluidos">Sucursal de la radicación</Label>
            <Select
              :model-value="sucursalId == null ? 'all' : String(sucursalId)"
              :disabled="loadingSucursales"
              @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
            >
              <SelectTrigger id="report-sucursal-excluidos" class="w-full">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todas las sucursales
                </SelectItem>
                <SelectItem v-for="s in sucursalesSorted" :key="s.id" :value="String(s.id)">
                  {{ s.name }}{{ s.code ? ` (${s.code})` : '' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <template v-else-if="reportData">
          <div class="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Excluidas por modificación</CardDescription>
                <CardTitle class="text-2xl">{{ reportData.summary.modification_count }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Excluidas por inmobiliaria/asegurabilidad</CardDescription>
                <CardTitle class="text-2xl">{{ reportData.summary.real_estate_review_count }}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader class="space-y-1 px-4 py-4">
                <CardDescription>Total excluidas</CardDescription>
                <CardTitle class="text-2xl">{{ reportData.summary.excluded_total }}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div class="overflow-hidden rounded-lg border">
            <div class="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Motivos de exclusión</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead class="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in reportData.rows" :key="`${row.code}-${row.created_at_local}`">
                    <TableCell class="font-mono text-xs">
                      {{ row.code ?? '—' }}
                      <div v-if="row.numero_radicado_externo" class="text-[11px] text-muted-foreground">
                        Ext: {{ row.numero_radicado_externo }}
                      </div>
                    </TableCell>
                    <TableCell>{{ row.status_label }}</TableCell>
                    <TableCell>
                      <ul class="list-disc space-y-1 pl-4 text-xs">
                        <li v-for="reason in row.reasons" :key="reason">
                          {{ reason }}
                        </li>
                      </ul>
                    </TableCell>
                    <TableCell>
                      <div>{{ row.adviser?.name || '—' }}</div>
                      <div v-if="row.adviser?.email" class="text-xs text-muted-foreground">
                        {{ row.adviser.email }}
                      </div>
                    </TableCell>
                    <TableCell>{{ row.sucursal?.name || '—' }}</TableCell>
                    <TableCell class="text-right">{{ formatPesosConSimboloDesdeTexto(row.amount_requested) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <p class="text-xs text-muted-foreground italic">
            {{ reportData.methodology_note }}
          </p>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
