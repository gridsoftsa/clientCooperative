<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import type { Role, Permission } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_editar'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { refetchUserSilently } = useAuth()
const roleId = route.params.id as string

const formData = ref({
  name: '',
  permissions: [] as string[],
})

const role = ref<Role | null>(null)
const permissions = ref<Permission[]>([])
const loading = ref(false)
const saving = ref(false)
const savingPermissions = ref(false)
/** Evita PUT al hidratar el rol desde el servidor. */
const skipPermissionAutoSave = ref(true)

const debouncedPersistPermissions = useDebounceFn(async () => {
  if (skipPermissionAutoSave.value || !role.value) {
    return
  }
  if (!formData.value.name.trim()) {
    return
  }
  savingPermissions.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: { name: formData.value.name, permissions: formData.value.permissions },
    })
    await refetchUserSilently()
    toast.success('Permisos guardados', {
      id: 'role-permissions-auto-save',
      description: 'Los cambios ya quedaron registrados en el rol.',
      duration: 3500,
    })
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Error al guardar permisos')
  } finally {
    savingPermissions.value = false
  }
}, 450)

watch(
  () => formData.value.permissions,
  () => {
    debouncedPersistPermissions()
  },
  { deep: true },
)

function normalizePermissionNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => (typeof p === 'string' ? p : (p as { name?: string })?.name))
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

const fetchRole = async () => {
  loading.value = true
  try {
    const response = await $api<{ data: Role }>(`/roles/${roleId}`)
    role.value = response.data
    const permissionNames = normalizePermissionNames(response.data.permissions)
    formData.value = {
      name: response.data.name,
      permissions: permissionNames,
    }
  } catch (error) {
    console.error('Error fetching role:', error)
    toast.error('Error al cargar el rol')
    router.push('/settings/roles')
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

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }
  saving.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: { name: formData.value.name, permissions: formData.value.permissions },
    })
    await refetchUserSilently()
    toast.success('Rol actualizado correctamente')
    router.push('/settings/roles')
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al actualizar el rol'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchRole(), fetchPermissions()])
  await nextTick()
  skipPermissionAutoSave.value = false
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Editar Rol</h2>
        <p v-if="role" class="text-muted-foreground">Modifica el rol: {{ role.name }}</p>
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
            <CardDescription>Información básica del rol</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <Label for="name">Nombre del Rol *</Label>
              <Input
                id="name"
                v-model="formData.name"
                required
                placeholder="Ej: moderador, editor..."
                :disabled="['admin', 'user'].includes(role.name)"
              />
              <p v-if="['admin', 'user'].includes(role.name)" class="text-sm text-muted-foreground mt-1">
                Este es un rol del sistema y no se puede modificar su nombre
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div class="min-w-0 flex-1">
              <CardTitle>Permisos</CardTitle>
              <CardDescription>
                Busca por nombre o módulo. Los cambios se guardan automáticamente al marcar o desmarcar.
              </CardDescription>
            </div>
            <span
              v-if="savingPermissions"
              class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Icon name="i-lucide-loader-2" class="h-3.5 w-3.5 animate-spin" />
              Guardando permisos…
            </span>
          </CardHeader>
          <CardContent>
            <SettingsRolePermissionsPicker
              v-model="formData.permissions"
              :permissions="permissions"
              :loading="loading"
            />
          </CardContent>
        </Card>

        <div class="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
          <p class="max-w-md text-right text-xs text-muted-foreground">
            Los permisos ya se sincronizan con el servidor al marcarlos. Usa el botón solo para guardar el nombre del rol.
          </p>
          <div class="flex gap-4">
            <Button type="button" variant="outline" @click="router.back()">Cancelar</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Guardar nombre del rol' }}
            </Button>
          </div>
        </div>
      </div>
    </form>
    </div>
  </SettingsLayout>
</template>
