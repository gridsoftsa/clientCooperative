<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import type { PaginatedUsers, User } from '~/types/user'
import {
  STAFF_CREATE_DRAFT_KEY,
  STAFF_CREATE_RETURN_PATH,
  USER_CREATE_PREFILL_FROM_STAFF_KEY,
  hasStaffPersonalInfoForUserPrefill,
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
  is_active: true,
})

const userOptions = ref<Array<{ id: number; label: string }>>([])
const saving = ref(false)

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
  if (!form.value.first_name.trim() || !form.value.first_last_name.trim()) {
    toast.error('Primer nombre y primer apellido son obligatorios')
    return
  }
  const docNumber = form.value.document_number.trim()
  const docType = form.value.document_type.trim()
  if ((docNumber && !docType) || (docType && !docNumber)) {
    toast.error('Indique tipo y número de documento')
    return
  }
  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>('/organizational-structure/org-staff', {
      method: 'POST',
      body: {
        user_id: form.value.user_id ?? undefined,
        first_name: form.value.first_name.trim(),
        second_name: form.value.second_name.trim() || undefined,
        first_last_name: form.value.first_last_name.trim(),
        second_last_name: form.value.second_last_name.trim() || undefined,
        email: form.value.email.trim() || undefined,
        phone: form.value.phone.trim() || undefined,
        extension: form.value.extension.trim() || undefined,
        document_type: docType || undefined,
        document_number: docNumber || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Funcionario creado')
    const id = res.data.id
    router.push({
      path: `/settings/organizational-structure/staff/${id}/edit`,
      query: { tab: 'ubicacion' },
    })
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  } finally {
    saving.value = false
  }
}

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
            Tras crear el registro podrá definir ubicación organizacional y cargo principal.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="mx-auto w-full max-w-5xl space-y-6">
          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Datos del funcionario</CardTitle>
              <CardDescription class="leading-relaxed">
                Nombre completo obligatorio conforme registros institucionales; contacto y usuario son opcionales.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-8">
              <section class="space-y-4">
                <p class="text-sm font-medium text-foreground">
                  Identificación
                </p>
                <div class="flex flex-wrap gap-x-8 gap-y-5">
                  <div class="staff-field-doc-type space-y-2">
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
                      class="multiselect-roles"
                    />
                  </div>
                  <div class="staff-field-doc space-y-2">
                    <Label for="doc" class="leading-snug">Número de documento</Label>
                    <Input id="doc" v-model="form.document_number" inputmode="numeric" />
                  </div>
                </div>
              </section>

              <Separator />

              <section class="space-y-4">
                <p class="text-sm font-medium text-foreground">
                  Nombres y apellidos
                </p>
                <div class="flex flex-wrap gap-x-8 gap-y-5">
                  <div class="staff-field space-y-2">
                    <Label for="fn" class="leading-snug">Primer nombre *</Label>
                    <Input id="fn" v-model="form.first_name" required autocomplete="given-name" />
                  </div>
                  <div class="staff-field space-y-2">
                    <Label for="sn" class="leading-snug">Segundo nombre</Label>
                    <Input id="sn" v-model="form.second_name" autocomplete="additional-name" />
                  </div>
                  <div class="staff-field space-y-2">
                    <Label for="fl" class="leading-snug">Primer apellido *</Label>
                    <Input id="fl" v-model="form.first_last_name" required autocomplete="family-name" />
                  </div>
                  <div class="staff-field space-y-2">
                    <Label for="sl" class="leading-snug">Segundo apellido</Label>
                    <Input id="sl" v-model="form.second_last_name" />
                  </div>
                </div>
              </section>

              <Separator />

              <section class="space-y-4">
                <p class="text-sm font-medium text-foreground">
                  Contacto
                </p>
                <div class="flex flex-wrap gap-x-8 gap-y-5">
                  <div class="staff-field-email space-y-2">
                    <Label for="em" class="leading-snug">Correo</Label>
                    <Input
                      id="em"
                      v-model="form.email"
                      type="email"
                      autocomplete="email"
                    />
                  </div>
                  <div class="staff-field-phone space-y-2">
                    <Label for="ph" class="leading-snug">Teléfono</Label>
                    <Input id="ph" v-model="form.phone" type="tel" autocomplete="tel" />
                  </div>
                  <div class="staff-field-extension space-y-2">
                    <Label for="ex" class="leading-snug">Extensión</Label>
                    <Input id="ex" v-model="form.extension" />
                  </div>
                </div>
              </section>

              <template v-if="hasPermission('usuarios_ver')">
                <Separator />
                <section class="space-y-4">
                  <div class="space-y-1">
                    <p class="text-sm font-medium text-foreground">
                      Vínculo con usuario del sistema
                    </p>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                      Opcional: asocie una cuenta existente sin funcionario vinculado.
                    </p>
                  </div>
                  <div class="space-y-2">
                    <Label for="usr" class="leading-snug">Usuario</Label>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div class="staff-field-user min-w-0">
                        <Multiselect
                          id="usr"
                          v-model="form.user_id"
                          mode="single"
                          :object="false"
                          :options="userSelectOptions"
                          value-prop="value"
                          label="label"
                          :searchable="true"
                          :can-clear="true"
                          placeholder="Sin vínculo — busque usuario…"
                          no-options-text="No hay usuarios sin funcionario vinculado"
                          no-results-text="Sin coincidencias"
                          class="multiselect-roles"
                        />
                      </div>
                      <PermissionGate permission="usuarios_crear">
                        <Button
                          type="button"
                          variant="outline"
                          class="shrink-0"
                          @click="saveDraftAndGoCreateUser"
                        >
                          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                          Crear usuario
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </section>
              </template>

              <p
                v-else
                class="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground leading-relaxed"
              >
                No tiene permiso para listar usuarios; puede crear el funcionario sin vínculo y asociarlo después desde la edición, si corresponde.
              </p>

              <Separator />

              <section class="space-y-4">
                <div class="space-y-1">
                  <p class="text-sm font-medium text-foreground">
                    Estado del registro
                  </p>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Por defecto queda activo; desactive si el alta es provisional.
                  </p>
                </div>
                <div class="staff-field-status">
                  <OrgStructureActiveMultiselect
                    :model-value="form.is_active"
                    gender="masculine"
                    input-id="staff_create_active_ms"
                    :show-label="false"
                    @update:model-value="onStaffActiveChange"
                  />
                </div>
              </section>
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
    </div>
  </SettingsLayout>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.staff-field {
  width: 100%;
  max-width: 13rem;
}

.staff-field-email {
  width: 100%;
  max-width: 18rem;
}

.staff-field-phone {
  width: 100%;
  max-width: 11rem;
}

.staff-field-extension {
  width: 100%;
  max-width: 6.5rem;
}

.staff-field-doc-type {
  width: 100%;
  max-width: 14rem;
}

.staff-field-doc {
  width: 100%;
  max-width: 11rem;
}

.staff-field-user {
  width: 100%;
  max-width: 18rem;
}

.staff-field-status {
  width: 100%;
  max-width: 11rem;
}

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
</style>
