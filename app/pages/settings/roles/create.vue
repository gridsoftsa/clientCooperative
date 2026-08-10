<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Permission } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_crear',
})

const { $api } = useNuxtApp()
const router = useRouter()
const route = useRoute()

const returnTo = computed(() => {
  const value = route.query.returnTo
  return typeof value === 'string' && value.startsWith('/') ? value : null
})

const fromUserCreate = computed(() => returnTo.value === '/settings/users/create')

function goBack() {
  if (returnTo.value) {
    router.push(returnTo.value)
    return
  }
  router.back()
}

const formData = ref({
  name: '',
  permissions: [] as string[],
})

const permissions = ref<Permission[]>([])
const loading = ref(false)
const saving = ref(false)

const fetchPermissions = async () => {
  loading.value = true
  try {
    const res = await $api<{ data: Permission[] }>('/roles/permissions')
    permissions.value = res.data
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    toast.error('Error al cargar permisos')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }
  saving.value = true
  try {
    const res = await $api<{ data: { name: string } }>('/roles', {
      method: 'POST',
      body: { name: formData.value.name, permissions: formData.value.permissions },
    })
    toast.success('Rol creado correctamente')
    if (returnTo.value) {
      await router.push({
        path: returnTo.value,
        query: { role_name: res.data.name },
      })
      return
    }
    router.push('/settings/roles')
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al crear el rol'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchPermissions())
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">
            Crear Nuevo Rol
          </h2>
          <p class="text-muted-foreground">
            {{
              fromUserCreate
                ? 'Al guardar volverá al alta de usuario con este rol preseleccionado.'
                : 'Define un nuevo rol y asigna sus permisos'
            }}
          </p>
        </div>
        <Button variant="outline" @click="goBack">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form @submit.prevent="handleSubmit">
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
                  placeholder="Ej: moderador, editor, supervisor..."
                />
                <p class="mt-1 text-sm text-muted-foreground">
                  El nombre debe ser único y en minúsculas (ej: moderador, editor)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos</CardTitle>
              <CardDescription>Selecciona los permisos que tendrá este rol</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsRolePermissionsPicker
                v-model="formData.permissions"
                :permissions="permissions"
                :loading="loading"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="goBack">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : (fromUserCreate ? 'Crear y volver al usuario' : 'Crear Rol') }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
