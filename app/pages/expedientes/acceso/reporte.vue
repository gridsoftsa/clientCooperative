<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalAccessControlReportRow } from '~/types/archival-access'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_acceso_reporte',
})

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const FILTER_ALL = 'all'

const loading = ref(true)
const rows = ref<ArchivalAccessControlReportRow[]>([])
const fileTypeId = ref('')
const status = ref(FILTER_ALL)
const permission = ref(FILTER_ALL)

const canManage = computed(() => hasPermission('expedientes_acceso_gestionar'))

async function load() {
  loading.value = true
  try {
    const res = await archivalApi.fetchAccessControlReport({
      archival_file_type_id: fileTypeId.value ? Number(fileTypeId.value) : undefined,
      status: status.value !== FILTER_ALL ? status.value : undefined,
      permission: permission.value !== FILTER_ALL ? permission.value : undefined,
    })
    rows.value = res.data ?? []
  }
  catch {
    toast.error('No se pudo cargar el reporte de acceso.')
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Reporte de control de acceso
        </h1>
        <p class="text-sm text-muted-foreground">
          Consulta quién tiene permisos sobre tipos de expediente, series, subseries y documentos.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" as-child>
          <NuxtLink to="/expedientes/acceso">
            Volver al listado
          </NuxtLink>
        </Button>
        <Button v-if="canManage" as-child>
          <NuxtLink to="/expedientes/acceso/nuevo">
            Nuevo permiso
          </NuxtLink>
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="space-y-2">
          <Label>Estado</Label>
          <Select v-model="status">
            <SelectTrigger class="w-44">
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
        <div class="space-y-2">
          <Label>Permiso</Label>
          <Select v-model="permission">
            <SelectTrigger class="w-48">
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
        <Button type="button" @click="load">
          Aplicar
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Resultados
          <span class="ml-2 text-sm font-normal text-muted-foreground">({{ rows.length }})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando reporte...
        </div>
        <div v-else-if="rows.length === 0" class="py-10 text-center text-muted-foreground">
          No hay registros con los filtros seleccionados.
        </div>
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo expediente</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Subserie</TableHead>
                <TableHead>Tipo documental</TableHead>
                <TableHead>Expediente</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Permiso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Autorizado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in rows" :key="row.id">
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
                <TableCell class="text-sm">
                  {{ row.archival_file }}
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
  </div>
</template>
