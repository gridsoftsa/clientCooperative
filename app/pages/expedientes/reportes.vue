<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_FILE_ALERT_SEVERITY_LABELS,
  ARCHIVAL_FILE_ALERT_TYPE_LABELS,
} from '~/constants/archival-file-alerts'
import type { ArchivalFileAlert, ArchivalFileAlertType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_reportes_ver',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const summary = ref<Record<string, number> | null>(null)
const accessRows = ref<Array<Record<string, unknown>>>([])
const alerts = ref<ArchivalFileAlert[]>([])
const retentionRows = ref<Array<Record<string, unknown>>>([])
const incompleteRows = ref<Array<Record<string, unknown>>>([])
const loading = ref(true)
const refreshing = ref(false)

const canRefresh = computed(() => hasPermission('expedientes_reportes_ver'))

function alertTypeLabel(type: string): string {
  return ARCHIVAL_FILE_ALERT_TYPE_LABELS[type as ArchivalFileAlertType] ?? type
}

function severityLabel(severity: string): string {
  return ARCHIVAL_FILE_ALERT_SEVERITY_LABELS[severity] ?? severity
}

async function load() {
  loading.value = true

  try {
    const [summaryData, accessData, alertsData, retentionData, incompleteData] = await Promise.all([
      archivalApi.fetchReportsSummary(),
      archivalApi.fetchAccessControlReport(),
      archivalApi.fetchAlertsReport({ per_page: 50 }),
      archivalApi.fetchRetentionReport({ per_page: 25, upcoming_only: 1 }),
      archivalApi.fetchIncompleteReport({ per_page: 25 }),
    ])
    summary.value = summaryData
    accessRows.value = accessData
    alerts.value = alertsData.data
    retentionRows.value = retentionData.data
    incompleteRows.value = incompleteData.data
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
          Indicadores documentales, alertas programadas y control de acceso.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Control de acceso documental</CardTitle>
          <CardDescription>
            Permisos por rol, usuario, serie o tipo documental.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="accessRows.length === 0" class="text-sm text-muted-foreground">
            No hay permisos especiales registrados todavía.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo expediente</TableHead>
                <TableHead>Sujeto</TableHead>
                <TableHead>Permiso</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in accessRows" :key="String(row.id)">
                <TableCell>{{ row.file_type }}</TableCell>
                <TableCell>{{ row.grantable_label }}</TableCell>
                <TableCell>{{ row.permission_label }}</TableCell>
                <TableCell>{{ row.status }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
