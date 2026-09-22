<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogConfidentialityFields from '~/components/archival/CatalogConfidentialityFields.vue'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import {
  parseAllowedSupport,
  serializeAllowedSupport,
} from '~/constants/archival-document-support'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'
import type { CatalogConfidentialityPayload, DocDocumentTypeRow, DocSubseriesRow } from '~/types/archival-catalog'
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
const typeId = computed(() => Number(route.params.typeId))

const returnToPath = computed(() => catalogApi.returnToPath(route))

function cancelPath(): string {
  if (returnToPath.value) {
    return returnToPath.value
  }

  return catalogApi.documentTypesListPath(seriesId.value, subseriesId.value)
}

const subseries = ref<DocSubseriesRow | null>(null)
const typeRow = ref<DocDocumentTypeRow | null>(null)
const allowedSupportSelected = ref<string[]>([])

const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
})
const initialIsActive = ref(true)
const storedCode = ref('')
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
const loadedConfidentiality = ref<CatalogConfidentialityPayload | null>(null)

const subseriesCodePrefix = computed(() => subseries.value?.code ?? '')

const restrictionsOnly = computed(() => isCatalogRestrictionsOnlyQuery(route.query))

const canManageRestrictions = computed(() => hasPermission('trd_restrictions_manage'))

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: DocDocumentTypeRow }>(
      `/archival/catalog/document-types/${typeId.value}`,
    )
    const row = res.data
    if (row.doc_subseries_id !== subseriesId.value) {
      toast.error('El tipo no pertenece a esta subserie')
      await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
      return
    }
    subseries.value = await catalogApi.fetchSubseriesById(subseriesId.value)
    typeRow.value = row
    allowedSupportSelected.value = parseAllowedSupport(row.allowed_support)
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      is_active: coerceBoolean(row.is_active),
    }
    initialIsActive.value = coerceBoolean(row.is_active)
    storedCode.value = row.code
    loadedConfidentiality.value = row.confidentiality ?? null
  } catch {
    toast.error('Tipo no encontrado')
    await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (restrictionsOnly.value) {
    if (!canManageRestrictions.value) {
      toast.error('No tiene permiso para añadir o cambiar restricciones de una TRD publicada.')
      return
    }
    saving.value = true
    try {
      await catalogApi.persistClassification(confidentialityFields.value, 'document_type', typeId.value)
      toast.success('Restricciones actualizadas')
      await catalogApi.navigateAfterCatalogSave(
        router,
        route,
        catalogApi.documentTypesListPath(seriesId.value, subseriesId.value),
      )
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      toast.error(err.data?.message ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
    } finally {
      saving.value = false
    }
    return
  }

  saving.value = true
  try {
    const code = catalogCodeSuffix(subseriesCodePrefix.value, form.value.code)
    const storedSuffix = catalogCodeSuffix(subseriesCodePrefix.value, storedCode.value)
    await $api(`/archival/catalog/document-types/${typeId.value}`, {
      method: 'PUT',
      body: {
        ...(code !== storedSuffix ? { code } : {}),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        allowed_support: serializeAllowedSupport(allowedSupportSelected.value),
        is_active: form.value.is_active,
      },
    })
    if (typeRow.value?.in_published_trd !== true || canManageRestrictions.value) {
      await catalogApi.persistClassification(confidentialityFields.value, 'document_type', typeId.value)
    }
    toast.success('Tipo documental actualizado')
    await catalogApi.navigateAfterCatalogSave(
      router,
      route,
      catalogApi.documentTypesListPath(seriesId.value, subseriesId.value),
    )
  } catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
    if (first && initialIsActive.value) {
      form.value.is_active = true
    }
  } finally {
    saving.value = false
  }
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
          Volver a tipos documentales
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ restrictionsOnly ? 'Restricciones del tipo documental' : 'Editar tipo documental' }}
        </h2>
        <p v-if="subseries" class="text-sm text-muted-foreground">
          Subserie <span class="font-mono">{{ subseries.code }}</span> — {{ subseries.name }}
        </p>
      </div>
      <Card v-if="!loading">
        <CardHeader>
          <CardTitle>{{ restrictionsOnly ? 'Confidencialidad' : 'Datos del tipo documental' }}</CardTitle>
          <CardDescription>
            <template v-if="restrictionsOnly">
              La TRD ya está publicada: no se edita el texto del catálogo. Solo se añaden o cambian restricciones.
            </template>
            <template v-else>
              Código, nombre y soportes permitidos de este tipo.
            </template>
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div v-if="!restrictionsOnly" class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label>Código *</Label>
            <CatalogPrefixedCodeInput
              v-model="form.code"
              :prefix="subseriesCodePrefix"
              maxlength="64"
              placeholder="Sufijo de tipo"
            />
            <p class="text-xs text-muted-foreground leading-relaxed">
              Prefijo: código de la subserie. Solo digite el sufijo (ej. <span class="font-mono">01</span>).
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="support">Soporte permitido</Label>
            <ArchivalDocumentAllowedSupportField
              id="support"
              v-model="allowedSupportSelected"
            />
            <p class="text-xs text-muted-foreground">
              Puede seleccionar Papel, Digital o ambos.
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2 lg:col-span-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activo' : 'Inactivo' }}</Label>
          </div>
          <p v-if="!form.is_active" class="text-xs text-muted-foreground leading-relaxed lg:col-span-2">
            Al inactivar, el tipo se conserva en el catálogo pero no podrá usarse en nuevas operaciones.
            Si está en TRD o tiene reglas de retención, el sistema rechazará la inactivación.
          </p>
          </div>
          <CatalogConfidentialityFields
            ref="confidentialityFields"
            subject-type="document_type"
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
  </SettingsLayout>
</template>
