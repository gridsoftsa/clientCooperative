<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { User } from '~/types/user'
import { normalizeRoleNames } from '~/utils/userRoles'
import { PASSWORD_REQUIREMENTS, validateRobustPassword } from '~/utils/password'
import type { Role } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'usuarios_editar'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { user: authUser, refetchUserSilently } = useAuth()

const userId = route.params.id as string

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
})

const user = ref<User | null>(null)
const roles = ref<Role[]>([])

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

const sucursales = ref<Array<{ id: number; name: string; code: string | null; is_main?: boolean }>>([])
const loading = ref(false)
const saving = ref(false)
const changePassword = ref(false)

const showAllowedSucursales = computed(() => form.value.roles.includes('admin') && !form.value.roles.includes('super_admin'))

const isOwnUser = computed(() => authUser.value?.id === parseInt(userId))

/** Estado de cuenta (multiselect single), alineado con `is_active` del API */
const accountStatus = ref<'active' | 'inactive'>('active')

/** Evita toast al hidratar desde API (p. ej. cuenta propia inactiva en BD) */
const isHydratingAccountStatus = ref(false)

const accountStatusOptions = [
  { value: 'active' as const, label: 'Activo' },
  { value: 'inactive' as const, label: 'Inactivo' },
]

function normalizeIsActive(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false
  }

  return true
}

watch(accountStatus, (next) => {
  if (isOwnUser.value && next === 'inactive' && !isHydratingAccountStatus.value) {
    toast.error('No puedes desactivar tu propia cuenta desde aquí.')
    accountStatus.value = 'active'
    return
  }
  form.value.is_active = next === 'active'
})

const fetchUser = async () => {
  loading.value = true
  try {
    const response = await $api<{ data: User }>(`/users/${userId}`)
    user.value = response.data
    const active = normalizeIsActive(response.data.is_active)
    form.value = {
      name: response.data.name,
      full_name: response.data.full_name ?? '',
      phone: response.data.phone ?? '',
      is_active: active,
      email: response.data.email,
      password: '',
      password_confirmation: '',
      sucursal_id: response.data.sucursal_id ?? null,
      allowed_sucursal_ids: response.data.allowed_sucursal_ids ?? [],
      roles: normalizeRoleNames(response.data.roles),
    }
    isHydratingAccountStatus.value = true
    accountStatus.value = active ? 'active' : 'inactive'
    await nextTick()
    isHydratingAccountStatus.value = false
  } catch (error) {
    console.error('Error fetching user:', error)
    toast.error('Error al cargar el usuario')
    router.push('/settings/users')
  } finally {
    loading.value = false
  }
}

const fetchSucursales = async () => {
  try {
    const res = await $api<{ data: typeof sucursales.value }>('/catalogs/sucursales')
    sucursales.value = res.data
  } catch {
    sucursales.value = []
  }
}

const fetchRoles = async () => {
  try {
    const res = await $api<{ data: Role[] }>('/roles', { query: { per_page: 100 } })
    roles.value = res.data
  } catch (error) {
    console.error('Error al cargar roles:', error)
    toast.error('Error al cargar roles')
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.email.trim()) {
    toast.error('Completa todos los campos requeridos')
    return
  }

  if (changePassword.value) {
    if (!form.value.password) {
      toast.error('La contraseña es requerida')
      return
    }

    if (form.value.password !== form.value.password_confirmation) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    const passwordError = validateRobustPassword(form.value.password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
  }

  saving.value = true
  try {
    const body: any = {
      name: form.value.name,
      full_name: form.value.full_name?.trim() || undefined,
      phone: form.value.phone?.trim() || undefined,
      is_active: accountStatus.value === 'active',
      email: form.value.email,
      sucursal_id: form.value.sucursal_id || undefined,
      allowed_sucursal_ids: form.value.allowed_sucursal_ids,
      roles: form.value.roles,
    }

    if (changePassword.value && form.value.password) {
      body.password = form.value.password
      body.password_confirmation = form.value.password_confirmation
    }

    await $api(`/users/${userId}`, {
      method: 'PUT',
      body,
    })
    if (isOwnUser.value) {
      await refetchUserSilently()
    }
    toast.success('Usuario actualizado correctamente')
    router.push('/settings/users')
  } catch (error: any) {
    console.error('Error saving user:', error)
    const message = error?.data?.message || error?.data?.errors?.email?.[0] || 'Error al actualizar el usuario'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchRoles(), fetchSucursales()])
  await fetchUser()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Usuario
        </h2>
        <p class="text-muted-foreground" v-if="user">
          Modifica el usuario: {{ user.name }}
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

    <form v-else-if="user" @submit.prevent="handleSubmit">
      <div class="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
            <CardDescription>
              <span class="font-medium text-foreground">Nombre de usuario</span> es el identificador de acceso. El
              <span class="font-medium text-foreground">nombre completo</span> y teléfono también los puede editar el propio usuario en
              <span class="font-medium text-foreground">Configuración → Datos personales</span>.
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

            <div class="space-y-3 md:col-span-2 rounded-lg border p-4">
              <div class="space-y-1.5">
                <Label for="account_status_edit" class="text-base leading-snug">Estado de la cuenta</Label>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Los usuarios inactivos no pueden iniciar sesión.
                </p>
              </div>
              <Multiselect
                id="account_status_edit"
                v-model="accountStatus"
                mode="single"
                :object="false"
                :options="accountStatusOptions"
                value-prop="value"
                label="label"
                :searchable="false"
                :can-clear="false"
                placeholder="Seleccione estado"
                no-options-text="Sin opciones"
                class="multiselect-roles max-w-md"
              />
              <p v-if="isOwnUser" class="text-xs text-muted-foreground">
                No puedes dejar tu propia cuenta como inactiva.
              </p>
            </div>

            <div class="space-y-5">
              <div class="flex items-center gap-3">
                <Switch
                  id="changePassword"
                  v-model:checked="changePassword"
                />
                <Label for="changePassword" class="font-normal leading-snug">
                  Cambiar contraseña
                </Label>
              </div>

              <div v-if="changePassword" class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div class="space-y-3">
                  <Label for="password" class="leading-snug">Nueva Contraseña *</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ PASSWORD_REQUIREMENTS }}
                  </p>
                  <PasswordInput
                    id="password"
                    v-model="form.password"
                    required
                    placeholder="Contraseña robusta"
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
              <div v-for="s in sucursales" :key="s.id" class="flex items-center space-x-2">
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
            <div class="space-y-2">
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

        <div class="flex justify-end gap-4">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Actualizar Usuario' }}
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
