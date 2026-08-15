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
const catalogApi = useArchivalCatalogApi()
const { $api } = useNuxtApp()

const seriesId = computed(() => Number(route.params.seriesId))
const subseriesId = computed(() => Number(route.params.subseriesId))

const returnToPath = computed(() => catalogApi.returnToPath(route))

function cancelPath(): string {
  if (returnToPath.value) {
    return returnToPath.value
  }

  return catalogApi.subseriesListPath(seriesId.value)
}

const series = ref<DocSeriesRow | null>(null)
const form = ref({ code: '', name: '', description: '', is_active: true })
const initialIsActive = ref(true)
const activeDocumentTypesCount = ref(0)
const loading = ref(true)
const saving = ref(false)
const cascadeDialogOpen = ref(false)

const seriesCodePrefix = computed(() => series.value?.code ?? '')

const isDeactivating = computed(() => initialIsActive.value && form.value.is_active === false)

async function load() {
  loading.value = true
  try {
    const row = await catalogApi.fetchSubseriesById(subseriesId.value)
    if (row.doc_series_id !== seriesId.value) {
      toast.error('La subserie no pertenece a esta serie')
      await router.push(catalogApi.subseriesListPath(seriesId.value))
      return
    }
    series.value = await catalogApi.fetchSeriesById(seriesId.value)
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      is_active: row.is_active,
    }
    initialIsActive.value = row.is_active
    activeDocumentTypesCount.value = row.active_document_types_count ?? 0
  }
  catch {
    toast.error('Subserie no encontrada')
    await router.push(catalogApi.subseriesListPath(seriesId.value))
  }
  finally {
    loading.value = false
  }
}

async function persist(cascadeDeactivateChildren: boolean) {
  saving.value = true
  try {
    const code = catalogCodeSuffix(seriesCodePrefix.value, form.value.code)
    await $api(`/archival/catalog/subseries/${subseriesId.value}`, {
      method: 'PUT',
      body: {
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        ...(isDeactivating.value && cascadeDeactivateChildren
          ? { cascade_deactivate_active_children: true }
          : {}),
      },
    })
    toast.success('Subserie actualizada')
    await catalogApi.navigateAfterCatalogSave(
      router,
      route,
      catalogApi.subseriesListPath(seriesId.value),
    )
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? 'No se pudo guardar')
  }
  finally {
    saving.value = false
    cascadeDialogOpen.value = false
  }
}

function submit() {
  if (isDeactivating.value && activeDocumentTypesCount.value > 0) {
    cascadeDialogOpen.value = true
    return
  }

  void persist(false)
}

function confirmCascadeDeactivation() {
  void persist(true)
}

function cancelCascadeDialog() {
  cascadeDialogOpen.value = false
  form.value.is_active = true
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-xl">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar subserie
          </h2>
          <p v-if="series" class="text-sm text-muted-foreground">
            Serie <span class="font-mono">{{ series.code }}</span> — {{ series.name }}
          </p>
        </div>
        <Button variant="outline" @click="router.push(cancelPath())">
          Volver
        </Button>
      </div>
      <Card v-if="!loading">
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código *</Label>
            <CatalogPrefixedCodeInput
              v-if="series"
              v-model="form.code"
              :prefix="seriesCodePrefix"
              maxlength="64"
              placeholder="02"
            />
            <p class="text-xs text-muted-foreground leading-relaxed">
              Prefijo: código de la serie. Solo digite el sufijo (ej. <span class="font-mono">02</span> → <span class="font-mono">{{ series?.code ?? '045-02' }}-02</span>).
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
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <p
            v-if="activeDocumentTypesCount > 0 && form.is_active"
            class="text-xs text-muted-foreground"
          >
            {{ activeDocumentTypesCount }} tipo(s) documental(es) activo(s) en esta subserie.
            Al inactivarla se le preguntará si desea inactivarlos también.
          </p>
          <div class="flex justify-end gap-2">
            <Button :disabled="saving" @click="submit">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <AlertDialog v-model:open="cascadeDialogOpen">
      <AlertDialogContent class="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Inactivar subserie</AlertDialogTitle>
          <AlertDialogDescription>
            Esta subserie tiene
            <strong>{{ activeDocumentTypesCount }}</strong>
            tipo(s) documental(es) activo(s).
            ¿Desea inactivarlos también antes de inactivar la subserie?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel :disabled="saving" @click="cancelCascadeDialog">
            Cancelar
          </AlertDialogCancel>
          <Button :disabled="saving" @click="confirmCascadeDeactivation">
            Inactivar tipos y subserie
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsLayout>
</template>
