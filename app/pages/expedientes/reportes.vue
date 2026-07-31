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

const router = useRouter()
const route = useRoute()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const summary = ref<Record<string, number> | null>(null)
const alerts = ref<ArchivalFileAlert[]>([])
const retentionRows = ref<Array<Record<string, unknown>>>([])
const incompleteRows = ref<Array<Record<string, unknown>>>([])
const accessRows = ref<ArchivalAccessControlReportRow[]>([])
const loading = ref(true)
const refreshing = ref(false)
const exporting = ref(false)

const canRefresh = computed(() => hasPermission('expedientes_reportes_ver'))
const canOperationalReports = computed(() => hasPermission('expedientes_reportes_ver'))
const canAccessReport = computed(() => hasPermission('expedientes_acceso_reporte'))
const highlightAccess = computed(() => route.query.tab === 'acceso')

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

    if (canOperationalReports.value) {
      tasks.push(
        Promise.all([
          archivalApi.fetchReportsSummary(),
          archivalApi.fetchAlertsReport({ per_page: 50 }),
          archivalApi.fetchRetentionReport({ per_page: 25, upcoming_only: 1 }),
          archivalApi.fetchIncompleteReport({ per_page: 25 }),
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
        archivalApi.fetchAccessControlReport().then((res) => {
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
    await archivalApi.exportReports(format)
    toast.success(`Reporte exportado en formato ${format === 'pdf' ? 'PDF' : 'Excel'}.`)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'No se pudo exportar el reporte.')
  }
  finally {
    exporting.value = false
  }
}

onMounted(() => load())
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
            <CardDescription>Cerrados</CardDescription>
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
