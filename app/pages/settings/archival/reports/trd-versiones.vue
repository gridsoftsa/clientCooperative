<script setup lang="ts">
import { toast } from 'vue-sonner'
import { TRD_VERSION_STATUS_LABELS } from '~/constants/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_reportes_ver'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const { fetchTrdVersionsReport, exportTrdVersions } = useArchivalReportsApi()
const { hasPermission } = usePermissions()

const orgUnitId = ref<number | undefined>(undefined)
const status = ref<string | undefined>(undefined)
const approvedFrom = ref('')
const approvedTo = ref('')
const loading = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)
const data = ref<{ filters: Record<string, unknown>, rows: Array<Record<string, unknown>> } | null>(null)
const units = ref<Array<{ id: number, name: string, code: string }>>([])

async function loadUnits() {
  try {
    const res = await $api<{ data: Array<{ id: number, name: string, code: string, is_document_producer?: boolean }> }>(
      '/organizational-structure/org-units',
      { query: { per_page: 200, is_active: true } },
    )
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
  } catch {
    units.value = []
  }
}

async function load() {
  loading.value = true
  try {
    data.value = await fetchTrdVersionsReport({
      org_unit_id: orgUnitId.value ?? null,
      status: status.value ?? null,
      approved_from: approvedFrom.value || null,
      approved_to: approvedTo.value || null,
    })
  } catch {
    toast.error('No se pudo cargar el reporte de versiones TRD')
    data.value = null
  } finally {
    loading.value = false
  }
}

function statusLabel(s: unknown): string {
  const key = String(s ?? '')
  return TRD_VERSION_STATUS_LABELS[key] ?? key
}

async function doExport(format: 'xlsx' | 'pdf') {
  if (!hasPermission('trd_reportes_exportar')) {
    toast.error('No tiene permiso para exportar')
    return
  }
  const flag = format === 'xlsx' ? exportingXlsx : exportingPdf
  flag.value = true
  try {
    await exportTrdVersions({
      org_unit_id: orgUnitId.value ?? null,
      status: status.value ?? null,
      approved_from: approvedFrom.value || null,
      approved_to: approvedTo.value || null,
    }, format)
    toast.success('Archivo generado')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al exportar')
  } finally {
    flag.value = false
  }
}

onMounted(async () => {
  await loadUnits()
  await load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival/reports')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Reportes
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Versiones TRD
          </h2>
        </div>
        <PermissionGate permission="trd_reportes_exportar">
          <div class="flex gap-2">
            <Button variant="outline" :disabled="exportingXlsx || loading" @click="doExport('xlsx')">
              Excel
            </Button>
            <Button variant="outline" :disabled="exportingPdf || loading" @click="doExport('pdf')">
              PDF
            </Button>
          </div>
        </PermissionGate>
      </div>

      <Card>
        <CardContent class="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div class="space-y-2">
            <Label>Área productora</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Estado</Label>
            <Select v-model="status">
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  Borrador
                </SelectItem>
                <SelectItem value="active">
                  Vigente
                </SelectItem>
                <SelectItem value="inactive">
                  Inactiva
                </SelectItem>
                <SelectItem value="superseded">
                  Reemplazada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Aprobación desde</Label>
            <Input v-model="approvedFrom" type="date" />
          </div>
          <div class="space-y-2">
            <Label>Aprobación hasta</Label>
            <Input v-model="approvedTo" type="date" />
          </div>
          <Button class="sm:col-span-2 lg:col-span-4 w-fit" :disabled="loading" @click="load">
            Consultar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 overflow-x-auto">
          <table v-if="data?.rows?.length" class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Área
                </th>
                <th class="p-2">
                  Versión
                </th>
                <th class="p-2">
                  Estado
                </th>
                <th class="p-2">
                  Aprobación
                </th>
                <th class="p-2">
                  Tipos
                </th>
                <th class="p-2">
                  Reglas
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.rows" :key="String(row.version_id)" class="border-b">
                <td class="p-2">
                  {{ row.org_unit_name }} ({{ row.org_unit_code }})
                </td>
                <td class="p-2">
                  v{{ row.version_number }}
                </td>
                <td class="p-2">
                  {{ statusLabel(row.status) }}
                </td>
                <td class="p-2">
                  {{ row.approved_at ?? '—' }}
                </td>
                <td class="p-2">
                  {{ row.document_types_count }}
                </td>
                <td class="p-2">
                  {{ row.retention_rules_count }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            Sin versiones para los filtros indicados.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
