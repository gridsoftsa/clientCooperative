<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { VentanillaFunctionalTypeRow, VentanillaReceptionMediumRow } from '~/types/ventanilla'
import { messageFromFetchError } from '~/utils/http-error-message'

type CatalogSection = 'functional-types' | 'reception-media'

const props = withDefaults(
  defineProps<{
    pageTitle?: string
    pageDescription?: string
    breadcrumbLabel?: string
    sisterLink?: { to: string, label: string } | null
    backTo?: string
  }>(),
  {
    pageTitle: 'Ventanilla única',
    pageDescription: 'Opciones que aparecen al crear un radicado: el tipo de trámite y cómo llegó el documento.',
    breadcrumbLabel: 'Ventanilla única',
    sisterLink: () => ({ to: '/parametrizacion/estructura', label: 'Estructura' }),
    backTo: '/ventanilla/nueva',
  },
)

const router = useRouter()
const route = useRoute()
const ventanillaApi = useVentanillaApi()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const canEditFunctionalTypes = computed(() =>
  hasPermission('ventanilla_configurar')
  || hasPermission('plantillas_ver')
  || hasPermission('workflow_tipos_funcionales_parametrizar'),
)

const canEditReception = computed(() =>
  hasPermission('ventanilla_configurar') || hasPermission('plantillas_ver'),
)

const visibleCatalogSections = computed(() =>
  catalogSections.filter((section) =>
    section.value === 'functional-types' ? canEditFunctionalTypes.value : canEditReception.value,
  ),
)

const effectiveBackTo = computed(() => {
  const returnTo = route.query.return_to
  if (typeof returnTo === 'string' && returnTo.startsWith('/')) {
    return returnTo
  }

  return props.backTo
})

const canEdit = computed(() =>
  selectedSection.value === 'functional-types' ? canEditFunctionalTypes.value : canEditReception.value,
)

const loading = ref(true)
const saving = ref(false)
const selectedSection = ref<CatalogSection>('functional-types')

const functionalTypes = ref<VentanillaFunctionalTypeRow[]>([])
const receptionMedia = ref<VentanillaReceptionMediumRow[]>([])
const archivalFileTypes = ref<Array<{ id: number, name: string, type_key: string }>>([])
const savedVersion = ref(0)

const catalogSections: Array<{ value: CatalogSection, label: string, icon: string }> = [
  { value: 'functional-types', label: 'Tipos funcionales', icon: 'i-lucide-tags' },
  { value: 'reception-media', label: 'Medios de recepción', icon: 'i-lucide-radio' },
]

async function loadCatalog() {
  loading.value = true
  try {
    const [data, fileTypes] = await Promise.all([
      ventanillaApi.fetchCatalogSettings(),
      archivalApi.fetchFileTypes(),
    ])
    functionalTypes.value = data.functional_types ?? []
    receptionMedia.value = data.reception_media ?? []
    archivalFileTypes.value = (fileTypes ?? []).map(type => ({
      id: type.id,
      name: type.name,
      type_key: type.type_key,
    }))
  } catch {
    toast.error('No se pudieron cargar los catálogos de ventanilla')
    functionalTypes.value = []
    receptionMedia.value = []
  } finally {
    loading.value = false
  }
}

function slaPayload(raw: string | number | null | undefined, requiresResponse: boolean): number | null {
  if (!requiresResponse) {
    return null
  }
  const text = String(raw ?? '').trim()
  if (text === '') {
    return null
  }
  const n = Number(text)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function saveFunctional(rows: Array<{
  typeKey: string
  originalKey?: string
  label: string
  requires_response_default: boolean
  sla_business_days: string | number
  sort_order: string | number
  is_active: boolean
  show_in_public_form: boolean
  archival_file_type_id: string
  _isNew?: boolean
  _removed?: boolean
}>) {
  if (!Array.isArray(rows)) {
    toast.error('No se pudieron guardar los tipos funcionales.')
    return
  }

  saving.value = true
  try {
    let savedCount = 0

    for (const row of rows) {
      const typeKey = String(row.originalKey ?? row.typeKey ?? '').trim()
      const payload = {
        key: String(row._isNew ? row.typeKey : typeKey).trim(),
        label: String(row.label ?? '').trim(),
        requires_response_default: row.requires_response_default === true,
        sla_business_days: slaPayload(row.sla_business_days, row.requires_response_default),
        is_active: row._removed ? false : row.is_active !== false,
        show_in_public_form: row.show_in_public_form !== false,
        sort_order: Number(row.sort_order) || 0,
        archival_file_type_id: row.archival_file_type_id === 'none' || row.archival_file_type_id === ''
          ? null
          : Number(row.archival_file_type_id),
      }

      if (row._isNew && !row._removed) {
        if (!payload.key) {
          throw new Error('No se pudo generar la clave técnica. Revise la etiqueta del tipo funcional.')
        }
        await ventanillaApi.createFunctionalType(payload)
        savedCount += 1
      } else if (!row._isNew) {
        if (!typeKey) {
          throw new Error('Falta la clave técnica de un tipo funcional existente.')
        }
        await ventanillaApi.updateFunctionalType(typeKey, payload)
        savedCount += 1
      }
    }

    if (savedCount === 0) {
      toast.error('No hay cambios para guardar.')
      return
    }

    toast.success('Tipos funcionales guardados correctamente')
    savedVersion.value += 1
    await loadCatalog()
  } catch (e: unknown) {
    toast.error(messageFromFetchError(e, 'No se pudieron guardar los tipos funcionales'))
  } finally {
    saving.value = false
  }
}

async function saveReception(rows: Array<{
  value: string
  label: string
  sort_order: string
  is_active: boolean
  _isNew?: boolean
  _removed?: boolean
}>) {
  saving.value = true
  try {
    for (const row of rows) {
      const payload = {
        value: row.value.trim(),
        label: row.label.trim(),
        is_active: row._removed ? false : row.is_active,
        sort_order: Number(row.sort_order) || 0,
      }

      if (row._isNew && !row._removed) {
        await ventanillaApi.createReceptionMedium(payload)
      } else if (!row._isNew) {
        await ventanillaApi.updateReceptionMedium(row.value.trim(), payload)
      }
    }
    toast.success('Medios de recepción guardados correctamente')
    savedVersion.value += 1
    await loadCatalog()
  } catch (e: unknown) {
    toast.error(messageFromFetchError(e, 'No se pudieron guardar los medios de recepción'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (visibleCatalogSections.value.length > 0) {
    selectedSection.value = visibleCatalogSections.value[0]!.value
  }
  loadCatalog()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <NuxtLink to="/parametrizacion" class="hover:text-foreground">
            Parametrización
          </NuxtLink>
          <Icon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 opacity-60" />
          <span class="text-foreground">{{ breadcrumbLabel }}</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ pageTitle }}
        </h2>
        <p class="max-w-2xl text-muted-foreground text-sm">
          {{ pageDescription }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" as-child>
          <NuxtLink to="/parametrizacion/plantilla-score">
            <Icon name="i-lucide-file-spreadsheet" class="mr-2 h-4 w-4" />
            Plantilla Score
          </NuxtLink>
        </Button>
        <Button
          v-if="sisterLink"
          variant="outline"
          size="sm"
          as-child
        >
          <NuxtLink :to="sisterLink.to">
            <Icon name="i-lucide-layers" class="mr-2 h-4 w-4" />
            {{ sisterLink.label }}
          </NuxtLink>
        </Button>
        <Button variant="outline" @click="router.push(effectiveBackTo)">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>

    <Tabs v-model="selectedSection" class="w-full gap-4">
      <TabsList v-if="visibleCatalogSections.length > 1" class="h-auto w-full justify-start sm:w-fit">
        <TabsTrigger
          v-for="section in visibleCatalogSections"
          :key="section.value"
          :value="section.value"
          class="gap-2 px-3 py-2"
        >
          <Icon :name="section.icon" class="size-4" />
          {{ section.label }}
          <span class="text-muted-foreground text-xs tabular-nums">
            {{ section.value === 'functional-types' ? functionalTypes.length : receptionMedia.length }}
          </span>
        </TabsTrigger>
      </TabsList>

      <div v-if="loading" class="flex justify-center py-16">
        <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
      </div>

      <TabsContent
        v-else
        :value="selectedSection"
        class="mt-0"
      >
        <ParametrizacionVentanillaCatalogConfigEditor
          :key="selectedSection"
          :kind="selectedSection"
          :functional-types="functionalTypes"
          :reception-media="receptionMedia"
          :archival-file-types="archivalFileTypes"
          :can-edit="canEdit"
          :saving="saving"
          :saved-version="savedVersion"
          @save-functional="saveFunctional"
          @save-reception="saveReception"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
