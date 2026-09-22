<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogConfidentialityFields from '~/components/archival/CatalogConfidentialityFields.vue'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'
import type { DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'
import { isCatalogRestrictionsOnlyQuery } from '~/utils/catalog-published-restrictions'
import { coerceBoolean } from '~/utils/coerce-boolean'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_editar', 'trd_restrictions_manage'],
})

const route = useRoute()
const router = useRouter()
const catalogApi = useArchivalCatalogApi()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

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
const subseriesRow = ref<DocSubseriesRow | null>(null)
const form = ref({ code: '', name: '', description: '', is_active: true })
const storedCode = ref('')
const initialIsActive = ref(true)
const activeDocumentTypesCount = ref(0)
const loading = ref(true)
const saving = ref(false)
const cascadeDialogOpen = ref(false)
const confidentialityFields = ref<{
  validate: () => string | null
  toPayload: () => {
    inherited: boolean
    confidentiality_level?: import('~/types/archival-catalog').DocumentConfidentialityLevel
    grants?: import('~/types/archival-catalog').ClassificationAccessGrantRow[]
  }
} | null>(null)
const loadedConfidentiality = ref<import('~/types/archival-catalog').CatalogConfidentialityPayload | null>(null)

const seriesCodePrefix = computed(() => series.value?.code ?? '')

const restrictionsOnly = computed(() => isCatalogRestrictionsOnlyQuery(route.query))

const canManageRestrictions = computed(() => hasPermission('trd_restrictions_manage'))

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
    subseriesRow.value = row
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      is_active: coerceBoolean(row.is_active),
    }
    storedCode.value = row.code
    initialIsActive.value = coerceBoolean(row.is_active)
    activeDocumentTypesCount.value = row.active_document_types_count ?? 0
    loadedConfidentiality.value = row.confidentiality ?? null
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
  if (restrictionsOnly.value) {
    if (!canManageRestrictions.value) {
      toast.error('No tiene permiso para añadir o cambiar restricciones de una TRD publicada.')
      return
    }
    saving.value = true
    try {
      await catalogApi.persistClassification(confidentialityFields.value, 'subseries', subseriesId.value)
      toast.success('Restricciones actualizadas')
      await catalogApi.navigateAfterCatalogSave(
        router,
        route,
        catalogApi.subseriesListPath(seriesId.value),
      )
    }
    catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      toast.error(err.data?.message ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
    }
    finally {
      saving.value = false
      cascadeDialogOpen.value = false
    }
    return
  }

  saving.value = true
  try {
    const code = catalogCodeSuffix(seriesCodePrefix.value, form.value.code)
    const storedSuffix = catalogCodeSuffix(seriesCodePrefix.value, storedCode.value)
    await $api(`/archival/catalog/subseries/${subseriesId.value}`, {
      method: 'PUT',
      body: {
        ...(code !== storedSuffix ? { code } : {}),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        ...(isDeactivating.value && cascadeDeactivateChildren
          ? { cascade_deactivate_active_children: true }
          : {}),
      },
    })
    if (subseriesRow.value?.in_published_trd !== true || canManageRestrictions.value) {
      await catalogApi.persistClassification(confidentialityFields.value, 'subseries', subseriesId.value)
    }
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
    toast.error(first ?? err.data?.message ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
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
          Volver a subseries
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ restrictionsOnly ? 'Restricciones de la subserie' : 'Editar subserie' }}
        </h2>
        <p v-if="series" class="text-sm text-muted-foreground">
          Serie <span class="font-mono">{{ series.code }}</span> — {{ series.name }}
        </p>
      </div>
      <Card v-if="!loading">
        <CardHeader>
          <CardTitle>{{ restrictionsOnly ? 'Confidencialidad' : 'Datos de la subserie' }}</CardTitle>
          <CardDescription>
            <template v-if="restrictionsOnly">
              La TRD ya está publicada: no se edita el texto del catálogo. Solo se añaden o cambian restricciones.
            </template>
            <template v-else>
              Código y nombre dentro de la serie seleccionada.
            </template>
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div v-if="!restrictionsOnly" class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
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
          <div class="flex min-w-0 flex-col gap-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2 lg:col-span-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <p
            v-if="activeDocumentTypesCount > 0 && form.is_active"
            class="text-xs text-muted-foreground lg:col-span-2"
          >
            {{ activeDocumentTypesCount }} tipo(s) documental(es) activo(s) en esta subserie.
            Al inactivarla se le preguntará si desea inactivarlos también.
          </p>
          </div>
          <CatalogConfidentialityFields
            ref="confidentialityFields"
            subject-type="subseries"
            :confidentiality="loadedConfidentiality"
          />
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.push(cancelPath())">
              Cancelar
            </Button>
            <Button :disabled="saving || (restrictionsOnly && !canManageRestrictions)" @click="submit">
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
