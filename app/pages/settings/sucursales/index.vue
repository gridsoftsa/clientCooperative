<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Sucursal } from '~/types/sucursal'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'sucursales_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()
const { hasPermission } = usePermissions()
const deleteWithReason = useApiDeleteWithReason()
const deleteSucursalDialogOpen = ref(false)
const sucursalIdPendingDelete = ref<number | null>(null)
const deletingSucursal = ref(false)

const sucursales = ref<Sucursal[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 50,
  total: 0,
})

async function fetchSucursales() {
  loading.value = true
  try {
    const res = await $api<{ data: Sucursal[]; meta: typeof pagination.value }>('/sucursales', {
      query: { per_page: pagination.value.per_page, page: pagination.value.current_page },
    })
    sucursales.value = res.data
    pagination.value = res.meta
  } catch (e) {
    console.error('Error al cargar sucursales:', e)
    toast.error('Error al cargar sucursales')
  } finally {
    loading.value = false
  }
}

function openDeleteSucursalDialog(id: number) {
  sucursalIdPendingDelete.value = id
  deleteSucursalDialogOpen.value = true
}

async function onDeleteSucursalConfirm(reason: string) {
  const id = sucursalIdPendingDelete.value
  if (id == null || deletingSucursal.value)
    return
  deletingSucursal.value = true
  try {
    await deleteWithReason(`/sucursales/${id}`, reason)
    deleteSucursalDialogOpen.value = false
    sucursalIdPendingDelete.value = null
    toast.success('Sucursal eliminada')
    await fetchSucursales()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al eliminar')
  } finally {
    deletingSucursal.value = false
  }
}

onMounted(() => {
  fetchSucursales()
})

watch(deleteSucursalDialogOpen, (v) => {
  if (!v)
    sucursalIdPendingDelete.value = null
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Sucursales
      </h2>
      <PermissionGate permission="sucursales_crear">
        <Button @click="router.push('/settings/sucursales/create')">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nueva Sucursal
        </Button>
      </PermissionGate>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Sedes de la cooperativa</CardTitle>
        <CardDescription>
          La sucursal marcada como principal es la matriz. Asigna usuarios y agencias a cada sede.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="sucursales.length === 0" class="text-center py-12 text-muted-foreground">
          No hay sucursales. Crea la primera.
        </div>
        <div v-else class="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in sucursales" :key="s.id">
                <TableCell class="font-medium">{{ s.name }}</TableCell>
                <TableCell>{{ s.code ?? '—' }}</TableCell>
                <TableCell>{{ s.city ?? '—' }}</TableCell>
                <TableCell>
                  <Badge v-if="s.is_main" variant="default">Principal</Badge>
                  <span v-else class="text-muted-foreground">—</span>
                </TableCell>
                <TableCell>
                  <Badge :variant="s.is_active ? 'default' : 'secondary'">
                    {{ s.is_active ? 'Activa' : 'Inactiva' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex flex-wrap items-center justify-end gap-2">
                    <PermissionGate permission="sucursales_editar">
                      <Button variant="warning" size="sm" class="gap-1.5" @click="router.push(`/settings/sucursales/${s.id}/edit`)">
                        <Icon name="i-lucide-edit" class="h-4 w-4 shrink-0" />
                        Editar
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="sucursales_eliminar">
                      <Button
                        variant="destructive"
                        size="sm"
                        class="gap-1.5"
                        :disabled="s.is_main"
                        @click="openDeleteSucursalDialog(s.id)"
                      >
                        <Icon name="i-lucide-trash" class="h-4 w-4 shrink-0" />
                        Eliminar
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </div>

    <ConfirmWithReasonDialog
      v-model:open="deleteSucursalDialogOpen"
      title="Eliminar sucursal"
      description="Se desvincularán usuarios y agencias vinculados. Indica el motivo de la eliminación."
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deletingSucursal"
      @confirm="onDeleteSucursalConfirm"
    />
  </SettingsLayout>
</template>
