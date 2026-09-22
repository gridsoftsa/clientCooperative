<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogConfidentialityFields from '~/components/archival/CatalogConfidentialityFields.vue'
import type { DocSeriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_editar',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const catalogApi = useArchivalCatalogApi()

const id = computed(() => Number(route.params.id))
const series = ref<DocSeriesRow | null>(null)
const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
  publishable_to_institutional_library: false,
})
const initialIsActive = ref(true)
const subseriesCount = ref(0)
const loading = ref(true)
const saving = ref(false)
const confidentialityFields = ref<{
  validate: () => string | null
  toPayload: () => {
    inherited: boolean
    confidentiality_level?: import('~/types/archival-catalog').DocumentConfidentialityLevel
    grants?: import('~/types/archival-catalog').ClassificationAccessGrantRow[]
  }
} | null>(null)

const isDeactivating = computed(() => initialIsActive.value && form.value.is_active === false)

const seriesDeactivationBlockReason = computed(() => {
  if (subseriesCount.value > 0) {
    return 'No se puede inactivar la serie mientras tenga subseries. Quite o inactivé primero sus subseries y tipos documentales.'
  }

  return null
})

const returnToPath = computed(() => catalogApi.returnToPath(route))

function cancelPath(): string {
  if (returnToPath.value) {
    return returnToPath.value
  }

  const orgUnitId = series.value?.org_unit_id
  const listQuery = orgUnitId != null ? `?org_unit_id=${orgUnitId}` : ''

  return `/settings/archival/catalog/series${listQuery}`
}

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: DocSeriesRow }>(`/archival/catalog/series/${id.value}`)
    series.value = res.data
    form.value = {
      code: res.data.code,
      name: res.data.name,
      description: res.data.description ?? '',
      is_active: res.data.is_active,
      publishable_to_institutional_library: res.data.publishable_to_institutional_library ?? false,
    }
    initialIsActive.value = res.data.is_active
    subseriesCount.value = res.data.subseries_count ?? 0
  }
  catch {
    toast.error('Serie no encontrada')
    await router.push('/settings/archival/catalog/series')
  }
  finally {
    loading.value = false
  }
}

async function persist() {
  if (isDeactivating.value && seriesDeactivationBlockReason.value) {
    toast.error(seriesDeactivationBlockReason.value)
    form.value.is_active = true
    return
  }

  saving.value = true
  try {
    const storedCode = (series.value?.code ?? '').trim()
    const code = form.value.code.trim()
    await $api(`/archival/catalog/series/${id.value}`, {
      method: 'PUT',
      body: {
        ...(code !== storedCode ? { code } : {}),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        publishable_to_institutional_library: form.value.publishable_to_institutional_library,
      },
    })
    await catalogApi.persistClassification(confidentialityFields.value, 'series', id.value)
    toast.success('Serie actualizada')
    await catalogApi.navigateAfterCatalogSave(router, route, cancelPath())
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
    if (isDeactivating.value) {
      form.value.is_active = true
    }
  }
  finally {
    saving.value = false
  }
}

function onActiveToggle(active: boolean) {
  if (!active && seriesDeactivationBlockReason.value) {
    toast.error(seriesDeactivationBlockReason.value)
    form.value.is_active = true
    return
  }

  form.value.is_active = active
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-fit -ml-2 px-2"
          @click="router.push(cancelPath())"
        >
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Volver a series
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar serie
        </h2>
        <p v-if="series?.org_unit" class="text-sm text-muted-foreground">
          {{ series.org_unit.name }}
          <span class="font-mono">({{ series.org_unit.code }})</span>
        </p>
      </div>
      <Card v-if="!loading">
        <CardHeader>
          <CardTitle>Datos de la serie</CardTitle>
          <CardDescription>
            Código, nombre y publicación en biblioteca institucional.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="series-code">Código *</Label>
            <Input
              id="series-code"
              v-model="form.code"
              maxlength="64"
              placeholder="005-16"
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground">
              Código de la serie en la TRD (p. ej. <span class="font-mono">005-16</span>).
              El área productora se guarda aparte y no se agrega al código.
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch
              id="active"
              :checked="form.is_active"
              @update:checked="onActiveToggle($event === true)"
            />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <p
            v-if="subseriesCount > 0 && form.is_active"
            class="text-xs text-amber-700 dark:text-amber-400 lg:col-span-2"
          >
            {{ subseriesCount }} subserie(s) registrada(s). Para inactivar la serie, quite o inactivé primero todas sus subseries y tipos documentales.
          </p>
          <div class="rounded-md border bg-muted/20 p-3 lg:col-span-2">
            <div class="flex items-start gap-2">
              <Checkbox
                id="publishable_library"
                v-model="form.publishable_to_institutional_library"
                bare
                class="mt-0.5"
              />
              <div class="space-y-1">
                <Label for="publishable_library" class="font-normal leading-snug cursor-pointer">
                  Publicable en biblioteca institucional
                </Label>
                <p class="text-xs text-muted-foreground">
                  Los documentos clasificados en esta serie (y sus subseries y tipos documentales)
                  podrán publicarse en la biblioteca institucional.
                </p>
              </div>
            </div>
          </div>
          </div>
          <CatalogConfidentialityFields
            ref="confidentialityFields"
            subject-type="series"
            :confidentiality="series?.confidentiality"
          />
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.push(cancelPath())">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="persist">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
