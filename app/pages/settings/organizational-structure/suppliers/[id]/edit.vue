<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import { isOrgStaffEmailValid } from '~/utils/staff-user-create-bridge'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const talentApi = useTalentPartyApi()
const partyId = computed(() => Number(route.params.id))
const loading = ref(true)
const hasArchivalFile = ref(false)

const { options: documentTypeOptions, fetchOptions: fetchDocumentTypeOptions } = useTemplateFlatCatalogOptions('tipo-documento', [
  { value: 'NIT', label: 'NIT' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
])

const form = ref({
  display_name: '',
  document_type: 'NIT',
  document_number: '',
  phone: '',
  email: '',
  address: '',
  postal_code: '',
  is_active: true,
})

const saving = ref(false)
const submitAttempted = ref(false)
const trdConfigReady = ref(false)

type RequiredField = 'display_name' | 'document_type' | 'document_number' | 'email'

const requiredFieldIds: Record<Exclude<RequiredField, 'email'>, string> = {
  display_name: 'supplier_company_name',
  document_type: 'supplier_doc_type',
  document_number: 'supplier_doc_number',
}

function isEmailInvalid(): boolean {
  return form.value.email.trim() !== '' && !isOrgStaffEmailValid(form.value.email)
}

function isFieldMissing(field: RequiredField): boolean {
  if (field === 'display_name') {
    return !form.value.display_name.trim()
  }
  if (field === 'document_type') {
    return !form.value.document_type.trim()
  }
  if (field === 'document_number') {
    return !form.value.document_number.trim()
  }

  return isEmailInvalid()
}

function firstMissingField(): RequiredField | null {
  const order: RequiredField[] = ['document_type', 'document_number', 'display_name', 'email']

  return order.find(field => isFieldMissing(field)) ?? null
}

function fieldErrorClass(missing: boolean): string {
  return missing ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40' : ''
}

function formFieldErrorClass(field: Exclude<RequiredField, 'email'>): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing(field))
}

function emailErrorClass(): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing('email'))
}

function documentTypeErrorClass(): string {
  return submitAttempted.value && isFieldMissing('document_type')
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

function onActiveChange(value: boolean): void {
  form.value.is_active = value
}

async function loadTrdConfig(): Promise<void> {
  try {
    const response = await talentApi.settings()
    const settings = response.data
    trdConfigReady.value = settings.supplier_trd_table_id != null && settings.supplier_doc_subseries_ids.length > 0
  }
  catch {
    trdConfigReady.value = false
  }
}

async function handleSubmit(): Promise<void> {
  submitAttempted.value = true
  const firstMissing = firstMissingField()
  if (firstMissing) {
    const messages: Record<RequiredField, string> = {
      display_name: 'El nombre de la compañía es obligatorio',
      document_type: 'El tipo de documento es obligatorio',
      document_number: 'El número de documento es obligatorio',
      email: 'Ingrese un correo electrónico válido',
    }
    toast.error(messages[firstMissing])
    await nextTick()
    if (firstMissing === 'email') {
      focusByElementId('supplier_email')
    }
    else {
      focusByElementId(requiredFieldIds[firstMissing])
    }
    return
  }

  saving.value = true
  try {
    const response = await talentApi.update(partyId.value, {
      display_name: form.value.display_name.trim(),
      identifier: form.value.document_number.trim(),
      document_type: form.value.document_type.trim(),
      email: form.value.email.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      address: form.value.address.trim() || undefined,
      postal_code: form.value.postal_code.trim() || undefined,
      is_active: form.value.is_active,
    })
    toast.success(response.message || 'Proveedor actualizado.')
    await router.push('/settings/organizational-structure/suppliers')
  }
  catch (error: unknown) {
    const data = (error as { data?: { message?: string, errors?: Record<string, string[]> } })?.data
    const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    toast.error(first || data?.message || 'No se pudo actualizar el proveedor.')
  }
  finally {
    saving.value = false
  }
}

watch(form, () => {
  if (!submitAttempted.value) {
    return
  }
  if (!firstMissingField()) {
    submitAttempted.value = false
  }
}, { deep: true })

async function loadParty(): Promise<void> {
  loading.value = true
  try {
    const response = await talentApi.show(partyId.value)
    if (response.data.kind !== 'supplier') {
      await router.push('/settings/organizational-structure/suppliers')
      return
    }
    form.value = {
      display_name: response.data.display_name,
      document_type: response.data.document_type || 'NIT',
      document_number: response.data.identifier || '',
      phone: response.data.phone || '',
      email: response.data.email || '',
      address: response.data.address || '',
      postal_code: response.data.postal_code || '',
      is_active: response.data.is_active !== false,
    }
    hasArchivalFile.value = response.data.archival_file_id != null
  }
  catch {
    toast.error('No se pudo cargar el proveedor.')
    await router.push('/settings/organizational-structure/suppliers')
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchDocumentTypeOptions(), loadTrdConfig(), loadParty()])
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar proveedor
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Actualice la identificación y los datos de contacto. Al guardar vuelve al listado.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.push('/settings/organizational-structure/suppliers')">
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

      <form v-else @submit.prevent="handleSubmit">
        <div class="grid gap-6">
          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">
                Información
              </CardTitle>
              <CardDescription class="leading-relaxed">
                Tipo de documento, número y razón social son obligatorios. El catálogo de tipo de documento es el mismo de funcionarios.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-8">
              <section class="space-y-4">
                <p class="text-sm font-medium leading-snug text-foreground">
                  Identificación
                </p>
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_doc_type" class="leading-snug">Tipo de documento *</Label>
                    <Multiselect
                      id="supplier_doc_type"
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
                      :class="documentTypeErrorClass()"
                    />
                  </div>
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_doc_number" class="leading-snug">Documento *</Label>
                    <Input
                      id="supplier_doc_number"
                      v-model="form.document_number"
                      placeholder="Ingrese documento"
                      :class="formFieldErrorClass('document_number')"
                    />
                  </div>
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_company_name" class="leading-snug">Nombre de compañía *</Label>
                    <Input
                      id="supplier_company_name"
                      v-model="form.display_name"
                      placeholder="Ingrese nombre de la compañía"
                      :class="formFieldErrorClass('display_name')"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section class="space-y-4">
                <p class="text-sm font-medium leading-snug text-foreground">
                  Contacto
                </p>
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_phone" class="leading-snug">Celular</Label>
                    <Input
                      id="supplier_phone"
                      v-model="form.phone"
                      type="tel"
                      autocomplete="tel"
                      placeholder="Ingrese celular"
                    />
                  </div>
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_email" class="leading-snug">E-mail</Label>
                    <Input
                      id="supplier_email"
                      v-model="form.email"
                      type="email"
                      autocomplete="email"
                      placeholder="Ingrese e-mail"
                      :class="emailErrorClass()"
                    />
                    <p v-if="submitAttempted && isFieldMissing('email')" class="text-sm text-destructive">
                      Ingrese un correo electrónico válido
                    </p>
                  </div>
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_address" class="leading-snug">Dirección</Label>
                    <Input
                      id="supplier_address"
                      v-model="form.address"
                      autocomplete="street-address"
                      placeholder="Ingrese dirección"
                    />
                  </div>
                  <div class="min-w-0 space-y-3">
                    <Label for="supplier_postal_code" class="leading-snug">Código postal</Label>
                    <Input
                      id="supplier_postal_code"
                      v-model="form.postal_code"
                      autocomplete="postal-code"
                      placeholder="Ingrese código postal"
                    />
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>

          <Card v-if="!hasArchivalFile">
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">
                Archivo en TRD
              </CardTitle>
              <CardDescription class="leading-relaxed">
                {{ trdConfigReady
                  ? 'Al guardar se crea sola la carpeta del proveedor con la TRD y las subseries configuradas en Proveedores.'
                  : 'No hay configuración de archivo. Guárdela en Proveedores para que la carpeta se cree al guardar.' }}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">
                Estado del registro
              </CardTitle>
              <CardDescription class="leading-relaxed">
                Use el interruptor para activar o inactivar el registro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="max-w-xs">
                <OrgStructureActiveMultiselect
                  :model-value="form.is_active"
                  gender="masculine"
                  input-id="supplier_edit_active"
                  :show-label="false"
                  @update:model-value="onActiveChange"
                />
              </div>
            </CardContent>
          </Card>

          <div class="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" @click="router.push('/settings/organizational-structure/suppliers')">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
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
