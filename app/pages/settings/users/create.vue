<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { Role } from '~/types/role'
import type { UserAccountStatus } from '~/types/user'
import { ACCOUNT_STATUS_FORM_OPTIONS } from '~/utils/accountStatus'
import {
  isStaffUserCreateReturnPath,
  USER_CREATE_PREFILL_FROM_STAFF_KEY,
  type UserCreatePrefillFromStaff,
} from '~/utils/staff-user-create-bridge'
import {
  USER_CREATE_RETURN_PATH,
  clearUserCreateDraft,
  readUserCreateDraft,
  saveUserCreateDraft,
} from '~/utils/user-create-draft'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'usuarios_crear'
})

const { $api } = useNuxtApp()
const router = useRouter()
const route = useRoute()

const returnTo = computed(() => {
  const value = route.query.returnTo
  return typeof value === 'string' && value.startsWith('/') ? value : null
})

const fromStaffFlow = computed(() =>
  returnTo.value != null && isStaffUserCreateReturnPath(returnTo.value),
)

const form = ref({
  name: '',
  full_name: '',
  phone: '',
  is_active: true,
  email: '',
  password: '',
  password_confirmation: '',
  sucursal_id: null as number | null,
  org_staff_id: null as number | null,
  allowed_sucursal_ids: [] as number[],
  roles: [] as string[],
})

const roles = ref<Role[]>([])
const selectedRole = ref<string | null>(null)

/** Opciones para multiselect de roles (value = nombre del rol en API) */
const roleSelectOptions = computed(() =>
  roles.value.map((r) => ({
    value: r.name,
    label: r.name === 'admin' ? `${r.name} (Sistema)` : r.name,
  })),
)

const sucursales = ref<Array<{ id: number; name: string; code: string | null; is_main?: boolean }>>([])
const loading = ref(false)
const saving = ref(false)

const sucursalSelectOptions = computed(() =>
  sucursales.value.map(s => ({
    value: s.id,
    label: `${s.name}${s.is_main ? ' (Principal)' : ''}`,
  })),
)

const showAllowedSucursales = computed(() => selectedRole.value === 'admin')

const accountStatus = ref<UserAccountStatus>('active')

const accountStatusOptions = ACCOUNT_STATUS_FORM_OPTIONS

const linkableStaff = ref<Array<{ id: number; full_name: string; email?: string | null }>>([])

const staffSelectOptions = computed(() =>
  linkableStaff.value.map(s => ({
    value: s.id,
    label: s.email ? `${s.full_name} · ${s.email}` : s.full_name,
  })),
)

watch(accountStatus, (next) => {
  form.value.is_active = next === 'active' || next === 'pending'
})

const fetchSucursales = async () => {
  try {
    const res = await $api<{ data: typeof sucursales.value }>('/sucursales', { query: { per_page: 1000 } })
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

const fetchLinkableStaff = async () => {
  try {
    const res = await $api<{ data: typeof linkableStaff.value }>('/users/linkable-org-staff', {
      query: { limit: 500, active_only: true },
    })
    linkableStaff.value = res.data
  } catch {
    linkableStaff.value = []
    toast.error('No se pudo cargar el directorio de funcionarios. Verifica permisos y que existan funcionarios sin usuario vinculado.')
  }
}

function restorePrefillFromStaffCreate() {
  if (!fromStaffFlow.value || !import.meta.client) {
    return
  }
  const raw = sessionStorage.getItem(USER_CREATE_PREFILL_FROM_STAFF_KEY)
  if (!raw) {
    return
  }
  try {
    const prefill = JSON.parse(raw) as UserCreatePrefillFromStaff
    if (prefill.name) {
      form.value.name = prefill.name
    }
    if (prefill.full_name) {
      form.value.full_name = prefill.full_name
    }
    if (prefill.email) {
      form.value.email = prefill.email
    }
    if (prefill.phone) {
      form.value.phone = prefill.phone
    }
  } catch {
    // ignore corrupt prefill
  } finally {
    sessionStorage.removeItem(USER_CREATE_PREFILL_FROM_STAFF_KEY)
  }
}

function restoreDraftFromStorage(): boolean {
  const draft = readUserCreateDraft()
  if (!draft) {
    return false
  }

  form.value = { ...form.value, ...draft.form }
  accountStatus.value = draft.accountStatus
  selectedRole.value = draft.selectedRole

  if (draft.returnTo && draft.returnTo !== returnTo.value) {
    router.replace({
      path: route.path,
      query: {
        ...route.query,
        returnTo: draft.returnTo,
      },
    })
  }

  clearUserCreateDraft()
  return true
}

function saveDraftAndGoCreateRole() {
  if (!import.meta.client) {
    return
  }

  saveUserCreateDraft({
    form: { ...form.value },
    accountStatus: accountStatus.value,
    selectedRole: selectedRole.value,
    returnTo: returnTo.value,
  })

  router.push({
    path: '/settings/roles/create',
    query: { returnTo: USER_CREATE_RETURN_PATH },
  })
}

function applyReturnedRoleFromQuery() {
  const raw = route.query.role_name
  const roleName = typeof raw === 'string' ? raw.trim() : ''
  if (!roleName) {
    return
  }

  selectedRole.value = roleName

  const nextQuery = { ...route.query }
  delete nextQuery.role_name
  router.replace({ path: route.path, query: nextQuery })
}

const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.password || !form.value.sucursal_id) {
    toast.error('Completa todos los campos requeridos')
    return
  }

  if (!fromStaffFlow.value && form.value.org_staff_id == null) {
    toast.error('Debe seleccionar el funcionario organizacional')
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

  if (!form.value.roles.length) {
    toast.error('Debes asignar al menos un rol')
    return
  }

  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>('/users', {
      method: 'POST',
      body: {
        name: form.value.name,
        full_name: form.value.full_name?.trim() || undefined,
        phone: form.value.phone?.trim() || undefined,
        account_status: accountStatus.value,
        email: form.value.email,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation,
        sucursal_id: form.value.sucursal_id,
        ...(form.value.org_staff_id != null ? { org_staff_id: form.value.org_staff_id } : {}),
        allowed_sucursal_ids: form.value.allowed_sucursal_ids,
        roles: form.value.roles,
      },
    })

    toast.success('Usuario creado correctamente')
    if (returnTo.value) {
      await router.push({
        path: returnTo.value,
        query: { user_id: String(res.data.id) },
      })
      return
    }
    router.push('/settings/users')
  } catch (error: any) {
    console.error('Error saving user:', error)
    const message = error?.data?.message || error?.data?.errors?.email?.[0] || 'Error al crear el usuario'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const restoredDraft = restoreDraftFromStorage()
  if (!restoredDraft) {
    restorePrefillFromStaffCreate()
  }

  const tasks: Promise<void>[] = [fetchRoles(), fetchSucursales()]
  if (!fromStaffFlow.value) {
    tasks.push(fetchLinkableStaff())
  }
  await Promise.all(tasks)
  applyReturnedRoleFromQuery()
})

watch(selectedRole, (role) => {
  form.value.roles = role ? [role] : []
  if (role !== 'admin') {
    form.value.allowed_sucursal_ids = []
  }
}, { immediate: true })
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ fromStaffFlow ? 'Crear usuario para funcionario' : 'Crear Nuevo Usuario' }}
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            {{
              fromStaffFlow
                ? 'Al guardar volverá al formulario de funcionario con este usuario preseleccionado.'
                : 'Crea un nuevo usuario y asigna sus roles'
            }}
          </p>
        </div>
        <Button
          variant="outline"
          class="shrink-0"
          @click="returnTo ? router.push(returnTo) : router.back()"
        >
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
                <span class="font-medium text-foreground">Nombre de usuario</span> es el identificador de acceso (campo
                <code class="rounded bg-muted px-1 py-0.5 text-xs">name</code>).
                <span class="font-medium text-foreground">Nombre completo</span> y teléfono los verá el propio usuario en
                <span class="font-medium text-foreground">Configuración → Datos personales</span>; puedes dejarlos vacíos y completarlos allí después.
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
                  <Label for="sucursal" class="leading-snug">Sucursal (pertenencia) *</Label>
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

                <div v-if="!fromStaffFlow" class="space-y-3 md:col-span-2">
                  <Label for="org_staff" class="leading-snug">Funcionario organizacional *</Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Cada usuario debe corresponder a un funcionario del módulo de estructura organizacional (solo aparecen los que aún no tienen cuenta).
                  </p>
                  <Multiselect
                    id="org_staff"
                    v-model="form.org_staff_id"
                    mode="single"
                    :object="false"
                    :options="staffSelectOptions"
                    value-prop="value"
                    label="label"
                    :searchable="true"
                    :can-clear="false"
                    placeholder="Seleccione funcionario…"
                    no-options-text="No hay funcionarios sin usuario — cree uno en Estructura organizacional"
                    no-results-text="Sin coincidencias"
                    class="multiselect-roles"
                  />
                </div>
                <p v-else class="md:col-span-2 text-sm text-muted-foreground leading-relaxed rounded-lg border border-dashed px-4 py-3">
                  El vínculo con el funcionario se completará al guardar el alta en estructura organizacional.
                </p>
              </div>

              <div class="space-y-3 md:col-span-2 rounded-lg border p-4">
                <div class="space-y-1.5">
                  <Label for="account_status_create" class="text-base leading-snug">Estado de la cuenta</Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Pendiente, inactivo, bloqueado o suspendido no puede iniciar sesión (salvo política de «pendiente» en servidor). Bloqueado suele usarse tras intentos fallidos o decisión manual.
                  </p>
                </div>
                <Multiselect
                  id="account_status_create"
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
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Sucursales permitidas (admin)</CardTitle>
              <CardDescription class="leading-relaxed">
                Sucursales que este admin puede ver y gestionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Multiselect
                v-model="form.allowed_sucursal_ids"
                mode="multiple"
                :object="false"
                :options="sucursalSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :close-on-select="false"
                :hide-selected="false"
                placeholder="Seleccione sucursales permitidas"
                no-options-text="No hay sucursales configuradas"
                no-results-text="Sin coincidencias"
                class="multiselect-roles"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Roles</CardTitle>
              <CardDescription class="leading-relaxed">
                Selecciona los roles que tendrá este usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="loading" class="flex items-center justify-center py-8">
                <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
              </div>

              <div v-else class="space-y-3">
                <Label class="leading-snug">Roles asignados</Label>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div class="w-full min-w-0 max-w-md">
                    <Multiselect
                      v-model="selectedRole"
                      mode="single"
                      :object="false"
                      :options="roleSelectOptions"
                      value-prop="value"
                      label="label"
                      :searchable="true"
                      :close-on-select="true"
                      placeholder="Seleccione…"
                      no-options-text="No hay roles configurados"
                      no-results-text="Sin coincidencias"
                      class="multiselect-roles"
                    />
                  </div>
                  <PermissionGate permission="roles_crear">
                    <Button
                      type="button"
                      variant="outline"
                      class="shrink-0"
                      @click="saveDraftAndGoCreateRole"
                    >
                      <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                      Crear rol
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="returnTo ? router.push(returnTo) : router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : (fromStaffFlow ? 'Crear y volver al funcionario' : 'Crear Usuario') }}
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
