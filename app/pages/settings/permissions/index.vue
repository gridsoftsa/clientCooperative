<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Permission, PaginatedPermissions } from '~/types/role'
import { PERMISSION_CATEGORY_LABELS, formatPermissionDisplayName } from '~/constants/permission-labels'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'permisos_ver'
})

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const deleteWithReason = useApiDeleteWithReason()
const deletePermissionDialogOpen = ref(false)
const permissionPendingDelete = ref<{ id: number; name: string } | null>(null)
const deletingPermission = ref(false)

const permissions = ref<Permission[]>([])
const loading = ref(false)
const searchQuery = ref('')
const showInactive = ref(false)

const canCreate = computed(() => hasPermission('permisos_crear'))
const canEdit = computed(() => hasPermission('permisos_editar'))
const canDelete = computed(() => hasPermission('permisos_eliminar'))

const groupedPermissions = computed(() => {
  const filtered = permissions.value.filter((p) => {
    if (searchQuery.value && !p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
      return false
    if (!showInactive.value && p.is_active === false)
      return false
    return true
  })
  const groups: Record<string, Permission[]> = {}
  for (const p of filtered) {
    const category = p.name.split('_')[0] ?? 'otros'
    if (!groups[category])
      groups[category] = []
    groups[category].push(p)
  }
  return groups
})

const getCategoryLabel = (key: string) => PERMISSION_CATEGORY_LABELS[key] ?? key

const openCategories = ref<Record<string, boolean>>({})

const collapseAll = () => {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map(c => [c, false]),
  )
}

const setCategoryOpen = (category: string, open: boolean) => {
  openCategories.value = { ...openCategories.value, [category]: open }
}

async function fetchPermissions() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      per_page: 500, // Traer todos para agrupar por categoría
    }
    if (searchQuery.value)
      params.search = searchQuery.value
    if (!showInactive.value)
      params.is_active = 1

    const res = await $api<PaginatedPermissions>('/permissions', { query: params })
    permissions.value = res.data
  } catch (error) {
    console.error('Error al cargar permisos:', error)
  } finally {
    loading.value = false
  }
}

async function handleToggleActive(permission: Permission) {
  try {
    await $api(`/permissions/${permission.id}`, {
      method: 'PUT',
      body: { is_active: !permission.is_active },
    })
    permissions.value = permissions.value.map(p =>
      p.id === permission.id ? { ...p, is_active: !p.is_active } : p,
    )
  } catch (error: any) {
    console.error('Error al actualizar permiso:', error)
    const message = error?.data?.message || 'Error al actualizar'
    alert(message)
  }
}

function openDeletePermissionDialog(id: number, name: string) {
  permissionPendingDelete.value = { id, name }
  deletePermissionDialogOpen.value = true
}

async function onDeletePermissionConfirm(reason: string) {
  const p = permissionPendingDelete.value
  if (!p || deletingPermission.value)
    return
  deletingPermission.value = true
  try {
    await deleteWithReason(`/permissions/${p.id}`, reason)
    deletePermissionDialogOpen.value = false
    permissionPendingDelete.value = null
    toast.success('Permiso eliminado')
    await fetchPermissions()
  } catch (error: any) {
    const message = error?.data?.message || 'Error al eliminar'
    toast.error(message)
  } finally {
    deletingPermission.value = false
  }
}

onMounted(() => fetchPermissions())

watch(deletePermissionDialogOpen, (v) => {
  if (!v)
    permissionPendingDelete.value = null
})

watch([searchQuery, showInactive], () => {
  const t = setTimeout(() => fetchPermissions(), 400)
  return () => clearTimeout(t)
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Gestión de Permisos
      </h2>
      <PermissionGate permission="permisos_crear">
        <Button @click="$router.push('/settings/permissions/create')">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nuevo Permiso
        </Button>
      </PermissionGate>
    </div>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Permisos del Sistema</CardTitle>
          <CardDescription>
            Crea, edita o desactiva permisos. Los permisos inactivos no conceden acceso.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" @click="collapseAll">
          <Icon name="i-lucide-chevrons-up-down" class="mr-2 h-4 w-4" />
          Contraer todo
        </Button>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <div class="relative flex-1 min-w-[200px]">
              <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input v-model="searchQuery" placeholder="Buscar por nombre..." class="pl-9" />
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="show-inactive" :model-value="showInactive" @update:model-value="(v: boolean) => showInactive = v" />
              <Label for="show-inactive" class="font-normal cursor-pointer text-sm">Mostrar inactivos</Label>
            </div>
          </div>

          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
          </div>

          <div v-else-if="Object.keys(groupedPermissions).length === 0" class="text-center py-8 text-muted-foreground">
            No hay permisos
          </div>

          <div v-else class="space-y-2">
            <Collapsible
              v-for="(categoryPermissions, category) in groupedPermissions"
              :key="category"
              :open="openCategories[category] ?? true"
              class="group/perm border rounded-lg"
              @update:open="(v) => setCategoryOpen(category, v)"
            >
              <div class="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg">
                <CollapsibleTrigger as-child>
                  <button
                    type="button"
                    class="flex items-center gap-2 w-full text-left font-semibold hover:opacity-80"
                  >
                    <Icon
                      name="i-lucide-chevron-down"
                      class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/perm:rotate-180"
                    />
                    {{ getCategoryLabel(category) }}
                    <Badge variant="secondary" class="ml-2">
                      {{ categoryPermissions.length }}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 border-t">
                  <div
                    v-for="p in categoryPermissions"
                    :key="p.id"
                    class="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50"
                  >
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <Switch
                        v-if="canEdit"
                        :model-value="p.is_active !== false"
                        @update:model-value="() => handleToggleActive(p)"
                      />
                      <Badge v-else :variant="p.is_active !== false ? 'default' : 'secondary'" class="shrink-0">
                        {{ p.is_active !== false ? 'Activo' : 'Inactivo' }}
                      </Badge>
                      <Label class="font-normal text-sm truncate">
                        {{ formatPermissionDisplayName(p.name) }}
                      </Label>
                    </div>
                    <div class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <PermissionGate permission="permisos_editar">
                        <Button variant="warning" size="sm" class="h-8 gap-1.5" @click="$router.push(`/settings/permissions/${p.id}/edit`)">
                          <Icon name="i-lucide-edit" class="h-3.5 w-3.5 shrink-0" />
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="permisos_eliminar">
                        <Button variant="destructive" size="sm" class="h-8 gap-1.5" @click="() => openDeletePermissionDialog(p.id, p.name)">
                          <Icon name="i-lucide-trash" class="h-3.5 w-3.5 shrink-0" />
                          Eliminar
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>

    <ConfirmWithReasonDialog
      v-model:open="deletePermissionDialogOpen"
      title="Eliminar permiso"
      :description="permissionPendingDelete
        ? `Se eliminará “${formatPermissionDisplayName(permissionPendingDelete.name)}” de todos los roles y usuarios. Indica el motivo.`
        : ''"
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deletingPermission"
      @confirm="onDeletePermissionConfirm"
    />
  </SettingsLayout>
</template>
