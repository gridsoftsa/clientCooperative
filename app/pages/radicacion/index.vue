<script setup lang="ts">
import {
  creditApplicationStatusFilterOptions as statusFilterOptions,
  getCreditApplicationStatusBadgeVariant as getStatusBadgeVariant,
  getCreditApplicationStatusLabel as getStatusLabel,
  isCreditApplicationTerminalImmutable,
} from '~/constants/credit-application-status'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_ver',
})

const router = useRouter()
const { $api } = useNuxtApp()
const { hasAnyPermission, hasRole, hasPermission } = usePermissions()
/** Editar / continuar borrador: crear o editar (nueva solo exige crear) */
const canOpenDraftForm = computed(() => hasAnyPermission(['radicacion_crear', 'radicacion_editar']))
const isDirectorAgencia = computed(() => hasRole('director_agencia'))
const isDirectorCredito = computed(() => hasRole('director_credito'))
const isRevisionDocumentos = computed(() => hasRole('revision_documentos'))

/** Revisión documentos: enlace al detalle en revisión documental o fuera de ella si la solicitud requiere asegurabilidad (p. ej. subir checklist en análisis). */
function revisionRadicacionDetailLinkEligible(app: { status?: string, documentation_insurability_required?: boolean }): boolean {
  if (!isRevisionDocumentos.value) {
    return false
  }
  if (String(app.status ?? '') === 'Documentation_Review') {
    return true
  }
  return Boolean(app.documentation_insurability_required)
    && !isCreditApplicationTerminalImmutable(app.status)
    && hasPermission('radicacion_insurability_ver')
}

/** Botón «Ver»: el rol revisión usa «Revisión documentos» en Documentation_Review; en otros estados solo si aplica seguimiento de asegurabilidad. */
function showVerRadicacionListButton(app: { status?: string, documentation_insurability_required?: boolean }): boolean {
  if (isDirectorAgencia.value) {
    return false
  }
  if (isDirectorCredito.value && app.status === 'Credit_Director_Review') {
    return false
  }
  if (isRevisionDocumentos.value) {
    if (String(app.status ?? '') === 'Documentation_Review') {
      return false
    }
    return Boolean(app.documentation_insurability_required)
      && !isCreditApplicationTerminalImmutable(app.status)
      && hasPermission('radicacion_insurability_ver')
  }
  return true
}

/** Icono «pila de archivos» cuando el detalle implica adjuntos destacados (revisión documental o asegurabilidad). */
function verRadicacionListPrefersDocumentActionsIcon(app: { status?: string, documentation_insurability_required?: boolean }): boolean {
  if (String(app.status ?? '') === 'Documentation_Review' && canOpenDraftForm.value && !isRevisionDocumentos.value) {
    return true
  }
  if (isRevisionDocumentos.value && Boolean(app.documentation_insurability_required) && String(app.status ?? '') !== 'Documentation_Review') {
    return true
  }
  return false
}
const isAnalista = computed(() => hasRole('analista'))
const { downloadApplicationPdf } = useDocumentDownload()
const downloadingPdfId = ref<number | null>(null)
const deactivatingId = ref<number | null>(null)

const applications = ref<any[]>([])
const loading = ref(false)
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

function formatCreatedAt(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const deactivateSuccess = ref(false)
const deactivateDialogOpen = ref(false)
const pendingDeactivateApp = ref<{ id: number } | null>(null)
const deleteWithReason = useApiDeleteWithReason()

function openDeactivateDialog(app: { id: number }) {
  if (deactivatingId.value)
    return
  pendingDeactivateApp.value = app
  deactivateDialogOpen.value = true
}

async function onDeactivateConfirm(reason: string) {
  const app = pendingDeactivateApp.value
  if (!app || deactivatingId.value)
    return
  deactivatingId.value = app.id
  deactivateSuccess.value = false
  try {
    await deleteWithReason(`/credit-applications/${app.id}`, reason)
    deactivateDialogOpen.value = false
    pendingDeactivateApp.value = null
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

watch(deactivateDialogOpen, (v) => {
  if (!v)
    pendingDeactivateApp.value = null
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
                <TableHead>Fecha y hora</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="app in applications" :key="app.id">
                <TableCell class="font-medium">
                  <NuxtLink
                    v-if="(app.status === 'Draft' || app.status === 'Returned') && canOpenDraftForm"
                    :to="`/radicacion/editar/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    title="Abrir formulario editable"
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">(continuar editando)</span>
                  </NuxtLink>
                  <NuxtLink
                    v-else-if="isDirectorAgencia && app.status === 'Director_Review'"
                    :to="`/radicacion/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    title="Abrir revisión del director"
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">(revisar)</span>
                  </NuxtLink>
                  <NuxtLink
                    v-else-if="isDirectorCredito && app.status === 'Credit_Director_Review'"
                    :to="`/radicacion/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    title="Abrir revisión del director de crédito"
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">(concepto final)</span>
                  </NuxtLink>
                  <NuxtLink
                    v-else-if="revisionRadicacionDetailLinkEligible(app)"
                    :to="`/radicacion/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    :title="app.status === 'Documentation_Review' ? 'Revisión y concepto de documentación' : 'Detalle: documentos de asegurabilidad (la solicitud requiere asegurabilidad).'"
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">{{
                      app.status === 'Documentation_Review' ? '(revisión documental)' : '(asegurabilidad)'
                    }}</span>
                  </NuxtLink>
                  <NuxtLink
                    v-else-if="app.status === 'Documentation_Review' && canOpenDraftForm && !isRevisionDocumentos"
                    :to="`/radicacion/${app.id}`"
                    class="font-medium text-primary hover:underline"
                    title="Abrir el detalle de la solicitud: mientras está en revisión documental puede consultar datos y adjuntar o reemplazar archivos (no es lo mismo que «devuelta»: aún está en cola del revisor)."
                  >
                    {{ app.code || '-' }}
                    <span class="text-xs text-muted-foreground ml-1">(detalle y adjuntos)</span>
                  </NuxtLink>
                  <span v-else>{{ app.code || '-' }}</span>
                </TableCell>
                <TableCell class="font-mono text-sm">{{ app.numero_radicado_externo || '-' }}</TableCell>
                <TableCell>{{ formatCurrency(Number(app.amount_requested)) }}</TableCell>
                <TableCell>{{ app.term_months }} meses</TableCell>
                <TableCell>
                  <Badge :variant="getStatusBadgeVariant(app.status)">
                    {{ getStatusLabel(app.status, {
                      skipNextDirectorReview: app.skip_next_director_review,
                      resubmitToAnalystAfterReturn: app.resubmit_to_analyst_after_return,
                    }) }}
                  </Badge>
                </TableCell>
                <TableCell class="whitespace-nowrap text-sm tabular-nums">
                  {{ formatCreatedAt(app.created_at) }}
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <PermissionGate permission="radicacion_analisis_guardar">
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
                    <PermissionGate permission="radicacion_analisis_ver">
                      <Button
                        v-if="isDirectorCredito && app.status === 'Credit_Director_Review'"
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 border-primary/35 bg-primary/[0.06] px-2 text-xs font-semibold tracking-wide text-primary shadow-sm hover:bg-primary/12 hover:text-primary"
                        title="Ver Análisis y SCORE (solo lectura)"
                        aria-label="Ver SCORE"
                        @click="goToAnalisisScore(app.id)"
                      >
                        <Icon name="i-lucide-chart-column-increasing" class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>SCORE</span>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_director_decidir">
                      <Button
                        v-if="isDirectorAgencia && app.status === 'Director_Review'"
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        title="Revisión y concepto del director de agencia"
                        aria-label="Revisar radicación como director"
                        @click="router.push(`/radicacion/${app.id}`)"
                      >
                        <Icon name="i-lucide-clipboard-check" class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Revisión director</span>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_director_credito_decidir">
                      <Button
                        v-if="isDirectorCredito && app.status === 'Credit_Director_Review'"
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs font-semibold text-primary"
                        title="Concepto final: desembolso o rechazo"
                        aria-label="Revisar como director de crédito"
                        @click="router.push(`/radicacion/${app.id}`)"
                      >
                        <Icon name="i-lucide-badge-check" class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Director crédito</span>
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_documentos_decidir">
                      <Button
                        v-if="isRevisionDocumentos && app.status === 'Documentation_Review'"
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        title="Revisión y concepto de documentación"
                        aria-label="Revisar documentación"
                        @click="router.push(`/radicacion/${app.id}`)"
                      >
                        <Icon name="i-lucide-file-check-2" class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Revisión documentos</span>
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
                        v-if="app.status === 'Draft' || app.status === 'Returned'"
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
                        v-if="showVerRadicacionListButton(app)"
                        variant="outline"
                        size="sm"
                        class="gap-1.5"
                        :title="verRadicacionListPrefersDocumentActionsIcon(app)
                          ? (isRevisionDocumentos && app.documentation_insurability_required && app.status !== 'Documentation_Review'
                            ? 'Abrir el detalle para gestionar documentos de asegurabilidad.'
                            : 'Abrir el detalle: puede adjuntar o reemplazar documentos mientras la solicitud está en revisión documental (el revisor aún no ha emitido concepto).')
                          : 'Ver detalle de la solicitud'"
                        @click="router.push(`/radicacion/${app.id}`)"
                      >
                        <Icon
                          :name="verRadicacionListPrefersDocumentActionsIcon(app) ? 'i-lucide-file-stack' : 'i-lucide-eye'"
                          class="h-3.5 w-3.5 shrink-0"
                        />
                        {{ verRadicacionListPrefersDocumentActionsIcon(app) ? (isRevisionDocumentos ? 'Asegurabilidad' : 'Abrir solicitud') : 'Ver' }}
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="radicacion_desactivar">
                      <Button
                        v-if="!isCreditApplicationTerminalImmutable(app.status)"
                        variant="destructive"
                        size="sm"
                        class="gap-1.5"
                        title="Desactivar"
                        :disabled="deactivatingId === app.id"
                        @click="openDeactivateDialog(app)"
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

    <ConfirmWithReasonDialog
      v-model:open="deactivateDialogOpen"
      title="Desactivar solicitud"
      description="La solicitud dejará de mostrarse en el listado. Indica el motivo de la desactivación."
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deactivatingId !== null"
      @confirm="onDeactivateConfirm"
    />
  </div>
</template>
