<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { Role } from '~/types/role'
import type { UserAccountStatus } from '~/types/user'
import { defaultAdminApplicationDomains, requiresOrgStaffLink, type ApplicationDomain } from '~/constants/application-domains'
import { ACCOUNT_STATUS_FORM_OPTIONS } from '~/utils/accountStatus'
import { generateRobustPassword, PASSWORD_REQUIREMENTS, validateRobustPassword } from '~/utils/password'
import {
  isOrgStaffEmailValid,
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
import { firstLaravelFieldError } from '~/utils/laravel-validation-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'usuarios_crear'
})

const { $api } = useNuxtApp()
const router = useRouter()
const route = useRoute()
const { mapRoleSelectOptions } = useRoleAssignmentScope()
const { hasModule } = usePermissions()
const { goBack: goBackFallback } = useNavigationBack('/settings/users')

const returnTo = computed(() => {
  const value = route.query.returnTo
  return typeof value === 'string' && value.startsWith('/') ? value : null
})

const fromStaffFlow = computed(() =>
  returnTo.value != null && isStaffUserCreateReturnPath(returnTo.value),
)

function goBack() {
  if (returnTo.value) {
    void router.push(returnTo.value)
    return
  }
  goBackFallback()
}

const form = ref({
  name: '',
  full_name: '',
  phone: '',
  is_active: true,
  email: '',
  password: '',
  password_confirmation: '',
  send_welcome_email: true,
  sucursal_id: null as number | null,
  org_staff_id: null as number | null,
  allowed_sucursal_ids: [] as number[],
  admin_application_domains: defaultAdminApplicationDomains(hasModule) as ApplicationDomain[],
  roles: [] as string[],
})

function generatePassword() {
  const password = generateRobustPassword()
  form.value.password = password
  form.value.password_confirmation = password
  toast.success('Contraseña robusta generada')
}

const roles = ref<Role[]>([])
const selectedRole = ref<string | null>(null)

/** Opciones para multiselect de roles (value = nombre del rol en API) */
const roleSelectOptions = computed(() => mapRoleSelectOptions(roles.value))

const sucursales = ref<Array<{ id: number; name: string; code: string | null; is_main?: boolean }>>([])
const loading = ref(false)
const saving = ref(false)
const emailTaken = ref(false)

watch(() => form.value.email, () => {
  emailTaken.value = false
})

const sucursalSelectOptions = computed(() =>
  sucursales.value.map(s => ({
    value: s.id,
    label: `${s.name}${s.is_main ? ' (Principal)' : ''}`,
  })),
)

const showAllowedSucursales = computed(() => selectedRole.value === 'admin')
const showAdminApplicationDomains = computed(() => selectedRole.value === 'admin')

const requiresOrgStaff = computed(() => {
  if (!hasModule('gestion_documental')) {
    return false
  }

  return requiresOrgStaffLink(
    form.value.roles,
    selectedRole.value === 'admin' ? form.value.admin_application_domains : undefined,
    roles.value,
  )
})

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
  submitAttempted.value = true
  const firstMissing = firstMissingField()
  if (firstMissing) {
    const messages: Record<RequiredField, string> = {
      name: 'El nombre de usuario es obligatorio',
      email: 'Ingrese un correo electrónico válido',
      sucursal_id: 'La sucursal es obligatoria',
      org_staff_id: 'Debe seleccionar el funcionario organizacional para este tipo de usuario',
      roles: 'Debes asignar al menos un rol',
      password: validateRobustPassword(form.value.password) || 'La contraseña no cumple los requisitos',
      password_confirmation: 'Las contraseñas no coinciden',
      admin_application_domains: 'Selecciona al menos un módulo administrable para el rol admin',
    }
    toast.error(messages[firstMissing])
    await nextTick()
    focusByElementId(requiredFieldIds[firstMissing])
    return
  }

  saving.value = true
  try {
    const body: Record<string, unknown> = {
      name: form.value.name,
      full_name: form.value.full_name?.trim() || undefined,
      phone: form.value.phone?.trim() || undefined,
      account_status: accountStatus.value,
      email: form.value.email,
      send_welcome_email: form.value.send_welcome_email,
      sucursal_id: form.value.sucursal_id,
      allowed_sucursal_ids: form.value.allowed_sucursal_ids,
      roles: form.value.roles,
    }

    if (form.value.org_staff_id != null) {
      body.org_staff_id = form.value.org_staff_id
    }

    if (selectedRole.value === 'admin') {
      body.admin_application_domains = form.value.admin_application_domains
    }

    if (form.value.password) {
      body.password = form.value.password
      body.password_confirmation = form.value.password_confirmation
    }

    const res = await $api<{ data: { id: number }, temporary_password?: string }>('/users', {
      method: 'POST',
      body,
    })

    if (res.temporary_password) {
      toast.success(`Usuario creado. Contraseña temporal: ${res.temporary_password}`, { duration: 15000 })
    } else {
      toast.success('Usuario creado correctamente')
    }

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
    const fieldError = firstLaravelFieldError(error?.data?.errors)
    if (fieldError?.field === 'email' || error?.data?.errors?.email) {
      emailTaken.value = true
      await nextTick()
      focusByElementId('email')
    }
    const message = fieldError?.message
      || error?.data?.message
      || 'Error al crear el usuario'
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
    form.value.admin_application_domains = defaultAdminApplicationDomains(hasModule)
  }
}, { immediate: true })

type RequiredField =
  | 'name'
  | 'email'
  | 'sucursal_id'
  | 'org_staff_id'
  | 'roles'
  | 'password'
  | 'password_confirmation'
  | 'admin_application_domains'

const submitAttempted = ref(false)

const requiredFieldIds: Record<RequiredField, string> = {
  name: 'name',
  email: 'email',
  sucursal_id: 'sucursal',
  org_staff_id: 'org_staff',
  roles: 'user_roles',
  password: 'password',
  password_confirmation: 'password_confirmation',
  admin_application_domains: 'admin_application_domains',
}

function isFieldMissing(field: RequiredField): boolean {
  if (field === 'name') {
    return !form.value.name.trim()
  }
  if (field === 'email') {
    return !isOrgStaffEmailValid(form.value.email) || emailTaken.value
  }
  if (field === 'sucursal_id') {
    return form.value.sucursal_id == null
  }
  if (field === 'org_staff_id') {
    return !fromStaffFlow.value && requiresOrgStaff.value && form.value.org_staff_id == null
  }
  if (field === 'roles') {
    return !form.value.roles.length
  }
  if (field === 'password') {
    return Boolean(form.value.password) && Boolean(validateRobustPassword(form.value.password))
  }
  if (field === 'password_confirmation') {
    return Boolean(form.value.password) && form.value.password !== form.value.password_confirmation
  }
  return selectedRole.value === 'admin' && form.value.admin_application_domains.length === 0
}

function firstMissingField(): RequiredField | null {
  const order: RequiredField[] = [
    'name',
    'email',
    'sucursal_id',
    'org_staff_id',
    'password',
    'password_confirmation',
    'admin_application_domains',
    'roles',
  ]

  return order.find(field => isFieldMissing(field)) ?? null
}

function fieldErrorClass(missing: boolean): string {
  return missing ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40' : ''
}

function formFieldErrorClass(field: 'name' | 'email' | 'password' | 'password_confirmation'): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing(field))
}

function formMultiselectErrorClass(field: 'sucursal_id' | 'org_staff_id' | 'roles'): string {
  return submitAttempted.value && isFieldMissing(field)
    ? 'multiselect-roles multiselect-danger'
    : 'multiselect-roles'
}

function focusByElementId(id: string): void {
  const root = document.getElementById(id)
  if (!root) {
    return
  }
  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch([form, selectedRole], () => {
  if (!submitAttempted.value) {
    return
  }
  if (!firstMissingField()) {
    submitAttempted.value = false
  }
}, { deep: true })
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
          @click="goBack"
        >
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form novalidate @submit.prevent="handleSubmit">
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
                    :class="formFieldErrorClass('name')"
                    :aria-invalid="submitAttempted && isFieldMissing('name') ? true : undefined"
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
                    :class="formFieldErrorClass('email')"
                    :aria-invalid="submitAttempted && isFieldMissing('email') ? true : undefined"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                <div class="space-y-3">
                  <Label for="sucursal" class="leading-snug">Sucursal (pertenencia) *</Label>
                  <div class="w-full min-w-0 max-w-md">
                    <Multiselect
                      id="sucursal"
                      v-model="form.sucursal_id"
                      mode="single"
                      :object="false"
                      :options="sucursalSelectOptions"
                      value-prop="value"
                      label="label"
                      :searchable="true"
                      :can-clear="false"
                      placeholder="Seleccionar sucursal"
                      no-options-text="No hay sucursales configuradas"
                      no-results-text="Sin coincidencias"
                      :class="formMultiselectErrorClass('sucursal_id')"
                    />
                  </div>
                </div>

                <div v-if="!fromStaffFlow" class="space-y-3 md:col-span-2">
                  <Label for="org_staff" class="leading-snug">
                    Funcionario organizacional
                    <span v-if="requiresOrgStaff">*</span>
                    <span v-else class="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    <template v-if="requiresOrgStaff">
                      Obligatorio para roles de ventanilla, workflow y gestión documental (debe existir en estructura organizacional).
                    </template>
                    <template v-else>
                      Con roles solo de crédito puede crear la cuenta sin funcionario. El vínculo se puede hacer después en estructura organizacional.
                    </template>
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
                    :can-clear="!requiresOrgStaff"
                    placeholder="Seleccione funcionario…"
                    no-options-text="No hay funcionarios sin usuario — cree uno en Estructura organizacional"
                    no-results-text="Sin coincidencias"
                    :class="formMultiselectErrorClass('org_staff_id')"
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

              <div class="space-y-4 rounded-lg border p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p class="min-w-0 text-xs leading-relaxed text-muted-foreground">
                    Opcional. Si la dejas vacía, se generará automáticamente y se enviará por correo. {{ PASSWORD_REQUIREMENTS }}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="shrink-0 self-start"
                    @click="generatePassword"
                  >
                    <Icon name="i-lucide-refresh-cw" class="mr-1.5 h-3.5 w-3.5" />
                    Generar
                  </Button>
                </div>

                <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <div class="min-w-0 space-y-2">
                    <Label for="password" class="leading-snug">Contraseña</Label>
                    <PasswordInput
                      id="password"
                      v-model="form.password"
                      :class="formFieldErrorClass('password')"
                      autocomplete="new-password"
                      placeholder="Contraseña robusta (opcional)"
                    />
                  </div>
                  <div class="min-w-0 space-y-2">
                    <Label for="password_confirmation" class="leading-snug">Confirmar contraseña</Label>
                    <PasswordInput
                      id="password_confirmation"
                      v-model="form.password_confirmation"
                      :class="formFieldErrorClass('password_confirmation')"
                      autocomplete="new-password"
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <Checkbox id="send_welcome_email" v-model="form.send_welcome_email" />
                  <Label for="send_welcome_email" class="text-sm font-normal leading-snug">
                    Enviar credenciales por correo al usuario
                  </Label>
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

          <div
            v-if="showAdminApplicationDomains"
            id="admin_application_domains"
            :class="submitAttempted && isFieldMissing('admin_application_domains') ? 'rounded-xl ring-2 ring-destructive/40' : undefined"
          >
            <SettingsAdminApplicationDomainsCard
              :domains="form.admin_application_domains"
              @update:domains="form.admin_application_domains = $event"
            />
          </div>

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
                      id="user_roles"
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
                      :class="formMultiselectErrorClass('roles')"
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
            <Button type="button" variant="outline" @click="goBack">
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
  --ms-placeholder-color: var(--muted-foreground);
  --ms-py: 0.5rem;
  --ms-dropdown-radius: 0.375rem;
  min-height: 2.75rem;
  width: 100%;
  min-width: 0;
  color: var(--foreground);
}

:global(html.dark) .multiselect-roles,
:global(.dark) .multiselect-roles {
  --ms-bg: color-mix(in srgb, var(--input) 30%, transparent);
  --ms-border-color: var(--border);
  --ms-placeholder-color: color-mix(in srgb, var(--foreground) 58%, var(--muted-foreground));
  --ms-caret-color: var(--muted-foreground);
  --ms-clear-color: var(--muted-foreground);
}

.multiselect-roles :deep(.multiselect-single-label-text),
.multiselect-roles :deep(.multiselect-multiple-label),
.multiselect-roles :deep(.multiselect-search),
.multiselect-roles :deep(.multiselect-tags-search) {
  color: var(--foreground) !important;
}

.multiselect-roles :deep(.multiselect-placeholder) {
  color: var(--muted-foreground) !important;
  opacity: 1 !important;
}

.multiselect-roles.multiselect-danger {
  --ms-border-color: var(--destructive);
  --ms-border-color-active: var(--destructive);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--destructive) 25%, transparent);
}

:global(html.dark) .multiselect-roles :deep(.multiselect-search),
:global(.dark) .multiselect-roles :deep(.multiselect-search),
:global(html.dark) .multiselect-roles :deep(.multiselect-tags-search),
:global(.dark) .multiselect-roles :deep(.multiselect-tags-search) {
  background: transparent !important;
  color: var(--foreground) !important;
}
</style>
