<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import type { Role, Permission } from '~/types/role'
import {
  permissionDomainsForEnabledModules,
  type ProductModule,
} from '~/constants/application-domains'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_ver|roles_editar',
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { goBack } = useNavigationBack('/settings/roles')
const { refetchUserSilently } = useAuth()
const { hasPermission } = usePermissions()
const { manageableDomains } = useRoleAssignmentScope()
const roleId = route.params.id as string
const canEdit = computed(() => hasPermission('roles_editar'))

const activeTab = computed({
  get: () => (route.query.tab === 'usuarios' ? 'usuarios' : 'permisos'),
  set: (value: string) => {
    void router.replace({
      query: {
        ...route.query,
        tab: value === 'usuarios' ? 'usuarios' : undefined,
      },
    })
  },
})

const formData = ref({
  name: '',
  permissions: [] as string[],
  enabledModules: ['creditos', 'gestion_documental'] as ProductModule[],
})

const role = ref<Role | null>(null)
const permissions = ref<Permission[]>([])
const loading = ref(false)
const saving = ref(false)
const savingPermissions = ref(false)
/** Evita PUT al hidratar el rol desde el servidor. */
const skipPermissionAutoSave = ref(true)

const allowedProductModules = computed((): ProductModule[] | null => {
  const manageable = manageableDomains.value
  if (manageable === null) {
    return null
  }

  return manageable.filter((domain): domain is ProductModule => domain !== 'sistema')
})

const modulesLocked = computed(() => role.value?.name === 'super_admin')

const visiblePermissionDomains = computed(() =>
  permissionDomainsForEnabledModules(formData.value.enabledModules, manageableDomains.value),
)

const debouncedPersistPermissions = useDebounceFn(async () => {
  if (skipPermissionAutoSave.value || !canEdit.value || !role.value) {
    return
  }
  if (!formData.value.name.trim()) {
    return
  }
  savingPermissions.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: {
        name: formData.value.name,
        permissions: formData.value.permissions,
        enabled_modules: formData.value.enabledModules,
      },
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
  () => [formData.value.permissions, formData.value.enabledModules] as const,
  () => {
    debouncedPersistPermissions()
  },
  { deep: true },
)

function normalizeEnabledModules(raw: unknown): ProductModule[] {
  if (!Array.isArray(raw)) {
    return ['creditos', 'gestion_documental']
  }

  return raw.filter((module): module is ProductModule =>
    module === 'creditos' || module === 'gestion_documental',
  )
}

function normalizePermissionNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((permission) => (typeof permission === 'string' ? permission : (permission as { name?: string })?.name))
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
      enabledModules: normalizeEnabledModules(response.data.enabled_modules),
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
  if (!canEdit.value) {
    return
  }
  if (!formData.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }
  saving.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: {
        name: formData.value.name,
        permissions: formData.value.permissions,
        enabled_modules: formData.value.enabledModules,
      },
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
  skipPermissionAutoSave.value = !canEdit.value
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">
            {{ canEdit ? 'Editar rol' : 'Rol' }}
          </h2>
          <p v-if="role" class="text-muted-foreground">
            {{ canEdit ? `Modifica el rol: ${role.name}` : `Detalle del rol: ${role.name}` }}
          </p>
        </div>
        <Button variant="outline" @click="goBack">
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

      <div v-else-if="role" class="space-y-4">
        <Tabs v-model="activeTab" class="w-full gap-4">
          <TabsList class="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="permisos">
              Permisos
            </TabsTrigger>
            <TabsTrigger value="usuarios">
              Usuarios
              <Badge variant="secondary" class="ml-2">
                {{ role.users?.length ?? 0 }}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permisos" class="mt-4">
            <form @submit.prevent="handleSubmit">
              <div class="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información del rol</CardTitle>
                    <CardDescription>Nombre técnico del rol en el sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label for="name">Nombre del rol *</Label>
                    <Input
                      id="name"
                      v-model="formData.name"
                      required
                      placeholder="Ej: moderador, editor..."
                      :disabled="!canEdit || ['admin', 'user'].includes(role.name)"
                    />
                    <p v-if="['admin', 'user'].includes(role.name)" class="mt-1 text-sm text-muted-foreground">
                      Este es un rol del sistema y no se puede modificar su nombre
                    </p>
                  </CardContent>
                </Card>

                <SettingsRoleModulesCard
                  v-model="formData.enabledModules"
                  :allowed-modules="allowedProductModules"
                  :locked="modulesLocked || !canEdit"
                />

                <Card>
                  <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                    <div class="min-w-0 flex-1">
                      <CardTitle>Permisos</CardTitle>
                      <CardDescription>
                        Agrupados por módulo. Al activar o desactivar un módulo, o al marcar permisos, el cambio se guarda solo.
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
                    <fieldset :disabled="!canEdit" class="min-w-0">
                      <SettingsRolePermissionsPicker
                        v-model="formData.permissions"
                        :permissions="permissions"
                        :visible-domains="visiblePermissionDomains"
                      />
                    </fieldset>
                  </CardContent>
                </Card>

                <div v-if="canEdit" class="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                  <p class="max-w-md text-right text-xs text-muted-foreground">
                    Los permisos ya se sincronizan con el servidor al marcarlos. Usa el botón solo para guardar el nombre del rol.
                  </p>
                  <div class="flex gap-4">
                    <Button type="button" variant="outline" @click="goBack">
                      Cancelar
                    </Button>
                    <Button type="submit" :disabled="saving">
                      <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                      {{ saving ? 'Guardando...' : 'Guardar nombre del rol' }}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="usuarios" class="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Usuarios con este rol</CardTitle>
                <CardDescription>
                  {{ role.users?.length ?? 0 }} cuenta(s) asignada(s). Las inactivas siguen en la lista para ver la relación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsRoleAssignedUsers :users="role.users" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </SettingsLayout>
</template>
