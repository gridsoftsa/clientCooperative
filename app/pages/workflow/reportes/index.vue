<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'
import type {
  WorkflowDashboardData,
  WorkflowOverdueTaskRow,
  WorkflowReportKey,
  WorkflowStageDurationRow,
  WorkflowUserPerformanceRow,
  WorkflowWorkloadRow,
} from '~/types/workflow-reports'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_ver',
})

interface OrgUnitOption {
  id: number
  name: string
  code: string | null
}

const REPORT_TABS: Array<{ id: WorkflowReportKey, label: string, description: string }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Indicadores gerenciales y tendencias' },
  { id: 'overdue-tasks', label: 'Tareas vencidas', description: 'Detalle operativo de tareas fuera de término' },
  { id: 'sla-compliance', label: 'Cumplimiento SLA', description: '% en término y tiempos de respuesta' },
  { id: 'user-performance', label: 'Desempeño', description: 'Productividad por usuario' },
  { id: 'workload', label: 'Carga laboral', description: 'Tareas activas, vencidas y por vencer' },
  { id: 'stage-duration', label: 'Tiempos por etapa', description: 'Cuellos de botella por etapa' },
]

const { $api } = useNuxtApp()
const reportsApi = useWorkflowReportsApi()
const workflowApi = useWorkflowApi()
const { scope, canViewTeam, canViewAllTasks } = useWorkflowInboxScope()

const activeTab = ref<WorkflowReportKey>('dashboard')
const loading = ref(false)
const exporting = ref(false)

const orgUnits = ref<OrgUnitOption[]>([])
const definitions = ref<Array<{ id: number, key: string, name: string }>>([])
const functionalTypes = ref<Array<{ key: string, label: string }>>([])
const users = ref<Array<{ id: number, name: string }>>([])

function defaultRange() {
  const t = today(getLocalTimeZone())
  return {
    from: `${t.year}-01-01`,
    to: `${t.year}-12-31`,
  }
}

const filedFrom = ref(defaultRange().from)
const filedTo = ref(defaultRange().to)
const orgUnitId = ref<string>('all')
const assigneeUserId = ref<string>('all')
const functionalTypeKey = ref<string>('all')
const workflowDefinitionId = ref<string>('all')
const workloadGroupBy = ref<'user' | 'org_unit'>('user')

const dashboard = ref<WorkflowDashboardData | null>(null)
const overdueRows = ref<WorkflowOverdueTaskRow[]>([])
const slaSummary = ref<Record<string, unknown> | null>(null)
const performanceRows = ref<WorkflowUserPerformanceRow[]>([])
const workloadRows = ref<WorkflowWorkloadRow[]>([])
const stageRows = ref<WorkflowStageDurationRow[]>([])

const filters = computed(() => ({
  scope: scope.value,
  org_unit_id: orgUnitId.value !== 'all' ? Number(orgUnitId.value) : null,
  assignee_user_id: assigneeUserId.value !== 'all' ? Number(assigneeUserId.value) : null,
  functional_type_key: functionalTypeKey.value !== 'all' ? functionalTypeKey.value : null,
  workflow_definition_id: workflowDefinitionId.value !== 'all' ? Number(workflowDefinitionId.value) : null,
  filed_from: filedFrom.value || null,
  filed_to: filedTo.value || null,
  group_by: workloadGroupBy.value,
}))

async function loadCatalogs() {
  const [unitsRes, defs, types, userList] = await Promise.all([
    $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', { query: { active_only: 1 } }).catch(() => ({ data: [] })),
    workflowApi.fetchActiveDefinitions().catch(() => []),
    workflowApi.fetchFunctionalTypes().catch(() => []),
    workflowApi.fetchAssignableUsers().catch(() => []),
  ])

  orgUnits.value = unitsRes.data ?? []
  definitions.value = defs
  functionalTypes.value = types
  users.value = userList
}

async function loadActiveReport() {
  loading.value = true

  try {
    if (activeTab.value === 'dashboard') {
      const data = await reportsApi.fetchDashboard(filters.value)
      dashboard.value = data.dashboard
    }
    else if (activeTab.value === 'overdue-tasks') {
      const data = await reportsApi.fetchOverdueTasks(filters.value)
      overdueRows.value = data.rows
    }
    else if (activeTab.value === 'sla-compliance') {
      const data = await reportsApi.fetchSlaCompliance(filters.value)
      slaSummary.value = data.summary as Record<string, unknown>
    }
    else if (activeTab.value === 'user-performance') {
      const data = await reportsApi.fetchUserPerformance(filters.value)
      performanceRows.value = data.rows
    }
    else if (activeTab.value === 'workload') {
      const data = await reportsApi.fetchWorkload(filters.value)
      workloadRows.value = data.rows
    }
    else if (activeTab.value === 'stage-duration') {
      const data = await reportsApi.fetchStageDuration(filters.value)
      stageRows.value = data.rows
    }
  }
  catch {
    toast.error('No se pudo cargar el reporte')
  }
  finally {
    loading.value = false
  }
}

async function exportCurrent(format: 'xlsx' | 'pdf') {
  exporting.value = true
  try {
    await reportsApi.exportReport(activeTab.value, format, filters.value)
    toast.success(format === 'xlsx' ? 'Excel descargado' : 'PDF descargado')
  }
  catch {
    toast.error('No se pudo exportar el reporte')
  }
  finally {
    exporting.value = false
  }
}

watch(activeTab, () => loadActiveReport())

onMounted(async () => {
  await loadCatalogs()
  await loadActiveReport()
})
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          Reportes workflow
        </h1>
        <p class="text-muted-foreground text-sm">
          Indicadores operativos y gerenciales del ciclo de tareas (WF-13 a WF-19).
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" :disabled="exporting || loading" @click="exportCurrent('xlsx')">
          Exportar Excel
        </Button>
        <Button variant="outline" size="sm" :disabled="exporting || loading" @click="exportCurrent('pdf')">
          Exportar PDF
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-1.5">
          <Label>Alcance</Label>
          <Select v-model="scope">
            <SelectTrigger>
              <SelectValue placeholder="Alcance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">
                Mis tareas
              </SelectItem>
              <SelectItem v-if="canViewTeam" value="area">
                Mi equipo / área
              </SelectItem>
              <SelectItem v-if="canViewAllTasks" value="all">
                Toda la organización
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Desde</Label>
          <Input v-model="filedFrom" type="date" />
        </div>
        <div class="space-y-1.5">
          <Label>Hasta</Label>
          <Input v-model="filedTo" type="date" />
        </div>
        <div class="space-y-1.5">
          <Label>Área</Label>
          <Select v-model="orgUnitId">
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas
              </SelectItem>
              <SelectItem v-for="unit in orgUnits" :key="unit.id" :value="String(unit.id)">
                {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Responsable</Label>
          <Select v-model="assigneeUserId">
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos
              </SelectItem>
              <SelectItem v-for="user in users" :key="user.id" :value="String(user.id)">
                {{ user.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Tipo funcional</Label>
          <Select v-model="functionalTypeKey">
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos
              </SelectItem>
              <SelectItem v-for="type in functionalTypes" :key="type.key" :value="type.key">
                {{ type.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Flujo</Label>
          <Select v-model="workflowDefinitionId">
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos
              </SelectItem>
              <SelectItem v-for="def in definitions" :key="def.id" :value="String(def.id)">
                {{ def.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="activeTab === 'workload'" class="space-y-1.5">
          <Label>Agrupar carga por</Label>
          <Select v-model="workloadGroupBy">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">
                Usuario
              </SelectItem>
              <SelectItem value="org_unit">
                Área
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-end">
          <Button class="w-full" :disabled="loading" @click="loadActiveReport">
            {{ loading ? 'Cargando…' : 'Aplicar filtros' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="tab in REPORT_TABS"
        :key="tab.id"
        size="sm"
        :variant="activeTab === tab.id ? 'default' : 'outline'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          {{ REPORT_TABS.find(t => t.id === activeTab)?.label }}
        </CardTitle>
        <CardDescription>
          {{ REPORT_TABS.find(t => t.id === activeTab)?.description }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground text-sm">
          Cargando reporte…
        </div>

        <template v-else-if="activeTab === 'dashboard' && dashboard">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border p-4">
              <p class="text-muted-foreground text-xs">
                % cumplimiento SLA
              </p>
              <p class="text-2xl font-semibold">
                {{ dashboard.kpis.on_time_percent ?? '—' }}%
              </p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-muted-foreground text-xs">
                Procesos activos
              </p>
              <p class="text-2xl font-semibold">
                {{ dashboard.kpis.active_instances }}
              </p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-muted-foreground text-xs">
                Tareas vencidas
              </p>
              <p class="text-2xl font-semibold text-destructive">
                {{ dashboard.kpis.overdue_open_tasks }}
              </p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-muted-foreground text-xs">
                Prom. horas respuesta
              </p>
              <p class="text-2xl font-semibold">
                {{ dashboard.kpis.avg_response_hours ?? '—' }}
              </p>
            </div>
          </div>

          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <div class="rounded-lg border p-4">
              <p class="mb-3 font-medium text-sm">
                Semáforo etapas activas
              </p>
              <div class="flex flex-wrap gap-3 text-sm">
                <Badge variant="outline">
                  En término: {{ dashboard.kpis.traffic_light.green }}
                </Badge>
                <Badge variant="warning">
                  Próximo: {{ dashboard.kpis.traffic_light.orange }}
                </Badge>
                <Badge variant="destructive">
                  Vencido: {{ dashboard.kpis.traffic_light.red }}
                </Badge>
              </div>
            </div>
            <div class="rounded-lg border p-4">
              <p class="mb-3 font-medium text-sm">
                Tendencia mensual (% cumplimiento)
              </p>
              <div class="space-y-2 text-sm">
                <div
                  v-for="trend in dashboard.trends"
                  :key="trend.period"
                  class="flex justify-between gap-2"
                >
                  <span>{{ trend.label }}</span>
                  <span class="text-muted-foreground">
                    {{ trend.completed_count }} cierres · {{ trend.on_time_percent ?? '—' }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'overdue-tasks'">
          <Table v-if="overdueRows.length">
            <TableHeader>
              <TableRow>
                <TableHead>Radicado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Retraso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in overdueRows" :key="row.task_id">
                <TableCell class="font-mono text-xs">
                  <NuxtLink v-if="row.filing_id" :to="`/ventanilla/${row.filing_id}`" class="underline">
                    {{ row.filing_number }}
                  </NuxtLink>
                </TableCell>
                <TableCell>{{ row.functional_type_label ?? row.functional_type_key }}</TableCell>
                <TableCell>{{ row.stage_name }}</TableCell>
                <TableCell>{{ row.assignee?.name ?? '—' }}</TableCell>
                <TableCell>{{ row.due_at ? new Date(row.due_at).toLocaleDateString('es-CO') : '—' }}</TableCell>
                <TableCell>{{ row.days_overdue ?? '—' }} d</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="py-8 text-center text-muted-foreground text-sm">
            Sin tareas vencidas con los filtros actuales.
          </p>
        </template>

        <template v-else-if="activeTab === 'sla-compliance' && slaSummary">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">Total completados</p>
              <p class="font-semibold">{{ slaSummary.total_completed }}</p>
            </div>
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">% cumplimiento SLA</p>
              <p class="font-semibold">{{ slaSummary.on_time_percent ?? '—' }}%</p>
            </div>
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">% fuera de término</p>
              <p class="font-semibold">{{ slaSummary.off_time_percent ?? '—' }}%</p>
            </div>
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">Promedio horas respuesta</p>
              <p class="font-semibold">{{ slaSummary.avg_response_hours ?? '—' }}</p>
            </div>
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">Procesos activos</p>
              <p class="font-semibold">{{ slaSummary.active_instances }}</p>
            </div>
            <div class="rounded-lg border p-3 text-sm">
              <p class="text-muted-foreground text-xs">Tareas vencidas abiertas</p>
              <p class="font-semibold text-destructive">{{ slaSummary.overdue_open_tasks }}</p>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'user-performance'">
          <Table v-if="performanceRows.length">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Asignadas</TableHead>
                <TableHead>Completadas</TableHead>
                <TableHead>Vencidas</TableHead>
                <TableHead>Prom. horas</TableHead>
                <TableHead>Productividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, idx) in performanceRows" :key="idx">
                <TableCell>{{ row.user?.name ?? '—' }}</TableCell>
                <TableCell>{{ row.assigned_count }}</TableCell>
                <TableCell>{{ row.completed_count }}</TableCell>
                <TableCell>{{ row.overdue_open_count }}</TableCell>
                <TableCell>{{ row.avg_completion_hours ?? '—' }}</TableCell>
                <TableCell>{{ row.productivity_percent ?? '—' }}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="py-8 text-center text-muted-foreground text-sm">
            Sin datos de desempeño.
          </p>
        </template>

        <template v-else-if="activeTab === 'workload'">
          <Table v-if="workloadRows.length">
            <TableHeader>
              <TableRow>
                <TableHead>Agrupación</TableHead>
                <TableHead>Activas</TableHead>
                <TableHead>Vencidas</TableHead>
                <TableHead>Por vencer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, idx) in workloadRows" :key="idx">
                <TableCell>{{ row.label }}</TableCell>
                <TableCell>{{ row.active_count }}</TableCell>
                <TableCell>{{ row.overdue_count }}</TableCell>
                <TableCell>{{ row.due_soon_count }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="py-8 text-center text-muted-foreground text-sm">
            Sin carga laboral registrada.
          </p>
        </template>

        <template v-else-if="activeTab === 'stage-duration'">
          <Table v-if="stageRows.length">
            <TableHeader>
              <TableRow>
                <TableHead>Flujo</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Muestras</TableHead>
                <TableHead>Prom. horas</TableHead>
                <TableHead>Máx. horas</TableHead>
                <TableHead>Tarde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, idx) in stageRows" :key="idx">
                <TableCell>{{ row.workflow?.name ?? '—' }}</TableCell>
                <TableCell>{{ row.stage?.name ?? '—' }}</TableCell>
                <TableCell>{{ row.sample_count }}</TableCell>
                <TableCell>{{ row.avg_hours }}</TableCell>
                <TableCell>{{ row.max_hours }}</TableCell>
                <TableCell>{{ row.completed_late_count }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="py-8 text-center text-muted-foreground text-sm">
            Sin histórico de etapas completadas.
          </p>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
