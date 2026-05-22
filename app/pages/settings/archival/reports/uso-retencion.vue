<script setup lang="ts">
import { toast } from 'vue-sonner'
import { TRD_INHERITED_FROM_LABELS, TRD_VERSION_STATUS_LABELS } from '~/constants/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_reportes_ver'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const { fetchCatalogUsageReport, exportCatalogUsage } = useArchivalReportsApi()
const { hasPermission } = usePermissions()

const orgUnitId = ref<number | undefined>(undefined)
const versionStatus = ref<string | undefined>('active')
const activeCatalogOnly = ref(true)
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
    data.value = await fetchCatalogUsageReport({
      org_unit_id: orgUnitId.value ?? null,
      version_status: versionStatus.value ?? null,
      active_catalog_only: activeCatalogOnly.value,
    })
  } catch {
    toast.error('No se pudo cargar el reporte de uso y retención')
    data.value = null
  } finally {
    loading.value = false
  }
}

async function doExport(format: 'xlsx' | 'pdf') {
  if (!hasPermission('trd_reportes_exportar')) {
    toast.error('No tiene permiso para exportar')
    return
  }
  const flag = format === 'xlsx' ? exportingXlsx : exportingPdf
  flag.value = true
  try {
    await exportCatalogUsage({
      org_unit_id: orgUnitId.value ?? null,
      version_status: versionStatus.value ?? null,
      active_catalog_only: activeCatalogOnly.value,
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
            Uso del catálogo y retención efectiva
          </h2>
          <p class="text-sm text-muted-foreground max-w-3xl">
            Por cada tipo asociado a una versión TRD: reglas propias del tipo y retención efectiva (herencia tipo → subserie → serie).
          </p>
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
        <CardContent class="pt-6 flex flex-wrap gap-4 items-end">
          <div class="space-y-2 min-w-[240px]">
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
            <Label>Estado versión</Label>
            <Select v-model="versionStatus">
              <SelectTrigger class="w-[160px]">
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
          <div class="flex items-center gap-2 pb-2">
            <Checkbox id="cat_active" v-model="activeCatalogOnly" />
            <Label for="cat_active" class="cursor-pointer">
              Solo tipos activos
            </Label>
          </div>
          <Button :disabled="loading" @click="load">
            Consultar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 overflow-x-auto">
          <table v-if="data?.rows?.length" class="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Tipo documental
                </th>
                <th class="p-2">
                  Área / versión
                </th>
                <th class="p-2">
                  Propia (G / C)
                </th>
                <th class="p-2">
                  Efectiva (G / C / H)
                </th>
                <th class="p-2">
                  Heredado de
                </th>
                <th class="p-2">
                  Radicación
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in data.rows" :key="`${row.version_id}-${row.document_type_id}-${idx}`" class="border-b">
                <td class="p-2">
                  <span class="font-mono">{{ row.document_type_code }}</span>
                  — {{ row.document_type_name }}
                </td>
                <td class="p-2">
                  {{ row.org_unit_code }} · v{{ row.version_number }}
                  ({{ TRD_VERSION_STATUS_LABELS[String(row.version_status)] ?? row.version_status }})
                </td>
                <td class="p-2">
                  {{ row.direct_rule_years_management ?? '—' }} / {{ row.direct_rule_years_central ?? '—' }}
                </td>
                <td class="p-2">
                  {{ row.effective_years_management ?? '—' }} / {{ row.effective_years_central ?? '—' }} / {{ row.effective_years_historical ?? '—' }}
                  <span v-if="row.effective_final_disposition" class="block text-muted-foreground">{{ row.effective_final_disposition }}</span>
                </td>
                <td class="p-2">
                  {{ TRD_INHERITED_FROM_LABELS[String(row.effective_inherited_from)] ?? row.effective_inherited_from ?? '—' }}
                </td>
                <td class="p-2">
                  {{ row.radicacion_documents_count }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            Sin asociaciones para los filtros indicados.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
