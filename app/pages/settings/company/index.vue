<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  type Company,
} from '~/types/company'
import { normalizeHexColor } from '~/utils/company-branding'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'empresa_ver',
})

const { $api, $csrf } = useNuxtApp()
const config = useRuntimeConfig()
const { refreshBranding, institutionalColors, setInstitutionalColors, applyThemeAfterInstitutionalSave } = useCompanyBranding()

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

const previewPrimary = computed(() => normalizeHexColor(institutionalColors.value.primary, DEFAULT_COMPANY_PRIMARY_COLOR))
const previewSecondary = computed(() => normalizeHexColor(institutionalColors.value.secondary, DEFAULT_COMPANY_SECONDARY_COLOR))

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
    setInstitutionalColors(
      res.data.primary_color ?? DEFAULT_COMPANY_PRIMARY_COLOR,
      res.data.secondary_color ?? DEFAULT_COMPANY_SECONDARY_COLOR,
    )
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
  if (input) {
    input.value = ''
  }
}

function resetBrandColors() {
  setInstitutionalColors(DEFAULT_COMPANY_PRIMARY_COLOR, DEFAULT_COMPANY_SECONDARY_COLOR)
}

function onPrimaryColorTextChange(value: string | number) {
  const next = String(value ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(next)) {
    setInstitutionalColors(next.toUpperCase(), institutionalColors.value.secondary)
  } else {
    institutionalColors.value = { ...institutionalColors.value, primary: next }
  }
}

function onSecondaryColorTextChange(value: string | number) {
  const next = String(value ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(next)) {
    setInstitutionalColors(institutionalColors.value.primary, next.toUpperCase())
  } else {
    institutionalColors.value = { ...institutionalColors.value, secondary: next }
  }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre de la empresa es obligatorio')
    return
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(institutionalColors.value.primary) || !/^#[0-9A-Fa-f]{6}$/.test(institutionalColors.value.secondary)) {
    toast.error('Los colores deben estar en formato hexadecimal (#RRGGBB)')
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
    formData.append('primary_color', institutionalColors.value.primary.toUpperCase())
    formData.append('secondary_color', institutionalColors.value.secondary.toUpperCase())
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
    await refreshBranding()
    applyThemeAfterInstitutionalSave()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    console.error('Error al guardar:', e)
    toast.error(first ?? err.data?.message ?? 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchCompany()
})
</script>

<template>
  <SettingsLayout wide>
    <div class="flex w-full flex-col gap-6">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 class="text-xl font-semibold tracking-tight">
            Empresa e identidad visual
          </h3>
          <p class="text-sm text-muted-foreground">
            Logotipo, colores y datos legales. Los cambios se aplican al portal para todos los usuarios.
          </p>
        </div>
        <PermissionGate permission="empresa_editar">
          <Button
            type="submit"
            form="company-settings-form"
            :disabled="saving || loading || !company"
            class="shrink-0"
          >
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Guardar cambios
          </Button>
        </PermissionGate>
      </div>

      <Card v-if="loading">
        <CardContent class="flex min-h-[320px] items-center justify-center p-6">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>

      <form
        v-else-if="company"
        id="company-settings-form"
        class="grid gap-6 xl:grid-cols-12"
        @submit.prevent="handleSubmit"
      >
        <div class="grid gap-6 xl:col-span-5">
          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Logotipo
              </CardTitle>
              <CardDescription>
                Menú lateral, inicio de sesión y favicon del navegador.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div
                class="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/35 bg-muted/25 p-6"
              >
                <img
                  v-if="logoPreview"
                  :src="logoPreview"
                  alt="Logo"
                  class="max-h-32 w-full max-w-[280px] object-contain"
                >
                <div v-else class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-image" class="size-12 opacity-60" />
                  <p class="text-sm">
                    Sin logotipo configurado
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <input
                  id="logo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  class="flex h-9 min-w-[220px] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                  @change="onLogoChange"
                >
                <Button v-if="logoPreview" type="button" variant="outline" size="sm" @click="clearLogo">
                  Quitar selección
                </Button>
              </div>
              <p class="text-xs text-muted-foreground">
                PNG, JPG o WebP. Máximo 2 MB.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle class="text-base">
                    Colores institucionales
                  </CardTitle>
                  <CardDescription>
                    Primario en cabecera y botones; secundario en acentos y outline.
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" @click="resetBrandColors">
                  Restaurar
                </Button>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2 rounded-lg border p-3">
                  <Label for="primary_color">Color primario</Label>
                  <div class="flex items-center gap-3">
                    <input
                      id="primary_color_picker"
                      v-model="institutionalColors.primary"
                      type="color"
                      class="h-11 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                    >
                    <Input
                      id="primary_color"
                      :model-value="institutionalColors.primary"
                      placeholder="#125EAD"
                      @update:model-value="onPrimaryColorTextChange"
                    />
                  </div>
                </div>

                <div class="space-y-2 rounded-lg border p-3">
                  <Label for="secondary_color">Color secundario</Label>
                  <div class="flex items-center gap-3">
                    <input
                      id="secondary_color_picker"
                      v-model="institutionalColors.secondary"
                      type="color"
                      class="h-11 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                    >
                    <Input
                      id="secondary_color"
                      :model-value="institutionalColors.secondary"
                      placeholder="#FBAC18"
                      @update:model-value="onSecondaryColorTextChange"
                    />
                  </div>
                </div>
              </div>

              <div class="overflow-hidden rounded-xl border">
                <div
                  class="flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
                  :style="{ backgroundColor: previewPrimary }"
                >
                  <span>{{ form.name || 'Nombre de la empresa' }}</span>
                  <span class="opacity-80">Cabecera</span>
                </div>
                <div class="space-y-3 bg-card p-4">
                  <div class="flex flex-wrap gap-2">
                    <span
                      class="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                      :style="{ backgroundColor: previewPrimary }"
                    >
                      Acción principal
                    </span>
                    <span
                      class="rounded-md border-2 px-3 py-1.5 text-sm font-medium"
                      :style="{ borderColor: previewSecondary, color: previewSecondary }"
                    >
                      Acción secundaria
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      class="size-8 rounded-full border"
                      :style="{ backgroundColor: previewPrimary }"
                    />
                    <span
                      class="size-8 rounded-full border"
                      :style="{ backgroundColor: previewSecondary }"
                    />
                    <span class="text-xs text-muted-foreground">
                      Vista previa de la paleta
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="grid gap-6 xl:col-span-7">
          <Card class="h-full">
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Datos de la empresa
              </CardTitle>
              <CardDescription>
                Información legal y de identificación de la cooperativa.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-5">
              <div class="grid gap-4 lg:grid-cols-2">
                <div class="space-y-2 lg:col-span-2">
                  <Label for="name">Nombre de la empresa *</Label>
                  <Input
                    id="name"
                    v-model="form.name"
                    placeholder="Ej: Cooperativa de Ahorro XYZ"
                    required
                  />
                </div>
                <div class="space-y-2">
                  <Label for="nit">NIT</Label>
                  <Input
                    id="nit"
                    v-model="form.nit"
                    placeholder="Ej: 900.123.456-7"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="razon_social">Razón social</Label>
                  <Input
                    id="razon_social"
                    v-model="form.razon_social"
                    placeholder="Razón social legal"
                  />
                </div>
                <div class="space-y-2 lg:col-span-2">
                  <Label for="legal_representative">Representante legal</Label>
                  <Input
                    id="legal_representative"
                    v-model="form.legal_representative"
                    placeholder="Nombre del representante legal"
                  />
                </div>
              </div>

              <div class="rounded-lg border bg-muted/20 p-4">
                <p class="mb-3 text-sm font-medium">
                  Resumen actual
                </p>
                <dl class="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-muted-foreground">
                      Nombre público
                    </dt>
                    <dd class="font-medium">
                      {{ form.name || '—' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">
                      NIT
                    </dt>
                    <dd class="font-medium">
                      {{ form.nit || '—' }}
                    </dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-muted-foreground">
                      Razón social
                    </dt>
                    <dd class="font-medium">
                      {{ form.razon_social || '—' }}
                    </dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-muted-foreground">
                      Representante legal
                    </dt>
                    <dd class="font-medium">
                      {{ form.legal_representative || '—' }}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <div class="flex justify-end xl:hidden">
            <PermissionGate permission="empresa_editar">
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                Guardar cambios
              </Button>
            </PermissionGate>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
