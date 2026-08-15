<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'
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

const orgUnitCodePrefix = computed(() => series.value?.org_unit?.code ?? '')

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
    const code = catalogCodeSuffix(orgUnitCodePrefix.value, form.value.code)
    await $api(`/archival/catalog/series/${id.value}`, {
      method: 'PUT',
      body: {
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        publishable_to_institutional_library: form.value.publishable_to_institutional_library,
      },
    })
    toast.success('Serie actualizada')
    await catalogApi.navigateAfterCatalogSave(router, route, cancelPath())
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? 'No se pudo guardar')
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
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-xl">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar serie
          </h2>
          <p v-if="series?.org_unit" class="text-sm text-muted-foreground">
            Área: {{ series.org_unit.name }} ({{ series.org_unit.code }})
          </p>
        </div>
        <Button
          variant="outline"
          @click="router.push(cancelPath())"
        >
          Volver
        </Button>
      </div>
      <Card v-if="!loading">
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código *</Label>
            <CatalogPrefixedCodeInput
              v-model="form.code"
              :prefix="orgUnitCodePrefix"
              maxlength="64"
              placeholder="Sufijo (ej. 02)"
            />
            <p class="text-xs text-muted-foreground">
              Prefijo: código del área (<span class="font-mono">{{ orgUnitCodePrefix || '…' }}</span>).
              Ejemplo: área <span class="font-mono">045</span> + sufijo <span class="font-mono">02</span> → serie <span class="font-mono">045-02</span>.
            </p>
          </div>
          <div class="space-y-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="space-y-2">
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
            class="text-xs text-amber-700 dark:text-amber-400"
          >
            {{ subseriesCount }} subserie(s) registrada(s). Para inactivar la serie, quite o inactivé primero todas sus subseries y tipos documentales.
          </p>
          <div class="rounded-md border bg-muted/20 p-3">
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
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.back()">
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
