<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_FILE_ALERT_SEVERITY_LABELS,
  ARCHIVAL_FILE_ALERT_TYPE_LABELS,
} from '~/constants/archival-file-alerts'
import type { ArchivalFileAlert, ArchivalFileAlertType } from '~/types/archival-file'
import type { ArchivalAccessControlReportRow } from '~/types/archival-access'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_reportes_ver|expedientes_acceso_reporte',
})

const FILTER_ALL = 'all'

const router = useRouter()
const route = useRoute()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const summary = ref<Record<string, number> | null>(null)
const alerts = ref<ArchivalFileAlert[]>([])
const retentionRows = ref<Array<Record<string, unknown>>>([])
const incompleteRows = ref<Array<Record<string, unknown>>>([])
const accessRows = ref<ArchivalAccessControlReportRow[]>([])
const loading = ref(true)
const refreshing = ref(false)
const exporting = ref(false)

const fileTypes = ref<Array<{ id: number, name: string }>>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const fileTypeFilter = ref(FILTER_ALL)
const orgUnitFilter = ref(FILTER_ALL)
const phaseFilter = ref(FILTER_ALL)
const alertTypeFilter = ref(FILTER_ALL)
const severityFilter = ref(FILTER_ALL)
const upcomingOnly = ref(true)
const accessStatusFilter = ref(FILTER_ALL)
const accessPermissionFilter = ref(FILTER_ALL)

const canRefresh = computed(() => hasPermission('expedientes_reportes_ver'))
const canOperationalReports = computed(() => hasPermission('expedientes_reportes_ver'))
const canAccessReport = computed(() => hasPermission('expedientes_acceso_reporte'))
const highlightAccess = computed(() => route.query.tab === 'acceso')

const phaseOptions = [
  { value: 'management', label: 'Archivo de gestión' },
  { value: 'central', label: 'Archivo central' },
  { value: 'historical', label: 'Archivo histórico' },
]

const alertTypeOptions = Object.entries(ARCHIVAL_FILE_ALERT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function operationalQuery(): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (fileTypeFilter.value !== FILTER_ALL)
    query.archival_file_type_id = Number(fileTypeFilter.value)
  if (orgUnitFilter.value !== FILTER_ALL)
    query.org_unit_id = Number(orgUnitFilter.value)
  if (phaseFilter.value !== FILTER_ALL)
    query.archival_phase = phaseFilter.value
  if (alertTypeFilter.value !== FILTER_ALL)
    query.alert_type = alertTypeFilter.value
  if (severityFilter.value !== FILTER_ALL)
    query.severity = severityFilter.value
  query.upcoming_only = upcomingOnly.value ? 1 : 0
  return query
}

function accessQuery(): Record<string, string | number | undefined> {
  return {
    archival_file_type_id: fileTypeFilter.value !== FILTER_ALL ? Number(fileTypeFilter.value) : undefined,
    status: accessStatusFilter.value !== FILTER_ALL ? accessStatusFilter.value : undefined,
    permission: accessPermissionFilter.value !== FILTER_ALL ? accessPermissionFilter.value : undefined,
  }
}

async function loadFilterOptions() {
  try {
    const [types, units] = await Promise.all([
      archivalApi.fetchFileTypes(),
      api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units'),
    ])
    fileTypes.value = types.map(type => ({ id: type.id, name: type.name }))
    orgUnits.value = units.data ?? []
  }
  catch {
    fileTypes.value = []
    orgUnits.value = []
  }
}

function alertTypeLabel(type: string): string {
  return ARCHIVAL_FILE_ALERT_TYPE_LABELS[type as ArchivalFileAlertType] ?? type
}

function severityLabel(severity: string): string {
  return ARCHIVAL_FILE_ALERT_SEVERITY_LABELS[severity] ?? severity
}

async function load() {
  loading.value = true

  try {
    const tasks: Promise<unknown>[] = []

    const query = operationalQuery()

    if (canOperationalReports.value) {
      tasks.push(
        Promise.all([
          archivalApi.fetchReportsSummary(query),
          archivalApi.fetchAlertsReport({ ...query, per_page: 50 }),
          archivalApi.fetchRetentionReport({ ...query, per_page: 25 }),
          archivalApi.fetchIncompleteReport({ ...query, per_page: 25 }),
        ]).then(([summaryData, alertsData, retentionData, incompleteData]) => {
          summary.value = summaryData
          alerts.value = alertsData.data
          retentionRows.value = retentionData.data
          incompleteRows.value = incompleteData.data
        }),
      )
    }

    if (canAccessReport.value) {
      tasks.push(
        archivalApi.fetchAccessControlReport(accessQuery()).then((res) => {
          accessRows.value = res.data ?? []
        }),
      )
    }

    await Promise.all(tasks)
  }
  catch {
    toast.error('No se pudieron cargar los reportes.')
  }
  finally {
    loading.value = false
  }
}

async function handleRefreshAlerts() {
  if (!canRefresh.value) {
    return
  }

  refreshing.value = true

  try {
    const res = await archivalApi.refreshAlerts()
    toast.success(res.message)
    await load()
  }
  catch {
    toast.error('No se pudieron actualizar las alertas.')
  }
  finally {
    refreshing.value = false
  }
}

async function exportReports(format: 'xlsx' | 'pdf') {
  exporting.value = true

  try {
    await archivalApi.exportReports(format, operationalQuery())
    toast.success(`Reporte exportado en formato ${format === 'pdf' ? 'PDF' : 'Excel'}.`)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'No se pudo exportar el reporte.')
  }
  finally {
    exporting.value = false
  }
}

function clearFilters() {
  fileTypeFilter.value = FILTER_ALL
  orgUnitFilter.value = FILTER_ALL
  phaseFilter.value = FILTER_ALL
  alertTypeFilter.value = FILTER_ALL
  severityFilter.value = FILTER_ALL
  upcomingOnly.value = true
  accessStatusFilter.value = FILTER_ALL
  accessPermissionFilter.value = FILTER_ALL
  load()
}

onMounted(async () => {
  await loadFilterOptions()
  await load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Reportes de expedientes
        </h1>
        <p class="text-sm text-muted-foreground">
          Indicadores documentales, alertas programadas y retención archivística.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="canOperationalReports"
          variant="outline"
          size="sm"
          :disabled="exporting || loading"
          @click="exportReports('xlsx')"
        >
          <Icon name="i-lucide-file-spreadsheet" class="mr-2 size-4" />
          {{ exporting ? 'Exportando…' : 'Excel' }}
        </Button>
        <Button
          v-if="canOperationalReports"
          variant="outline"
          size="sm"
          :disabled="exporting || loading"
          @click="exportReports('pdf')"
        >
          <Icon name="i-lucide-file-text" class="mr-2 size-4" />
          PDF
        </Button>
        <Button
          v-if="canRefresh"
          variant="outline"
          :disabled="refreshing || loading"
          @click="handleRefreshAlerts"
        >
          {{ refreshing ? 'Actualizando…' : 'Actualizar alertas' }}
        </Button>
        <Button
          variant="outline"
          @click="router.push('/expedientes/alertas')"
        >
          <Icon name="i-lucide-settings-2" class="mr-2 size-4" />
          Config. alertas
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">
          Filtros
        </CardTitle>
        <CardDescription>
          Acotan indicadores, tablas y la exportación Excel/PDF.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-if="canOperationalReports || canAccessReport"
            class="space-y-2"
          >
            <Label>Tipo de expediente</Label>
            <Select v-model="fileTypeFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todos los tipos
                </SelectItem>
                <SelectItem
                  v-for="type in fileTypes"
                  :key="type.id"
                  :value="String(type.id)"
                >
                  {{ type.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canOperationalReports"
            class="space-y-2"
          >
            <Label>Área productora</Label>
            <Select v-model="orgUnitFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todas las áreas
                </SelectItem>
                <SelectItem
                  v-for="unit in orgUnits"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canOperationalReports"
            class="space-y-2"
          >
            <Label>Fase archivística</Label>
            <Select v-model="phaseFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todas las fases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todas las fases
                </SelectItem>
                <SelectItem
                  v-for="phase in phaseOptions"
                  :key="phase.value"
                  :value="phase.value"
                >
                  {{ phase.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canOperationalReports"
            class="space-y-2"
          >
            <Label>Tipo de alerta</Label>
            <Select v-model="alertTypeFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todas las alertas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todas las alertas
                </SelectItem>
                <SelectItem
                  v-for="option in alertTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canOperationalReports"
            class="space-y-2"
          >
            <Label>Severidad</Label>
            <Select v-model="severityFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todas
                </SelectItem>
                <SelectItem
                  v-for="(label, value) in ARCHIVAL_FILE_ALERT_SEVERITY_LABELS"
                  :key="value"
                  :value="value"
                >
                  {{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canAccessReport"
            class="space-y-2"
          >
            <Label>Estado de acceso</Label>
            <Select v-model="accessStatusFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todos
                </SelectItem>
                <SelectItem value="active">
                  Activo
                </SelectItem>
                <SelectItem value="inactive">
                  Inactivo
                </SelectItem>
                <SelectItem value="revoked">
                  Revocado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="canAccessReport"
            class="space-y-2"
          >
            <Label>Permiso de acceso</Label>
            <Select v-model="accessPermissionFilter">
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="FILTER_ALL">
                  Todos
                </SelectItem>
                <SelectItem value="view">
                  Ver
                </SelectItem>
                <SelectItem value="download">
                  Descargar
                </SelectItem>
                <SelectItem value="edit">
                  Editar
                </SelectItem>
                <SelectItem value="attach">
                  Anexar
                </SelectItem>
                <SelectItem value="close">
                  Cerrar
                </SelectItem>
                <SelectItem value="transfer">
                  Transferir
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          v-if="canOperationalReports"
          class="flex items-center gap-2 rounded-lg border p-3"
        >
          <Checkbox
            id="upcoming-only"
            :checked="upcomingOnly"
            @update:checked="upcomingOnly = $event === true"
          />
          <Label for="upcoming-only" class="cursor-pointer">
            Solo retención próxima
          </Label>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" :disabled="loading" @click="load()">
            Aplicar filtros
          </Button>
          <Button variant="outline" :disabled="loading" @click="clearFilters">
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="py-10 text-center text-muted-foreground">
      Cargando reportes...
    </div>

    <template v-else>
      <template v-if="canOperationalReports">
      <div class="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle class="text-3xl">
              {{ summary?.active ?? 0 }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Completados</CardDescription>
            <CardTitle class="text-3xl">
              {{ summary?.closed ?? 0 }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Incompletos</CardDescription>
            <CardTitle class="text-3xl">
              {{ summary?.incomplete ?? 0 }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Alertas abiertas</CardDescription>
            <CardTitle class="text-3xl">
              {{ summary?.alerts_open ?? 0 }}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas abiertas</CardTitle>
          <CardDescription>
            Retención, cierre próximo, consolidación pendiente y documentos obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="alerts.length === 0" class="text-sm text-muted-foreground">
            No hay alertas abiertas. El proceso programado las evalúa cada hora.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Expediente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead class="text-right">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="alert in alerts" :key="alert.id">
                <TableCell class="font-mono text-xs">
                  {{ alert.file?.file_number ?? alert.archival_file_id }}
                </TableCell>
                <TableCell class="text-sm">
                  {{ alertTypeLabel(alert.alert_type) }}
                </TableCell>
                <TableCell>
                  {{ severityLabel(alert.severity) }}
                </TableCell>
                <TableCell class="max-w-md text-sm text-muted-foreground">
                  {{ alert.message }}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="alert.file?.id"
                    variant="outline"
                    size="sm"
                    @click="router.push(`/expedientes/${alert.file!.id}`)"
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retención próxima</CardTitle>
          <CardDescription>
            Expedientes con fin de retención en la ventana configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="retentionRows.length === 0" class="text-sm text-muted-foreground">
            No hay expedientes con retención próxima.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Expediente</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Fin retención</TableHead>
                <TableHead>Días restantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in retentionRows" :key="String(row.id)">
                <TableCell class="font-mono text-xs">{{ row.file_number }}</TableCell>
                <TableCell>{{ row.status_label }}</TableCell>
                <TableCell>{{ row.retention_ends_at }}</TableCell>
                <TableCell>{{ row.days_left }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expedientes incompletos</CardTitle>
          <CardDescription>
            Activos o en revisión con documentos obligatorios pendientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="incompleteRows.length === 0" class="text-sm text-muted-foreground">
            No hay expedientes incompletos en el reporte.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Expediente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Faltantes</TableHead>
                <TableHead class="text-right">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in incompleteRows" :key="String(row.id)">
                <TableCell class="font-mono text-xs">{{ row.file_number }}</TableCell>
                <TableCell>{{ row.status_label }}</TableCell>
                <TableCell>{{ row.missing_count }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="router.push(`/expedientes/${row.id}`)"
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </template>

      <Card
        v-if="canAccessReport"
        :class="{ 'ring-2 ring-primary/30': highlightAccess }"
        id="acceso"
      >
        <CardHeader class="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Tabla de control de acceso documental</CardTitle>
            <CardDescription>
              Usuarios y roles con permisos sobre tipos de expediente, series, subseries y documentos.
            </CardDescription>
          </div>
          <Button
            v-if="hasPermission('expedientes_acceso_gestionar')"
            variant="outline"
            size="sm"
            as-child
          >
            <NuxtLink to="/expedientes/acceso">
              Gestionar
            </NuxtLink>
          </Button>
          <Button
            v-if="canAccessReport"
            variant="outline"
            size="sm"
            as-child
          >
            <NuxtLink to="/expedientes/acceso/reporte">
              Abrir reporte
            </NuxtLink>
          </Button>
        </CardHeader>
        <CardContent>
          <div v-if="accessRows.length === 0" class="text-sm text-muted-foreground">
            No hay grants de acceso configurados.
          </div>
          <div v-else class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo expediente</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead>Subserie</TableHead>
                  <TableHead>Tipo documental</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Permiso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Autorizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in accessRows" :key="row.id">
                  <TableCell class="text-sm">
                    {{ row.file_type }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ row.series }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ row.subseries }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ row.document_type }}
                  </TableCell>
                  <TableCell>
                    <div class="text-sm font-medium">
                      {{ row.grantable_label }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ row.grantable_type }}
                    </div>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ row.permission }}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {{ row.status }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ row.authorized_by }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
