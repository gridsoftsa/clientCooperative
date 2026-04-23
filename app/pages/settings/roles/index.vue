<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Role, PaginatedRoles } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_ver'
})

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const { refetchUserSilently } = useAuth()
const deleteWithReason = useApiDeleteWithReason()
const deleteRoleDialogOpen = ref(false)
const rolePendingDelete = ref<{ id: number; name: string } | null>(null)
const deletingRole = ref(false)

const roles = ref<Role[]>([])
const loading = ref(false)
const searchQuery = ref('')
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0
})

const canCreate = computed(() => hasPermission('roles_crear'))
const canEdit = computed(() => hasPermission('roles_editar'))
const canDelete = computed(() => hasPermission('roles_eliminar'))

async function fetchRoles() {
  loading.value = true
  try {
    const params: any = {
      per_page: pagination.value.per_page,
      page: pagination.value.current_page
    }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const res = await $api<PaginatedRoles>('/roles', { query: params })
    roles.value = res.data
    pagination.value = res.meta
  } catch (error) {
    console.error('Error al cargar roles:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.current_page = 1
  fetchRoles()
}

function handlePageChange(page: number) {
  pagination.value.current_page = page
  fetchRoles()
}

function openDeleteRoleDialog(id: number, name: string) {
  if (['admin', 'user'].includes(name)) {
    toast.error('No se puede eliminar este rol del sistema')
    return
  }
  rolePendingDelete.value = { id, name }
  deleteRoleDialogOpen.value = true
}

async function onDeleteRoleConfirm(reason: string) {
  const role = rolePendingDelete.value
  if (!role || deletingRole.value)
    return
  deletingRole.value = true
  try {
    await deleteWithReason(`/roles/${role.id}`, reason)
    deleteRoleDialogOpen.value = false
    rolePendingDelete.value = null
    toast.success('Rol eliminado')
    await fetchRoles()
    await refetchUserSilently()
  } catch (error: any) {
    console.error('Error al eliminar rol:', error)
    const message = error?.data?.message || error?.message || 'Error al eliminar el rol'
    toast.error(message)
  } finally {
    deletingRole.value = false
  }
}

onMounted(() => {
  fetchRoles()
})

watch(deleteRoleDialogOpen, (v) => {
  if (!v)
    rolePendingDelete.value = null
})

watch(searchQuery, () => {
  // Debounce search
  const timeout = setTimeout(() => {
    handleSearch()
  }, 500)
  return () => clearTimeout(timeout)
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Gestión de Roles y Permisos
      </h2>
      <PermissionGate permission="roles_crear">
        <Button @click="$router.push('/settings/roles/create')">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nuevo Rol
        </Button>
      </PermissionGate>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Roles del Sistema</CardTitle>
        <CardDescription>
          Gestiona los roles y sus permisos asociados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- Buscador -->
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Buscar por nombre..."
                class="pl-9"
              />
            </div>
          </div>

          <!-- Tabla -->
          <div v-if="loading" class="flex items-center justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
          </div>
          
          <div v-else-if="roles.length === 0" class="text-center py-8 text-muted-foreground">
            No hay roles registrados
          </div>

          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead class="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="role in roles" :key="role.id">
                  <TableCell class="font-medium">{{ role.id }}</TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ role.name }}</span>
                      <Badge v-if="role.name === 'admin'" variant="default">Sistema</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex gap-1 flex-wrap max-w-md">
                      <Badge 
                        v-for="permission in (role.permissions || []).slice(0, 3)" 
                        :key="permission" 
                        variant="outline"
                        class="text-xs"
                      >
                        {{ permission }}
                      </Badge>
                      <Badge 
                        v-if="(role.permissions || []).length > 3" 
                        variant="secondary"
                        class="text-xs"
                      >
                        +{{ (role.permissions || []).length - 3 }} más
                      </Badge>
                      <span v-if="(role.permissions || []).length === 0" class="text-muted-foreground text-sm">Sin permisos</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {{ new Date(role.created_at).toLocaleDateString() }}
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <PermissionGate permission="roles_editar">
                        <Button
                          variant="warning"
                          size="sm"
                          class="gap-1.5"
                          @click="$router.push(`/settings/roles/${role.id}/edit`)"
                        >
                          <Icon name="i-lucide-edit" class="h-4 w-4 shrink-0" />
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="roles_eliminar">
                        <Button
                          variant="destructive"
                          size="sm"
                          class="gap-1.5"
                          @click="() => openDeleteRoleDialog(role.id, role.name)"
                          :disabled="['admin', 'user'].includes(role.name)"
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

          <!-- Paginación -->
          <div v-if="pagination.last_page > 1" class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              Mostrando {{ ((pagination.current_page - 1) * pagination.per_page) + 1 }} a 
              {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} de 
              {{ pagination.total }} roles
            </div>
            <div class="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                :disabled="pagination.current_page === 1"
                @click="handlePageChange(pagination.current_page - 1)"
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                :disabled="pagination.current_page === pagination.last_page"
                @click="handlePageChange(pagination.current_page + 1)"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>

    <ConfirmWithReasonDialog
      v-model:open="deleteRoleDialogOpen"
      title="Eliminar rol"
      :description="rolePendingDelete
        ? `Se eliminará el rol “${rolePendingDelete.name}”. Indica el motivo.`
        : ''"
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deletingRole"
      @confirm="onDeleteRoleConfirm"
    />
  </SettingsLayout>
</template>
