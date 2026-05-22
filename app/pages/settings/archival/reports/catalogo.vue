<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_reportes_ver'],
})

const router = useRouter()
const { fetchCatalogReport, exportCatalog } = useArchivalReportsApi()
const { hasPermission } = usePermissions()

const level = ref<'series' | 'subseries' | 'document_type'>('document_type')
const activeOnly = ref(false)
const loading = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)
const data = ref<{ filters: Record<string, unknown>, rows: Array<Record<string, unknown>> } | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = await fetchCatalogReport({
      level: level.value,
      active_only: activeOnly.value,
    })
  } catch {
    toast.error('No se pudo cargar el reporte de catálogo')
    data.value = null
  } finally {
    loading.value = false
  }
}

async function doExport(format: 'xlsx' | 'pdf') {
  if (!hasPermission('trd_reportes_exportar')) {
    toast.error('No tiene permiso para exportar reportes archivísticos')
    return
  }
  const flag = format === 'xlsx' ? exportingXlsx : exportingPdf
  flag.value = true
  try {
    await exportCatalog({ level: level.value, active_only: activeOnly.value }, format)
    toast.success(format === 'xlsx' ? 'Excel generado' : 'PDF generado')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al exportar')
  } finally {
    flag.value = false
  }
}

onMounted(load)
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
            Catálogo documental
          </h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <PermissionGate permission="trd_reportes_exportar">
            <Button variant="outline" :disabled="exportingXlsx || loading" @click="doExport('xlsx')">
              <Icon name="i-lucide-file-spreadsheet" class="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" :disabled="exportingPdf || loading" @click="doExport('pdf')">
              <Icon name="i-lucide-file-text" class="mr-2 h-4 w-4" />
              PDF
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardContent class="pt-6 flex flex-wrap gap-4 items-end">
          <div class="space-y-2">
            <Label>Nivel</Label>
            <Select v-model="level">
              <SelectTrigger class="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="series">
                  Series
                </SelectItem>
                <SelectItem value="subseries">
                  Subseries
                </SelectItem>
                <SelectItem value="document_type">
                  Tipos documentales
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2 pb-2">
            <Checkbox id="active_only" v-model="activeOnly" />
            <Label for="active_only" class="cursor-pointer">
              Solo activos
            </Label>
          </div>
          <Button :disabled="loading" @click="load">
            Consultar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Resultados ({{ data?.rows?.length ?? 0 }})
          </CardTitle>
        </CardHeader>
        <CardContent class="overflow-x-auto">
          <table v-if="data?.rows?.length" class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Código
                </th>
                <th class="p-2">
                  Nombre
                </th>
                <th class="p-2">
                  Activo
                </th>
                <th v-if="level !== 'series'" class="p-2">
                  Padre / serie
                </th>
                <th class="p-2">
                  TRD (versiones)
                </th>
                <th class="p-2">
                  Radicación
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.rows" :key="String(row.id)" class="border-b border-border/60">
                <td class="p-2 font-mono text-xs">
                  {{ row.code }}
                </td>
                <td class="p-2">
                  {{ row.name }}
                </td>
                <td class="p-2">
                  {{ row.is_active ? 'Sí' : 'No' }}
                </td>
                <td v-if="level === 'subseries'" class="p-2 text-xs text-muted-foreground">
                  {{ row.parent_code }} — {{ row.parent_name }}
                </td>
                <td v-if="level === 'document_type'" class="p-2 text-xs text-muted-foreground">
                  {{ row.series_code }} / {{ row.parent_code }}
                </td>
                <td class="p-2">
                  {{ row.trd_versions_count }}
                </td>
                <td class="p-2">
                  {{ row.radicacion_documents_count }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            Sin registros para los filtros indicados.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
