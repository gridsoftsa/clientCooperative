<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { PaginatedUsers, User } from '~/types/user'
import {
  STAFF_CREATE_DRAFT_KEY,
  STAFF_CREATE_RETURN_PATH,
  USER_CREATE_PREFILL_FROM_STAFF_KEY,
  hasStaffPersonalInfoForUserPrefill,
  isOrgStaffEmailValid,
  orgStaffContactEmailErrorMessage,
  orgStaffContactPhoneErrorMessage,
  userCreatePrefillFromStaff,
} from '~/utils/staff-user-create-bridge'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const { options: documentTypeOptions, fetchOptions: fetchDocumentTypeOptions } = useTemplateFlatCatalogOptions('tipo-documento', [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
])

const form = ref({
  user_id: null as number | null,
  first_name: '',
  second_name: '',
  first_last_name: '',
  second_last_name: '',
  email: '',
  phone: '',
  extension: '',
  document_type: 'CC',
  document_number: '',
  date_of_birth: '',
  is_active: true,
})

const userOptions = ref<Array<{ id: number; label: string }>>([])
const saving = ref(false)
const activeTab = ref<'datos' | 'ubicacion'>('datos')

function goToDatosTab(): void {
  activeTab.value = 'datos'
}

const userSelectOptions = computed(() =>
  userOptions.value.map(u => ({
    value: u.id,
    label: u.label,
  })),
)

function onStaffActiveChange(value: boolean) {
  form.value.is_active = value
}

function restoreDraftFromStorage() {
  if (!import.meta.client) {
    return
  }
  const raw = sessionStorage.getItem(STAFF_CREATE_DRAFT_KEY)
  if (!raw) {
    return
  }
  try {
    const parsed = JSON.parse(raw) as typeof form.value
    form.value = { ...form.value, ...parsed }
  } catch {
    // ignore corrupt draft
  } finally {
    sessionStorage.removeItem(STAFF_CREATE_DRAFT_KEY)
  }
}

function saveDraftAndGoCreateUser() {
  if (!import.meta.client) {
    return
  }
  sessionStorage.setItem(STAFF_CREATE_DRAFT_KEY, JSON.stringify(form.value))
  if (hasStaffPersonalInfoForUserPrefill(form.value)) {
    sessionStorage.setItem(
      USER_CREATE_PREFILL_FROM_STAFF_KEY,
      JSON.stringify(userCreatePrefillFromStaff(form.value)),
    )
  } else {
    sessionStorage.removeItem(USER_CREATE_PREFILL_FROM_STAFF_KEY)
  }
  router.push({
    path: '/settings/users/create',
    query: { returnTo: STAFF_CREATE_RETURN_PATH },
  })
}

async function loadUsersIfAllowed() {
  if (!hasPermission('usuarios_ver')) {
    userOptions.value = []
    return
  }
  try {
    const res = await $api<PaginatedUsers>('/users', { query: { per_page: 200, page: 1 } })
    userOptions.value = res.data
      .filter((u: User) => u.org_staff_id == null)
      .map((u: User) => ({
        id: u.id,
        label: `${u.name || u.email} · ${u.email}`,
      }))
  } catch {
    userOptions.value = []
  }
}

async function ensureSelectedUserInOptions(userId: number) {
  if (userOptions.value.some(u => u.id === userId)) {
    return
  }
  try {
    const res = await $api<{ data: User }>(`/users/${userId}`)
    const u = res.data
    if (u.org_staff_id == null) {
      userOptions.value = [
        ...userOptions.value,
        { id: u.id, label: `${u.name || u.email} · ${u.email}` },
      ]
    }
  } catch {
    // ignore — multiselect may still show id if options load later
  }
}

function applyReturnedUserFromQuery() {
  const raw = route.query.user_id
  const userId = typeof raw === 'string' ? Number(raw) : null
  if (userId != null && Number.isFinite(userId) && userId > 0) {
    form.value.user_id = userId
    void ensureSelectedUserInOptions(userId)
    router.replace({ path: route.path })
  }
}

async function handleSubmit() {
  submitAttempted.value = true
  activeTab.value = 'datos'
  const firstMissing = firstMissingField()
  if (firstMissing) {
    const messages: Record<RequiredField, string> = {
      first_name: 'El primer nombre es obligatorio',
      first_last_name: 'El primer apellido es obligatorio',
      email: orgStaffContactEmailErrorMessage(form.value.email),
      phone: orgStaffContactPhoneErrorMessage(),
      date_of_birth: 'La fecha de nacimiento es obligatoria',
      user_id: 'El vínculo con el usuario del sistema es obligatorio',
      document_pair: 'Indique tipo y número de documento',
    }
    toast.error(messages[firstMissing])
    await nextTick()
    if (firstMissing === 'document_pair') {
      focusByElementId(form.value.document_type.trim() ? 'doc' : 'doc_type')
    }
    else {
      focusByElementId(requiredFieldIds[firstMissing])
    }
    return
  }

  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>('/organizational-structure/org-staff', {
      method: 'POST',
      body: {
        user_id: form.value.user_id,
        first_name: form.value.first_name.trim(),
        second_name: form.value.second_name.trim() || undefined,
        first_last_name: form.value.first_last_name.trim(),
        second_last_name: form.value.second_last_name.trim() || undefined,
        email: form.value.email.trim(),
        phone: form.value.phone.trim(),
        extension: form.value.extension.trim() || undefined,
        document_type: form.value.document_type.trim() || undefined,
        document_number: form.value.document_number.trim() || undefined,
        date_of_birth: form.value.date_of_birth.trim(),
        is_active: form.value.is_active,
      },
    })
    toast.success('Funcionario creado')
    const id = res.data.id
    router.push({
      path: `/settings/organizational-structure/staff/${id}/edit`,
      query: { tab: 'ubicacion' },
    })
  }
  catch (e: any) {
    const err = e?.data?.errors
    const first = err
      ? Object.values(err as Record<string, string[]>)[0]?.[0]
      : null
    toast.error(first ?? e?.data?.message ?? e?.data?.errors?.user_id?.[0] ?? 'Error al crear')
  }
  finally {
    saving.value = false
  }
}

type RequiredField = 'first_name' | 'first_last_name' | 'email' | 'phone' | 'date_of_birth' | 'user_id' | 'document_pair'

const submitAttempted = ref(false)

const requiredFieldIds: Record<Exclude<RequiredField, 'document_pair'>, string> = {
  first_name: 'fn',
  first_last_name: 'fl',
  email: 'em',
  phone: 'ph',
  date_of_birth: 'dob',
  user_id: 'usr',
}

function isFieldMissing(field: RequiredField): boolean {
  if (field === 'first_name') {
    return !form.value.first_name.trim()
  }
  if (field === 'first_last_name') {
    return !form.value.first_last_name.trim()
  }
  if (field === 'email') {
    return !isOrgStaffEmailValid(form.value.email)
  }
  if (field === 'phone') {
    return !form.value.phone.trim()
  }
  if (field === 'date_of_birth') {
    return !form.value.date_of_birth.trim()
  }
  if (field === 'user_id') {
    return form.value.user_id == null
  }
  const docNumber = form.value.document_number.trim()
  const docType = form.value.document_type.trim()
  return (docNumber !== '' && docType === '') || (docType !== '' && docNumber === '')
}

function firstMissingField(): RequiredField | null {
  const order: RequiredField[] = ['first_name', 'first_last_name', 'email', 'phone', 'date_of_birth', 'user_id', 'document_pair']
  return order.find(field => isFieldMissing(field)) ?? null
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

function fieldErrorClass(missing: boolean): string {
  return missing ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40' : ''
}

function multiselectErrorClass(missing: boolean): string {
  return missing ? 'multiselect-roles multiselect-danger' : 'multiselect-roles'
}

function contactEmailErrorClass(): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing('email'))
}

function contactPhoneErrorClass(): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing('phone'))
}

function dobErrorClass(): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing('date_of_birth'))
}

function formFieldErrorClass(field: Exclude<RequiredField, 'document_pair' | 'email' | 'phone' | 'date_of_birth'>): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing(field))
}

function formMultiselectErrorClass(field: 'user_id' | 'document_type'): string {
  if (field === 'user_id') {
    return multiselectErrorClass(submitAttempted.value && isFieldMissing('user_id'))
  }
  return multiselectErrorClass(submitAttempted.value && isFieldMissing('document_pair') && !form.value.document_type.trim())
}

function documentNumberErrorClass(): string {
  return fieldErrorClass(
    submitAttempted.value
    && isFieldMissing('document_pair')
    && !form.value.document_number.trim(),
  )
}

watch(form, () => {
  if (!submitAttempted.value) {
    return
  }
  if (!firstMissingField()) {
    submitAttempted.value = false
  }
}, { deep: true })

onMounted(async () => {
  restoreDraftFromStorage()
  await Promise.all([loadUsersIfAllowed(), fetchDocumentTypeOptions()])
  applyReturnedUserFromQuery()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Registrar funcionario
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Complete los datos personales y, al guardar, continúe en la pestaña Ubicación para definir agencia, área y cargo principal.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <Tabs v-model="activeTab" class="w-full gap-4">
        <TabsList class="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="datos">
            Datos
          </TabsTrigger>
          <TabsTrigger value="ubicacion">
            Ubicación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" class="mt-4">
          <form @submit.prevent="handleSubmit">
            <div class="grid gap-6">
              <Card>
                <CardHeader class="gap-2">
                  <CardTitle class="leading-snug">
                    Información personal y contacto
                  </CardTitle>
                  <CardDescription class="leading-relaxed">
                    Nombre completo, correo, teléfono y vínculo con usuario del sistema son obligatorios.
                  </CardDescription>
                </CardHeader>
                <CardContent class="space-y-8">
                  <section class="space-y-4">
                    <p class="text-sm font-medium text-foreground leading-snug">
                      Identificación
                    </p>
                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                      <div class="space-y-3 min-w-0">
                        <Label for="doc_type" class="leading-snug">Tipo de documento</Label>
                        <Multiselect
                          id="doc_type"
                          v-model="form.document_type"
                          mode="single"
                          :object="false"
                          :options="documentTypeOptions"
                          value-prop="value"
                          label="label"
                          :searchable="true"
                          :can-clear="false"
                          placeholder="Seleccione…"
                          no-options-text="Sin opciones"
                          no-results-text="Sin coincidencias"
                          :class="formMultiselectErrorClass('document_type')"
                        />
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="doc" class="leading-snug">Número de documento</Label>
                        <Input id="doc" v-model="form.document_number" inputmode="numeric" :class="documentNumberErrorClass()" />
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="dob" class="leading-snug">Fecha de nacimiento *</Label>
                        <Input id="dob" v-model="form.date_of_birth" type="date" required :class="dobErrorClass()" />
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section class="space-y-4">
                    <p class="text-sm font-medium text-foreground leading-snug">
                      Nombres y apellidos
                    </p>
                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 md:gap-x-6 md:gap-y-5">
                      <div class="space-y-3 min-w-0">
                        <Label for="fn" class="leading-snug">Primer nombre *</Label>
                        <Input id="fn" v-model="form.first_name" required autocomplete="given-name" :class="formFieldErrorClass('first_name')" />
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="sn" class="leading-snug">Segundo nombre</Label>
                        <Input id="sn" v-model="form.second_name" autocomplete="additional-name" />
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="fl" class="leading-snug">Primer apellido *</Label>
                        <Input id="fl" v-model="form.first_last_name" required autocomplete="family-name" :class="formFieldErrorClass('first_last_name')" />
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="sl" class="leading-snug">Segundo apellido</Label>
                        <Input id="sl" v-model="form.second_last_name" />
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section class="space-y-4">
                    <p class="text-sm font-medium text-foreground leading-snug">
                      Contacto
                    </p>
                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                      <div class="space-y-3 min-w-0">
                        <Label for="em" class="leading-snug">Correo *</Label>
                        <Input
                          id="em"
                          v-model="form.email"
                          type="email"
                          autocomplete="email"
                          :class="contactEmailErrorClass()"
                        />
                        <p
                          v-if="submitAttempted && isFieldMissing('email')"
                          class="text-sm text-destructive"
                        >
                          {{ orgStaffContactEmailErrorMessage(form.email) }}
                        </p>
                      </div>
                      <div class="space-y-3 min-w-0">
                        <Label for="ph" class="leading-snug">Teléfono *</Label>
                        <Input
                          id="ph"
                          v-model="form.phone"
                          type="tel"
                          autocomplete="tel"
                          :class="contactPhoneErrorClass()"
                        />
                        <p
                          v-if="submitAttempted && isFieldMissing('phone')"
                          class="text-sm text-destructive"
                        >
                          {{ orgStaffContactPhoneErrorMessage() }}
                        </p>
                      </div>
                      <div class="space-y-3 min-w-0 sm:max-w-[10rem]">
                        <Label for="ex" class="leading-snug">Extensión</Label>
                        <Input id="ex" v-model="form.extension" />
                      </div>
                    </div>
                  </section>

                  <template v-if="hasPermission('usuarios_ver')">
                    <Separator />
                    <section class="space-y-4">
                      <div class="space-y-1">
                        <p class="text-sm font-medium text-foreground leading-snug">
                          Vínculo con usuario del sistema *
                        </p>
                        <p class="text-sm text-muted-foreground leading-relaxed">
                          Obligatorio: asocie una cuenta existente sin funcionario vinculado o cree una nueva.
                        </p>
                      </div>
                      <div class="space-y-3">
                        <Label for="usr" class="leading-snug">Usuario *</Label>
                        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                          <div class="min-w-0">
                            <Multiselect
                              id="usr"
                              v-model="form.user_id"
                              mode="single"
                              :object="false"
                              :options="userSelectOptions"
                              value-prop="value"
                              label="label"
                              :searchable="true"
                              :can-clear="false"
                              placeholder="Seleccione usuario…"
                              no-options-text="No hay usuarios sin funcionario vinculado"
                              no-results-text="Sin coincidencias"
                              :class="formMultiselectErrorClass('user_id')"
                            />
                          </div>
                          <PermissionGate permission="usuarios_crear">
                            <Button
                              type="button"
                              variant="outline"
                              class="shrink-0 w-full lg:w-auto"
                              @click="saveDraftAndGoCreateUser"
                            >
                              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                              Crear usuario
                            </Button>
                          </PermissionGate>
                        </div>
                        <p
                          v-if="submitAttempted && isFieldMissing('user_id')"
                          class="text-sm text-destructive"
                        >
                          Seleccione o cree un usuario del sistema.
                        </p>
                      </div>
                    </section>
                  </template>

                  <p
                    v-else
                    class="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground leading-relaxed"
                  >
                    No tiene permiso para listar usuarios; puede crear el funcionario sin vínculo y asociarlo después desde la edición, si corresponde.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader class="gap-2">
                  <CardTitle class="leading-snug">
                    Estado del registro
                  </CardTitle>
                  <CardDescription class="leading-relaxed">
                    Por defecto queda activo; desactive si el alta es provisional.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="max-w-xs">
                    <OrgStructureActiveMultiselect
                      :model-value="form.is_active"
                      gender="masculine"
                      input-id="staff_create_active_ms"
                      :show-label="false"
                      @update:model-value="onStaffActiveChange"
                    />
                  </div>
                </CardContent>
              </Card>

              <div class="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" @click="router.back()">
                  Cancelar
                </Button>
                <Button type="submit" :disabled="saving">
                  <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                  {{ saving ? 'Guardando...' : 'Crear y continuar a ubicación' }}
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="ubicacion" class="mt-4">
          <div class="grid gap-6">
            <Card class="border-dashed">
              <CardHeader class="gap-2">
                <CardTitle class="leading-snug">
                  Ubicación organizacional
                </CardTitle>
                <CardDescription class="leading-relaxed">
                  Este paso se habilita después de crear el funcionario. Guarde primero los datos personales en la pestaña Datos.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-6 pb-6">
                <ol class="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <li class="rounded-lg border bg-muted/30 px-4 py-3">
                    <span class="font-medium text-foreground">1. Datos</span>
                    <p class="mt-1">
                      Identificación, contacto y usuario del sistema.
                    </p>
                  </li>
                  <li class="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
                    <span class="font-medium text-foreground">2. Ubicación</span>
                    <p class="mt-1">
                      Agencia, área, cargo, jefe inmediato y vigencia.
                    </p>
                  </li>
                </ol>
                <div class="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" @click="goToDatosTab">
                    <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
                    Volver a Datos
                  </Button>
                  <Button type="button" @click="handleSubmit" :disabled="saving">
                    <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    {{ saving ? 'Guardando...' : 'Crear funcionario y continuar' }}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
  min-height: 2.25rem;
  width: 100%;
  min-width: 0;
}

.multiselect-roles.multiselect-danger {
  --ms-border-color: var(--destructive);
  --ms-border-color-active: var(--destructive);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--destructive) 25%, transparent);
}
</style>
