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
    pageDescription: 'Catálogos del formulario de radicación: tipo funcional y medio de recepción. Los valores activos se muestran en Nuevo radicado.',
    breadcrumbLabel: 'Ventanilla única',
    sisterLink: () => ({ to: '/parametrizacion/estructura', label: 'Estructura' }),
    backTo: '/ventanilla/nueva',
  },
)

const router = useRouter()
const route = useRoute()
const ventanillaApi = useVentanillaApi()
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
const savedVersion = ref(0)

const catalogSections: Array<{ value: CatalogSection, label: string, icon: string }> = [
  { value: 'functional-types', label: 'Tipos funcionales', icon: 'i-lucide-tags' },
  { value: 'reception-media', label: 'Medios de recepción', icon: 'i-lucide-radio' },
]

const selectedCatalogLabel = computed(() =>
  visibleCatalogSections.value.find(s => s.value === selectedSection.value)?.label ?? '',
)

async function loadCatalog() {
  loading.value = true
  try {
    const data = await ventanillaApi.fetchCatalogSettings()
    functionalTypes.value = data.functional_types ?? []
    receptionMedia.value = data.reception_media ?? []
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
        sort_order: Number(row.sort_order) || 0,
      }

      if (row._isNew && !row._removed) {
        if (!payload.key) {
          throw new Error('Falta la clave técnica de un tipo funcional nuevo.')
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
  <div class="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 md:px-6">
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

    <div class="space-y-6">
      <Tabs default-value="catalogos" class="w-full">
        <TabsContent value="catalogos" class="mt-0">
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
          </div>

          <div v-else class="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <nav class="shrink-0 lg:w-64 xl:w-72 lg:sticky lg:top-4 lg:self-start">
              <div class="rounded-lg border bg-muted/30 p-2">
                <p class="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  Seleccionar plantilla
                </p>
                <div class="max-h-[280px] space-y-0.5 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
                  <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ventanilla única
                  </p>
                  <button
                    v-for="section in visibleCatalogSections"
                    :key="section.value"
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                    :class="selectedSection === section.value ? 'bg-accent font-medium' : ''"
                    @click="selectedSection = section.value"
                  >
                    <Icon
                      :name="section.icon"
                      class="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <span class="truncate">{{ section.label }}</span>
                  </button>
                </div>
              </div>
            </nav>

            <div class="min-w-0 flex-1">
              <div class="rounded-lg border">
                <div class="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <h3 class="font-semibold">
                    {{ selectedCatalogLabel }}
                  </h3>
                </div>
                <div class="p-4">
                  <ParametrizacionVentanillaCatalogConfigEditor
                    :key="selectedSection"
                    :kind="selectedSection"
                    :functional-types="functionalTypes"
                    :reception-media="receptionMedia"
                    :can-edit="canEdit"
                    :saving="saving"
                    :saved-version="savedVersion"
                    @save-functional="saveFunctional"
                    @save-reception="saveReception"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
