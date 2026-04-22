<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  creditApplicationStatusOrder,
  getCreditApplicationStatusBadgeVariant,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

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

const summaryLoading = ref(false)
const summary = ref<CreditSummaryData | null>(null)

const filterDateFrom = ref('')
const filterDateTo = ref('')

const applicantsTotal = ref<number | null>(null)

const hasActiveDateFilters = computed(() => {
  return Boolean(filterDateFrom.value?.trim()) || Boolean(filterDateTo.value?.trim())
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
      timeStyle: 'short',
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
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Dashboard
      </h2>
    </div>

    <main class="@container/main flex flex-1 flex-col gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de radicación</CardTitle>
          <CardDescription>
            Totales según tu perfil (asesor u oficina). Filtra por fechas de creación como en el listado de solicitudes.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="rounded-lg border bg-muted/30 p-4">
            <div
              class="mx-auto flex w-full max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-end sm:justify-center sm:gap-4"
            >
              <div class="w-full min-w-0 sm:max-w-md">
                <DateRangeStringPicker
                  id="dash-credit-dates"
                  v-model:from="filterDateFrom"
                  v-model:to="filterDateTo"
                />
              </div>
              <div class="flex justify-center sm:shrink-0 sm:pb-0.5 sm:pt-0">
                <Button
                  type="button"
                  variant="outline"
                  :disabled="!hasActiveDateFilters"
                  @click="clearDateFilters"
                >
                  Limpiar fechas
                </Button>
              </div>
            </div>
          </div>

          <div v-if="summaryLoading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>

          <template v-else-if="summary">
            <div class="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              <Card class="shadow-xs">
                <CardHeader class="pb-2">
                  <CardDescription>Radicaciones</CardDescription>
                  <CardTitle class="text-3xl font-semibold tabular-nums">
                    {{ summary.total }}
                  </CardTitle>
                </CardHeader>
                <CardFooter class="text-sm text-muted-foreground">
                  En el período seleccionado (sin filtro: todas las visibles).
                </CardFooter>
              </Card>
              <Card class="shadow-xs">
                <CardHeader class="pb-2">
                  <CardDescription>Monto solicitado</CardDescription>
                  <CardTitle class="text-2xl font-semibold tabular-nums sm:text-3xl">
                    {{ formatCurrency(Number(summary.amount_requested_sum)) }}
                  </CardTitle>
                </CardHeader>
                <CardFooter class="text-sm text-muted-foreground">
                  Suma de montos solicitados en el mismo alcance y fechas.
                </CardFooter>
              </Card>
              <Card v-if="applicantsTotal !== null" class="shadow-xs">
                <CardHeader class="pb-2">
                  <CardDescription>Solicitantes</CardDescription>
                  <CardTitle class="text-3xl font-semibold tabular-nums">
                    {{ applicantsTotal }}
                  </CardTitle>
                </CardHeader>
                <CardFooter class="text-sm text-muted-foreground">
                  Registros en el catálogo de solicitantes.
                </CardFooter>
              </Card>
            </div>

            <div>
              <h3 class="mb-3 text-sm font-medium">
                Por estado
              </h3>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="st in creditApplicationStatusOrder"
                  :key="st"
                  variant="outline"
                  class="tabular-nums"
                >
                  {{ getCreditApplicationStatusLabel(st) }}:
                  {{ summary.by_status[st] ?? 0 }}
                </Badge>
              </div>
            </div>

            <div>
              <h3 class="mb-3 text-sm font-medium">
                Últimas solicitudes
              </h3>
              <div v-if="summary.recent.length === 0" class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                No hay solicitudes en este alcance.
              </div>
              <div v-else class="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="row in summary.recent" :key="row.id">
                      <TableCell class="font-mono text-sm">
                        {{ row.code ?? '—' }}
                      </TableCell>
                      <TableCell class="text-sm">
                        {{ row.sucursal?.name ?? '—' }}
                      </TableCell>
                      <TableCell class="tabular-nums">
                        {{ formatCurrency(Number(row.amount_requested)) }}
                      </TableCell>
                      <TableCell>
                        <Badge :variant="getCreditApplicationStatusBadgeVariant(row.status)">
                          {{ getCreditApplicationStatusLabel(row.status) }}
                        </Badge>
                      </TableCell>
                      <TableCell class="text-sm text-muted-foreground">
                        {{ formatShortDate(row.created_at) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>
            Ir a las secciones más usadas
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <PermissionGate permission="radicacion_ver">
            <Button variant="outline" as-child>
              <NuxtLink to="/radicacion">
                <Icon name="i-lucide-file-text" class="mr-2 h-4 w-4" />
                Radicación
              </NuxtLink>
            </Button>
          </PermissionGate>
          <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar']">
            <Button variant="outline" as-child>
              <NuxtLink to="/radicacion/nueva">
                <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                Nueva solicitud
              </NuxtLink>
            </Button>
          </PermissionGate>
          <PermissionGate permission="solicitantes_ver">
            <Button variant="outline" as-child>
              <NuxtLink to="/solicitantes">
                <Icon name="i-lucide-user-check" class="mr-2 h-4 w-4" />
                Solicitantes
              </NuxtLink>
            </Button>
          </PermissionGate>
          <PermissionGate permission="plantillas_ver">
            <Button variant="outline" as-child>
              <NuxtLink to="/parametrizacion/plantillas">
                <Icon name="i-lucide-layout-template" class="mr-2 h-4 w-4" />
                Plantillas
              </NuxtLink>
            </Button>
          </PermissionGate>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
