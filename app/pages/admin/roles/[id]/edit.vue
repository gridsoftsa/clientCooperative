<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Role, Permission } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles.edit'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const roleId = route.params.id as string

const form = ref({
  name: '',
  permissions: [] as string[],
})

const role = ref<Role | null>(null)
const permissions = ref<Permission[]>([])
const loading = ref(false)
const saving = ref(false)

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  
  permissions.value.forEach(permission => {
    const [category] = permission.name.split('.')
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(permission)
  })
  
  return groups
})

const fetchRole = async () => {
  loading.value = true
  try {
    const response = await $api<{ data: Role }>(`/roles/${roleId}`)
    role.value = response.data
    form.value = {
      name: response.data.name,
      permissions: response.data.permissions || [],
    }
  } catch (error) {
    console.error('Error fetching role:', error)
    toast.error('Error al cargar el rol')
    router.push('/admin/roles')
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res = await $api<{ data: Permission[] }>('/roles/permissions')
    permissions.value = res.data
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    toast.error('Error al cargar permisos')
  }
}

const togglePermission = (permissionName: string, checked: boolean) => {
  if (checked) {
    if (!form.value.permissions.includes(permissionName)) {
      form.value.permissions.push(permissionName)
    }
  } else {
    const index = form.value.permissions.indexOf(permissionName)
    if (index > -1) {
      form.value.permissions.splice(index, 1)
    }
  }
}

const toggleCategory = (category: string) => {
  const categoryPermissions = groupedPermissions.value[category] || []
  const allSelected = categoryPermissions.every(p => form.value.permissions.includes(p.name))
  
  if (allSelected) {
    // Deseleccionar todos
    categoryPermissions.forEach(p => {
      const index = form.value.permissions.indexOf(p.name)
      if (index > -1) {
        form.value.permissions.splice(index, 1)
      }
    })
  } else {
    // Seleccionar todos
    categoryPermissions.forEach(p => {
      if (!form.value.permissions.includes(p.name)) {
        form.value.permissions.push(p.name)
      }
    })
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }

  saving.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        permissions: form.value.permissions,
      },
    })
    
    toast.success('Rol actualizado correctamente')
    router.push('/admin/roles')
  } catch (error: any) {
    console.error('Error saving role:', error)
    const message = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al actualizar el rol'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchRole(), fetchPermissions()])
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Rol
        </h2>
        <p class="text-muted-foreground" v-if="role">
          Modifica el rol: {{ role.name }}
        </p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card v-if="loading">
      <CardContent class="p-6">
        <div class="flex items-center justify-center">
          <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
        </div>
      </CardContent>
    </Card>

    <form v-else-if="role" @submit.prevent="handleSubmit">
      <div class="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Rol</CardTitle>
            <CardDescription>
              Información básica del rol
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <Label for="name">Nombre del Rol *</Label>
              <Input
                id="name"
                v-model="form.name"
                required
                placeholder="Ej: moderador, editor, supervisor..."
                :disabled="['admin', 'user'].includes(role.name)"
              />
              <p v-if="['admin', 'user'].includes(role.name)" class="text-sm text-muted-foreground mt-1">
                Este es un rol del sistema y no se puede modificar su nombre
              </p>
              <p v-else class="text-sm text-muted-foreground mt-1">
                El nombre debe ser único y en minúsculas (ej: moderador, editor)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>
              Selecciona los permisos que tendrá este rol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-6">
              <div
                v-for="(categoryPermissions, category) in groupedPermissions"
                :key="category"
                class="space-y-3"
              >
                <div class="flex items-center justify-between border-b pb-2">
                  <h3 class="font-semibold capitalize">{{ category }}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="toggleCategory(category)"
                  >
                    {{ categoryPermissions.every(p => form.permissions.includes(p.name)) ? 'Deseleccionar todos' : 'Seleccionar todos' }}
                  </Button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div
                    v-for="permission in categoryPermissions"
                    :key="permission.id"
                    class="flex items-center space-x-2"
                  >
                    <Checkbox
                      :id="`permission-${permission.id}`"
                      :checked="form.permissions.includes(permission.name)"
                      @update:checked="(checked: boolean) => togglePermission(permission.name, checked)"
                    />
                    <Label
                      :for="`permission-${permission.id}`"
                      class="font-normal cursor-pointer text-sm"
                    >
                      {{ permission.name }}
                    </Label>
                  </div>
                </div>
              </div>

              <div v-if="Object.keys(groupedPermissions).length === 0" class="text-center py-8 text-muted-foreground">
                No hay permisos disponibles
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end gap-4">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Actualizar Rol' }}
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>
