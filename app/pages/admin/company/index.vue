<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Company } from '~/types/company'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'company.view',
})

const { $api, $csrf } = useNuxtApp()
const config = useRuntimeConfig()
const { hasPermission } = usePermissions()

const company = ref<Company | null>(null)
const loading = ref(false)
const saving = ref(false)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)

const form = ref({
  name: '',
  nit: '',
  razon_social: '',
  legal_representative: '',
})

async function fetchCompany() {
  loading.value = true
  try {
    const res = await $api<{ data: Company }>('/company')
    company.value = res.data
    form.value = {
      name: res.data.name,
      nit: res.data.nit ?? '',
      razon_social: res.data.razon_social ?? '',
      legal_representative: res.data.legal_representative ?? '',
    }
    logoPreview.value = res.data.logo_url ?? null
  } catch (e) {
    console.error('Error al cargar empresa:', e)
    toast.error('Error al cargar datos de la empresa')
  } finally {
    loading.value = false
  }
}

function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    logoFile.value = file
    logoPreview.value = URL.createObjectURL(file)
  } else {
    logoFile.value = null
  }
}

function clearLogo() {
  logoFile.value = null
  logoPreview.value = company.value?.logo_url ?? null
  const input = document.getElementById('logo-input') as HTMLInputElement
  if (input) input.value = ''
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre de la empresa es obligatorio')
    return
  }
  saving.value = true
  try {
    await $csrf()
    const baseURL = config.public.apiBase ? `${config.public.apiBase}/api` : '/api'
    const formData = new FormData()
    formData.append('name', form.value.name)
    formData.append('nit', form.value.nit)
    formData.append('razon_social', form.value.razon_social)
    formData.append('legal_representative', form.value.legal_representative)
    if (logoFile.value) {
      formData.append('logo', logoFile.value)
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
    const xsrf = useCookie('XSRF-TOKEN')
    if (xsrf.value) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf.value)
    }

    await $fetch(`${baseURL}/company`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    })

    toast.success('Empresa guardada correctamente')
    logoFile.value = null
    await fetchCompany()
  } catch (e: any) {
    console.error('Error al guardar:', e)
    toast.error(e?.data?.message || e?.data?.errors?.name?.[0] || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchCompany()
})
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col gap-4">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Empresa principal
      </h2>
      <p class="text-muted-foreground">
        Datos de la cooperativa (madre de todas las sucursales)
      </p>
    </div>

    <Card v-if="loading">
      <CardContent class="p-6">
        <div class="flex justify-center">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin" />
        </div>
      </CardContent>
    </Card>

    <Card v-else-if="company">
      <CardContent class="pt-6">
        <form class="grid gap-6" @submit.prevent="handleSubmit">
          <!-- Logotipo -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="flex flex-col gap-2">
              <Label>Logotipo</Label>
              <div class="flex items-center gap-4">
                <div
                  class="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted/50 overflow-hidden"
                >
                  <img
                    v-if="logoPreview"
                    :src="logoPreview"
                    alt="Logo"
                    class="h-full w-full object-contain"
                  >
                  <Icon v-else name="i-lucide-image" class="h-10 w-10 text-muted-foreground" />
                </div>
                <div class="flex flex-col gap-2">
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                    @change="onLogoChange"
                  >
                  <p class="text-xs text-muted-foreground">
                    PNG, JPG, WebP (máx. 2 MB)
                  </p>
                  <Button v-if="logoPreview" type="button" variant="ghost" size="sm" @click="clearLogo">
                    Quitar imagen
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4">
            <div>
              <Label for="name">Nombre de la empresa *</Label>
              <Input
                id="name"
                v-model="form.name"
                placeholder="Ej: Cooperativa de Ahorro XYZ"
                required
              />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label for="nit">NIT</Label>
                <Input
                  id="nit"
                  v-model="form.nit"
                  placeholder="Ej: 900.123.456-7"
                />
              </div>
              <div>
                <Label for="razon_social">Razón social</Label>
                <Input
                  id="razon_social"
                  v-model="form.razon_social"
                  placeholder="Razón social legal"
                />
              </div>
            </div>
            <div>
              <Label for="legal_representative">Representante legal</Label>
              <Input
                id="legal_representative"
                v-model="form.legal_representative"
                placeholder="Nombre del representante legal"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <PermissionGate permission="company.edit">
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                Guardar
              </Button>
            </PermissionGate>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
