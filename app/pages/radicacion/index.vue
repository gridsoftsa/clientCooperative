<script setup lang="ts">
import {
  creditApplicationStatusFilterOptions as statusFilterOptions,
  getCreditApplicationStatusBadgeVariant as getStatusBadgeVariant,
  getCreditApplicationStatusLabel as getStatusLabel,
} from '~/constants/credit-application-status'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_ver',
})

const router = useRouter()
const { $api } = useNuxtApp()
const { hasAnyPermission } = usePermissions()
/** Editar / continuar borrador: crear o editar (nueva solo exige crear) */
const canOpenDraftForm = computed(() => hasAnyPermission(['radicacion_crear', 'radicacion_editar']))
const { downloadApplicationPdf } = useDocumentDownload()
const downloadingPdfId = ref<number | null>(null)
const deactivatingId = ref<number | null>(null)

const applications = ref<any[]>([])
const loading = ref(false)
const movingToAnalysisId = ref<number | null>(null)
const toAnalysisRadicado = ref('')
const toAnalysisDialogOpen = ref(false)
const applicationToMove = ref<{ id: number; code?: string } | null>(null)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

/** Filtros de listado (estado + rango por fecha de creación) */
const filterStatus = ref<string>('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const hasActiveFilters = computed(() => {
  return filterStatus.value !== 'all'
    || Boolean(filterDateFrom.value?.trim())
    || Boolean(filterDateTo.value?.trim())
})

const skipFilterWatch = ref(false)
let listFilterDebounce: ReturnType<typeof setTimeout> | null = null

function buildListQuery(): Record<string, string | number> {
  const q: Record<string, string | number> = {
    per_page: pagination.value.per_page,
    page: pagination.value.current_page,
  }
  if (filterStatus.value !== 'all') {
    q.status = filterStatus.value
  }
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

async function fetchApplications() {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return
  }

  loading.value = true
  try {
    const res = await $api<{ data: any[]; meta: typeof pagination.value }>(
      '/credit-applications',
      { query: buildListQuery() },
    )
    applications.value = res.data
    pagination.value = res.meta
  } catch (e) {
    console.error('Error cargando solicitudes:', e)
  } finally {
    loading.value = false
  }
}

watch([filterStatus, filterDateFrom, filterDateTo], () => {
  if (skipFilterWatch.value)
    return
  if (listFilterDebounce)
    clearTimeout(listFilterDebounce)
  listFilterDebounce = setTimeout(() => {
    listFilterDebounce = null
    pagination.value.current_page = 1
    fetchApplications()
  }, 400)
})

function clearFilters() {
  if (listFilterDebounce) {
    clearTimeout(listFilterDebounce)
    listFilterDebounce = null
  }
  skipFilterWatch.value = true
  filterStatus.value = 'all'
  filterDateFrom.value = ''
  filterDateTo.value = ''
  pagination.value.current_page = 1
  nextTick(() => {
    skipFilterWatch.value = false
    fetchApplications()
  })
}

function goToAnalisisScore(applicationId: number) {
  navigateTo({
    path: '/radicacion/analisis-score',
    query: { solicitud: String(applicationId) },
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const deactivateSuccess = ref(false)

async function handleDeactivate(app: { id: number }) {
  if (deactivatingId.value) return
  if (!confirm('¿Desactivar esta solicitud? No se mostrará en el listado.')) return
  deactivatingId.value = app.id
  deactivateSuccess.value = false
  try {
    await $api(`/credit-applications/${app.id}`, { method: 'DELETE' })
    deactivateSuccess.value = true
    toast.success('Solicitud desactivada', {
      description: 'La solicitud ya no aparecerá en el listado.',
      duration: 4000,
    })
    await fetchApplications()
  } catch (e: any) {
    console.error('Error desactivando:', e)
    toast.error(e?.data?.message ?? 'No se pudo desactivar')
  } finally {
    deactivatingId.value = null
    setTimeout(() => { deactivateSuccess.value = false }, 3000)
  }
}

function openToAnalysisDialog(app: { id: number; code?: string }) {
  applicationToMove.value = app
  toAnalysisRadicado.value = ''
  toAnalysisDialogOpen.value = true
}

function closeToAnalysisDialog() {
  applicationToMove.value = null
  toAnalysisRadicado.value = ''
  toAnalysisDialogOpen.value = false
}

async function confirmMoveToAnalysis() {
  const app = applicationToMove.value
  if (!app || !toAnalysisRadicado.value?.trim()) {
    toast.error('Ingresa el número de radicado externo')
    return
  }
  movingToAnalysisId.value = app.id
  try {
    const { $api, $csrf } = useNuxtApp()
    await $csrf()
    await $api(`/credit-applications/${app.id}/to-analysis`, {
      method: 'PATCH',
      body: { numero_radicado_externo: toAnalysisRadicado.value.trim() },
    })
    toast.success('Solicitud pasada a análisis correctamente')
    closeToAnalysisDialog()
    await fetchApplications()
  } catch (e: any) {
    console.error('Error pasando a análisis:', e)
    toast.error(e?.data?.message ?? 'No se pudo pasar a análisis')
  } finally {
    movingToAnalysisId.value = null
  }
}

async function handleDownloadPdf(app: { id: number; code?: string }) {
  if (downloadingPdfId.value) return
  downloadingPdfId.value = app.id
  try {
    const { toast } = await import('vue-sonner')
    await downloadApplicationPdf(app.id, `solicitud-${app.code ?? app.id}.pdf`)
    toast.success('PDF abierto en una nueva pestaña. Puede guardarlo desde el visor si lo desea.')
  } catch (e) {
    console.error('Error abriendo PDF:', e)
    const { toast } = await import('vue-sonner')
    toast.error('No se pudo abrir el PDF')
  } finally {
    downloadingPdfId.value = null
  }
}

onMounted(() => {
  fetchApplications()
})

onUnmounted(() => {
  if (listFilterDebounce) {
    clearTimeout(listFilterDebounce)
    listFilterDebounce = null
  }
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Entrevista de Crédito (Radicación)
      </h2>
      <PermissionGate permission="radicacion_crear">
        <Button @click="router.push('/radicacion/nueva')">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </PermissionGate>
    </div>

    <Alert v-if="deactivateSuccess" class="mb-4 border-green-500/50 bg-green-500/10">
      <Icon name="i-lucide-check-circle" class="h-4 w-4 text-green-600" />
      <AlertTitle>Solicitud desactivada</AlertTitle>
      <AlertDescription>
        La solicitud se desactivó correctamente y ya no aparece en el listado.
      </AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Lista de Solicitudes</CardTitle>
        <CardDescription>
          Gestiona las solicitudes de crédito en proceso
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div class="grid w-full gap-3 sm:max-w-[220px] sm:shrink-0">
            <Label for="filter-status" class="text-xs text-muted-foreground">Estado</Label>
            <Select v-model="filterStatus">
              <SelectTrigger id="filter-status" class="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in statusFilterOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="w-full min-w-0 sm:max-w-md sm:shrink-0">
            <DateRangeStringPicker
              id="filter-created-range"
              v-model:from="filterDateFrom"
              v-model:to="filterDateTo"
            />
          </div>
          <div class="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto sm:shrink-0 sm:items-end sm:pb-0.5">
            <Button
              type="button"
              variant="outline"
              :disabled="!hasActiveFilters"
              @click="clearFilters"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>

        <p v-if="!loading" class="text-sm text-muted-foreground">
          {{ pagination.total }} solicitud{{ pagination.total === 1 ? '' : 'es' }} encontrada{{ pagination.total === 1 ? '' : 's' }}.
        </p>

        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="applications.length === 0" class="text-center py-12 text-muted-foreground">
          <template v-if="hasActiveFilters">
            No hay solicitudes que coincidan con los filtros. Prueba otros criterios o
            <button type="button" class="text-primary underline underline-offset-2" @click="clearFilters">
              limpiar filtros
            </button>.
          </template>
          <template v-else>
            No hay solicitudes. Crea una nueva para comenzar.
          </template>
        </div>
        <div v-else class="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Radicado externo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="app in applications" :key="app.id">
                <TableCell class="font-medium">
                  <NuxtLink
                    v-if="app.status === 'Draft' && canOpenDraftForm"
                    :to="`/radicacion/editar/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    title="Abrir formulario editable del borrador"
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">(continuar editando)</span>
                  </NuxtLink>
                  <span v-else>{{ app.code || '-' }}</span>
                </TableCell>
                <TableCell class="font-mono text-sm">{{ app.numero_radicado_externo || '-' }}</TableCell>
                <TableCell>{{ formatCurrency(Number(app.amount_requested)) }}</TableCell>
                <TableCell>{{ app.term_months }} meses</TableCell>
                <TableCell>
                  <Badge :variant="getStatusBadgeVariant(app.status) as any">
                    {{ getStatusLabel(app.status) }}
                  </Badge>
                </TableCell>
                <TableCell>{{ new Date(app.created_at).toLocaleDateString('es-CO') }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar', 'radicacion_ver']">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 border-primary/35 bg-primary/[0.06] px-2 text-xs font-semibold tracking-wide text-primary shadow-sm hover:bg-primary/12 hover:text-primary"
                        title="Análisis y perfil de riesgo SCORE (plantilla de crédito)"
                        aria-label="Análisis y SCORE"
                        @click="goToAnalisisScore(app.id)"
                      >
                        <Icon name="i-lucide-chart-column-increasing" class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>SCORE</span>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_enviar_analisis">
                      <Button
                        v-if="app.status === 'Draft'"
                        variant="default"
                        size="sm"
                        class="gap-1.5"
                        title="Pasar a análisis"
                        @click="openToAnalysisDialog(app)"
                      >
                        <Icon name="i-lucide-send" class="h-3.5 w-3.5 shrink-0" />
                        Enviar
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_descargar_pdf">
                      <Button
                        variant="outline"
                        size="sm"
                        class="gap-1.5 !border-red-200/90 !bg-red-50 text-red-900 hover:!border-red-300 hover:!bg-red-100 dark:!border-red-800/50 dark:!bg-red-950/45 dark:text-red-100 dark:hover:!border-red-700 dark:hover:!bg-red-950/70"
                        title="Ver PDF (nueva pestaña)"
                        :disabled="downloadingPdfId === app.id"
                        @click="handleDownloadPdf(app)"
                      >
                        <Icon
                          :name="downloadingPdfId === app.id ? 'i-lucide-loader-2' : 'i-simple-icons-adobeacrobatreader'"
                          class="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-300"
                          :class="{ 'animate-spin': downloadingPdfId === app.id }"
                        />
                        PDF
                      </Button>
                    </PermissionGate>
                    <PermissionGate :any-permission="['radicacion_crear', 'radicacion_editar']">
                      <Button
                        v-if="app.status === 'Draft'"
                        variant="warning"
                        size="sm"
                        class="gap-1.5"
                        title="Editar borrador (formulario completo)"
                        as-child
                      >
                        <NuxtLink :to="`/radicacion/editar/${app.id}`" class="inline-flex items-center gap-1.5">
                          <Icon name="i-lucide-pencil" class="h-3.5 w-3.5 shrink-0" />
                          Editar
                        </NuxtLink>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_ver">
                      <Button
                        variant="outline"
                        size="sm"
                        class="gap-1.5"
                        title="Ver solo lectura (no permite cambiar datos)"
                        @click="router.push(`/radicacion/${app.id}`)"
                      >
                        <Icon name="i-lucide-eye" class="h-3.5 w-3.5 shrink-0" />
                        Ver
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_desactivar">
                      <Button
                        variant="destructive"
                        size="sm"
                        class="gap-1.5"
                        title="Desactivar"
                        :disabled="deactivatingId === app.id"
                        @click="handleDeactivate(app)"
                      >
                        <Icon :name="deactivatingId === app.id ? 'i-lucide-loader-2' : 'i-lucide-ban'" class="h-3.5 w-3.5 shrink-0" :class="{ 'animate-spin': deactivatingId === app.id }" />
                        Desactivar
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div v-if="pagination.last_page > 1" class="flex justify-between items-center mt-4">
          <p class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="pagination.current_page--; fetchApplications()"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="pagination.current_page++; fetchApplications()"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog :open="toAnalysisDialogOpen" @update:open="(v) => { if (!v) closeToAnalysisDialog() }">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pasar a análisis</DialogTitle>
          <DialogDescription>
            Ingresa el número de radicado que devolvió el sistema externo (Finagro, etc.) al enviar la solicitud. La solicitud pasará de Borrador a En análisis.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div v-if="applicationToMove" class="rounded-md bg-muted/50 px-3 py-2 text-sm">
            Solicitud: <strong>{{ applicationToMove.code }}</strong>
          </div>
          <div class="space-y-2">
            <Label for="to-analysis-radicado">Número de radicado externo *</Label>
            <Input
              id="to-analysis-radicado"
              v-model="toAnalysisRadicado"
              placeholder="Ej: RAD-EXT-2025-001234"
              class="font-mono"
              @keyup.enter="confirmMoveToAnalysis"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeToAnalysisDialog">
            Cancelar
          </Button>
          <Button
            :disabled="!toAnalysisRadicado?.trim() || movingToAnalysisId !== null"
            @click="confirmMoveToAnalysis"
          >
            <Icon v-if="movingToAnalysisId" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Pasar a análisis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
