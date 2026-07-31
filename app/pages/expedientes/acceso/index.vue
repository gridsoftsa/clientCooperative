<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalAccessGrant } from '~/types/archival-access'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_acceso_gestionar',
})

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const FILTER_ALL = 'all'

const loading = ref(true)
const grants = ref<ArchivalAccessGrant[]>([])
const statusFilter = ref(FILTER_ALL)

const canReport = computed(() => hasPermission('expedientes_acceso_reporte'))

async function load() {
  loading.value = true
  try {
    grants.value = await archivalApi.fetchAccessGrants(
      statusFilter.value !== FILTER_ALL ? statusFilter.value : undefined,
    )
  }
  catch {
    toast.error('No se pudo cargar el control de acceso.')
  }
  finally {
    loading.value = false
  }
}

async function removeGrant(grant: ArchivalAccessGrant) {
  if (!confirm(`¿Eliminar el permiso de ${grant.grantable_label}?`)) {
    return
  }
  try {
    await archivalApi.deleteAccessGrant(grant.id)
    toast.success('Permiso eliminado.')
    await load()
  }
  catch {
    toast.error('No se pudo eliminar el permiso.')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Control de acceso documental
        </h1>
        <p class="text-sm text-muted-foreground">
          Permisos por usuario o rol sobre tipos de expediente, series, subseries o expedientes específicos.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="canReport" variant="outline" as-child>
          <NuxtLink to="/expedientes/acceso/reporte">
            Ver reporte
          </NuxtLink>
        </Button>
        <Button as-child>
          <NuxtLink to="/expedientes/acceso/nuevo">
            Nuevo permiso
          </NuxtLink>
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="flex flex-row flex-wrap items-end justify-between gap-3">
        <div class="space-y-2">
          <Label>Estado</Label>
          <Select v-model="statusFilter" @update:model-value="load">
            <SelectTrigger class="w-48">
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
        <Button variant="secondary" type="button" @click="load">
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando...
        </div>
        <div v-else-if="grants.length === 0" class="py-10 text-center text-muted-foreground">
          No hay permisos configurados. Mientras no existan grants activos, el acceso depende solo de los permisos del sistema.
        </div>
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatario</TableHead>
                <TableHead>Permiso</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="grant in grants" :key="grant.id">
                <TableCell>
                  <div class="font-medium">
                    {{ grant.grantable_label }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ grant.grantable_type === 'role' ? 'Rol' : 'Usuario' }}
                  </div>
                </TableCell>
                <TableCell>{{ grant.permission_label }}</TableCell>
                <TableCell class="max-w-xs text-sm">
                  <div v-if="grant.archival_file_type">
                    Tipo: {{ grant.archival_file_type.name }}
                  </div>
                  <div v-if="grant.doc_series">
                    Serie: {{ grant.doc_series.code }} {{ grant.doc_series.name }}
                  </div>
                  <div v-if="grant.doc_subseries">
                    Subserie: {{ grant.doc_subseries.name }}
                  </div>
                  <div v-if="grant.doc_document_type">
                    Tipo doc.: {{ grant.doc_document_type.name }}
                  </div>
                  <div v-if="grant.archival_file">
                    Exp.: {{ grant.archival_file.file_number }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {{ grant.status_label }}
                  </Badge>
                </TableCell>
                <TableCell class="text-xs text-muted-foreground">
                  <div v-if="grant.starts_at">
                    Desde {{ new Date(grant.starts_at).toLocaleDateString('es-CO') }}
                  </div>
                  <div v-if="grant.ends_at">
                    Hasta {{ new Date(grant.ends_at).toLocaleDateString('es-CO') }}
                  </div>
                  <div v-if="!grant.starts_at && !grant.ends_at">
                    Sin límite
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" as-child>
                      <NuxtLink :to="`/expedientes/acceso/${grant.id}`">
                        Editar
                      </NuxtLink>
                    </Button>
                    <Button variant="ghost" size="sm" type="button" @click="removeGrant(grant)">
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
