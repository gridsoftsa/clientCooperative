<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { Permission, Role } from '~/types/role'
import { PERMISSION_CATEGORY_LABELS, formatPermissionDisplayName } from '~/constants/permission-labels'
import { normalizeRoleNames } from '~/utils/userRoles'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'usuarios_crear'
})

const { $api } = useNuxtApp()
const router = useRouter()

const form = ref({
  name: '',
  full_name: '',
  phone: '',
  is_active: true,
  email: '',
  password: '',
  password_confirmation: '',
  sucursal_id: null as number | null,
  allowed_sucursal_ids: [] as number[],
  roles: [] as string[],
  permissions: [] as string[],
})

const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const p of permissions.value) {
    const category = p.name.split('_')[0] ?? 'otros'
    if (!groups[category]) groups[category] = []
    groups[category].push(p)
  }
  return groups
})
const getCategoryLabel = (key: string) => PERMISSION_CATEGORY_LABELS[key] ?? key

/** Opciones para multiselect de roles (value = nombre del rol en API) */
const roleSelectOptions = computed(() =>
  roles.value.map((r) => ({
    value: r.name,
    label: r.name === 'admin' ? `${r.name} (Sistema)` : r.name,
  })),
)

function rolesMultipleLabel(values: unknown): string {
  const names = normalizeRoleNames(values)
  if (!names.length) {
    return 'Seleccione…'
  }
  const opts = roleSelectOptions.value
  return names.map(name => opts.find(o => o.value === name)?.label ?? name).join(', ')
}

const openCategories = ref<Record<string, boolean>>({})

const collapseAll = () => {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map((c) => [c, false]),
  )
}

const setCategoryOpen = (category: string, open: boolean) => {
  openCategories.value = { ...openCategories.value, [category]: open }
}

const sucursales = ref<Array<{ id: number; name: string; code: string | null; is_main?: boolean }>>([])
const loading = ref(false)
const saving = ref(false)

const showAllowedSucursales = computed(() => form.value.roles.includes('admin') && !form.value.roles.includes('super_admin'))

const fetchSucursales = async () => {
  try {
    const res = await $api<{ data: typeof sucursales.value }>('/catalogs/sucursales')
    sucursales.value = res.data
  } catch {
    sucursales.value = []
  }
}

const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await $api<{ data: Role[] }>('/roles', { query: { per_page: 100 } })
    roles.value = res.data
  } catch (error) {
    console.error('Error al cargar roles:', error)
    toast.error('Error al cargar roles')
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res = await $api<{ data: Permission[] }>('/roles/permissions')
    permissions.value = res.data
  } catch {
    permissions.value = []
  }
}

const togglePermission = (name: string, checked: boolean) => {
  if (checked) {
    if (!form.value.permissions.includes(name)) form.value.permissions.push(name)
  } else {
    form.value.permissions = form.value.permissions.filter(p => p !== name)
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.password) {
    toast.error('Completa todos los campos requeridos')
    return
  }

  if (form.value.password !== form.value.password_confirmation) {
    toast.error('Las contraseñas no coinciden')
    return
  }

  if (form.value.password.length < 8) {
    toast.error('La contraseña debe tener al menos 8 caracteres')
    return
  }

  saving.value = true
  try {
    await $api('/users', {
      method: 'POST',
      body: {
        name: form.value.name,
        full_name: form.value.full_name?.trim() || undefined,
        phone: form.value.phone?.trim() || undefined,
        is_active: form.value.is_active,
        email: form.value.email,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation,
        sucursal_id: form.value.sucursal_id || undefined,
        allowed_sucursal_ids: form.value.allowed_sucursal_ids,
        roles: form.value.roles,
        permissions: form.value.permissions,
      },
    })
    
    toast.success('Usuario creado correctamente')
    router.push('/settings/users')
  } catch (error: any) {
    console.error('Error saving user:', error)
    const message = error?.data?.message || error?.data?.errors?.email?.[0] || 'Error al crear el usuario'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  Promise.all([fetchRoles(), fetchSucursales(), fetchPermissions()])
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Crear Nuevo Usuario
        </h2>
        <p class="text-muted-foreground">
          Crea un nuevo usuario y asigna sus roles
        </p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
            <CardDescription>
              Nombre de usuario para el acceso, datos de contacto opcionales y estado de la cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
              <div class="space-y-3">
                <Label for="name" class="leading-snug">Nombre de usuario *</Label>
                <Input
                  id="name"
                  v-model="form.name"
                  required
                  placeholder="Identificador o alias de acceso"
                  autocomplete="username"
                />
              </div>

              <div class="space-y-3">
                <Label for="full_name" class="leading-snug">Nombre completo</Label>
                <Input
                  id="full_name"
                  v-model="form.full_name"
                  placeholder="Opcional — nombre y apellidos"
                  autocomplete="name"
                />
              </div>

              <div class="space-y-3">
                <Label for="phone" class="leading-snug">Teléfono de contacto</Label>
                <Input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  placeholder="Opcional"
                  autocomplete="tel"
                />
              </div>

              <div class="space-y-3">
                <Label for="email" class="leading-snug">Email *</Label>
                <Input
                  id="email"
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div class="space-y-3 md:col-span-2">
                <Label for="sucursal" class="leading-snug">Sucursal (pertenencia)</Label>
                <Select v-model="form.sucursal_id">
                  <SelectTrigger id="sucursal">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="s in sucursales" :key="s.id" :value="s.id">
                      {{ s.name }}{{ s.is_main ? ' (Principal)' : '' }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div class="space-y-1.5">
                <Label for="is_active" class="text-base leading-snug">Usuario activo</Label>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Los usuarios inactivos no pueden iniciar sesión.
                </p>
              </div>
              <Switch id="is_active" v-model:checked="form.is_active" class="shrink-0" />
            </div>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div class="space-y-3">
                <Label for="password" class="leading-snug">Contraseña *</Label>
                <PasswordInput
                  id="password"
                  v-model="form.password"
                  required
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div class="space-y-3">
                <Label for="password_confirmation" class="leading-snug">Confirmar Contraseña *</Label>
                <PasswordInput
                  id="password_confirmation"
                  v-model="form.password_confirmation"
                  required
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card v-if="showAllowedSucursales">
          <CardHeader>
            <CardTitle>Sucursales permitidas (admin)</CardTitle>
            <CardDescription>
              Sucursales que este admin puede ver y gestionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div
                v-for="s in sucursales"
                :key="s.id"
                class="flex items-center space-x-2"
              >
                <Checkbox
                  :id="`suc-${s.id}`"
                  :checked="form.allowed_sucursal_ids.includes(s.id)"
                  @update:checked="(checked: boolean) => {
                    if (checked) form.allowed_sucursal_ids.push(s.id)
                    else form.allowed_sucursal_ids = form.allowed_sucursal_ids.filter(id => id !== s.id)
                  }"
                />
                <Label :for="`suc-${s.id}`" class="font-normal cursor-pointer">
                  {{ s.name }}{{ s.is_main ? ' (Principal)' : '' }}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Selecciona los roles que tendrá este usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="flex items-center justify-center py-8">
              <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
            </div>

            <div v-else class="space-y-2">
              <Label class="leading-snug">Roles asignados</Label>
              <Multiselect
                v-model="form.roles"
                mode="multiple"
                :object="false"
                :options="roleSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :close-on-select="false"
                :hide-selected="false"
                placeholder="Seleccione…"
                no-options-text="No hay roles configurados"
                no-results-text="Sin coincidencias"
                :multiple-label="rolesMultipleLabel"
                class="multiselect-roles"
              />
              <p v-if="roles.length === 0" class="text-center py-4 text-sm text-muted-foreground">
                No hay roles disponibles
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Permisos directos</CardTitle>
              <CardDescription>
                Permisos adicionales asignados directamente al usuario (además de los de sus roles)
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" @click="collapseAll">
              <Icon name="i-lucide-chevrons-up-down" class="mr-2 h-4 w-4" />
              Contraer todo
            </Button>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <Collapsible
                v-for="(categoryPermissions, category) in groupedPermissions"
                :key="category"
                :open="openCategories[category] ?? true"
                class="border rounded-lg"
                @update:open="(v) => setCategoryOpen(category, v)"
              >
                <div class="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg">
                  <CollapsibleTrigger as-child>
                    <button type="button" class="flex items-center gap-2 w-full text-left font-semibold hover:opacity-80">
                      <Icon name="i-lucide-chevron-down" class="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      {{ getCategoryLabel(category) }}
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 border-t">
                    <div v-for="p in categoryPermissions" :key="p.id" class="flex items-center space-x-2">
                      <Checkbox
                        :id="`perm-${p.id}`"
                        :model-value="form.permissions.includes(p.name)"
                        @update:model-value="(v: boolean) => togglePermission(p.name, v)"
                      />
                      <Label :for="`perm-${p.id}`" class="font-normal cursor-pointer text-sm">{{ formatPermissionDisplayName(p.name) }}</Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <p v-if="permissions.length === 0" class="text-center py-4 text-muted-foreground text-sm">No hay permisos disponibles</p>
          </CardContent>
        </Card>

        <div class="flex justify-end gap-4">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Crear Usuario' }}
          </Button>
        </div>
      </div>
    </form>
    </div>
  </SettingsLayout>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-roles {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  --ms-dropdown-radius: 0.375rem;
  min-height: 2.75rem;
  width: 100%;
  min-width: 0;
}
</style>
