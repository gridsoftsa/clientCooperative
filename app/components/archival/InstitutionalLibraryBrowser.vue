<script setup lang="ts">
import type { InstitutionalLibraryCategory, InstitutionalLibraryDocument } from '~/types/institutional-library'
import { institutionalLibraryCategoryIcon } from '~/utils/institutional-library-category'

export type InstitutionalLibraryView = 'all' | 'category' | 'featured' | 'recent' | 'popular'

const FILTER_ALL_ORG_UNITS = 'all'

const props = defineProps<{
  loading?: boolean
  categories: InstitutionalLibraryCategory[]
  documents: InstitutionalLibraryDocument[]
  featured: InstitutionalLibraryDocument | null
  recent: InstitutionalLibraryDocument[]
  mostViewed: InstitutionalLibraryDocument[]
  orgUnits: Array<{ id: number, name: string }>
  orgUnitId: string
  search: string
  selectedCategory: string
  pagination: { current_page: number, last_page: number, total: number }
  canDownload?: boolean
}>()

const emit = defineEmits<{
  'update:orgUnitId': [value: string]
  'update:search': [value: string]
  'update:selectedCategory': [value: string]
  'update:page': [value: number]
  refresh: []
  'view-document': [document: InstitutionalLibraryDocument]
}>()

const activeView = ref<InstitutionalLibraryView>('all')

const archivalApi = useArchivalFileApi()

const selectedCategoryMeta = computed(() =>
  props.categories.find(category => category.value === props.selectedCategory) ?? null,
)

const selectedOrgUnit = computed(() => {
  if (props.orgUnitId === FILTER_ALL_ORG_UNITS || props.orgUnitId === '') {
    return null
  }

  return props.orgUnits.find(unit => String(unit.id) === props.orgUnitId) ?? null
})

const breadcrumbLabel = computed(() => {
  switch (activeView.value) {
    case 'featured':
      return 'Destacado'
    case 'recent':
      return 'Actualizados'
    case 'popular':
      return 'Más consultados'
    case 'category':
      return selectedCategoryMeta.value?.label ?? 'Categoría'
    default:
      return 'Todos los documentos'
  }
})

const visibleDocuments = computed(() => {
  switch (activeView.value) {
    case 'featured':
      return props.featured ? [props.featured] : []
    case 'recent':
      return props.recent
    case 'popular':
      return props.mostViewed
    default:
      return props.documents
  }
})

const showPagination = computed(() => activeView.value === 'all' || activeView.value === 'category')

const totalDocuments = computed(() => {
  if (showPagination.value) {
    return props.pagination.total
  }

  return visibleDocuments.value.length
})

function isNavActive(view: InstitutionalLibraryView, categoryValue?: string): boolean {
  if (view === 'category') {
    return activeView.value === 'category' && props.selectedCategory === categoryValue
  }

  return activeView.value === view
}

function selectView(view: InstitutionalLibraryView, categoryValue = '') {
  activeView.value = view

  if (view === 'category') {
    emit('update:selectedCategory', categoryValue)
    emit('update:page', 1)
    emit('refresh')
    return
  }

  if (view === 'all') {
    emit('update:selectedCategory', '')
    emit('update:page', 1)
    emit('refresh')
  }
}

function onOrgUnitChange(value: unknown) {
  emit('update:orgUnitId', String(value ?? FILTER_ALL_ORG_UNITS))
  emit('update:page', 1)
  emit('refresh')
}

function applySearch() {
  if (activeView.value !== 'all' && activeView.value !== 'category') {
    activeView.value = 'all'
    emit('update:selectedCategory', '')
  }

  emit('update:page', 1)
  emit('refresh')
}

function downloadUrl(document: InstitutionalLibraryDocument) {
  if (!props.canDownload) {
    return null
  }

  return archivalApi.documentDownloadUrl(document.archival_file_id, document.id)
}

function formatDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString('es-CO')
}

function categoryCount(category: InstitutionalLibraryCategory) {
  return category.count ?? 0
}

function clearFilters() {
  activeView.value = 'all'
  emit('update:selectedCategory', '')
  emit('update:search', '')
  emit('update:orgUnitId', FILTER_ALL_ORG_UNITS)
  emit('update:page', 1)
  emit('refresh')
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card">
    <div v-if="loading && visibleDocuments.length === 0 && !featured" class="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground">
      Cargando biblioteca...
    </div>

    <ResizablePanelGroup
      v-else
      id="institutional-library-browser"
      direction="horizontal"
      class="min-h-[32rem]"
    >
      <ResizablePanel
        id="institutional-library-nav"
        :default-size="26"
        :min-size="20"
        :max-size="36"
        class="border-r bg-muted/20"
      >
        <div class="flex h-full flex-col">
          <div class="border-b px-3 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Biblioteca
            </p>
            <p class="mt-1 text-sm font-medium">
              Documentación oficial
            </p>
          </div>

          <div class="flex-1 space-y-4 overflow-y-auto p-2">
            <section class="space-y-1">
              <p class="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Navegación
              </p>

              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                :class="isNavActive('all') ? 'bg-primary/10 font-medium text-primary' : ''"
                @click="selectView('all')"
              >
                <Icon name="i-lucide-library" class="size-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate">Todos los documentos</span>
                <span class="text-xs text-muted-foreground">{{ pagination.total }}</span>
              </button>

              <button
                v-if="featured"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                :class="isNavActive('featured') ? 'bg-primary/10 font-medium text-primary' : ''"
                @click="activeView = 'featured'"
              >
                <Icon name="i-lucide-star" class="size-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate">Destacado</span>
              </button>

              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                :class="isNavActive('recent') ? 'bg-primary/10 font-medium text-primary' : ''"
                @click="activeView = 'recent'"
              >
                <Icon name="i-lucide-clock" class="size-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate">Actualizados</span>
                <span class="text-xs text-muted-foreground">{{ recent.length }}</span>
              </button>

              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                :class="isNavActive('popular') ? 'bg-primary/10 font-medium text-primary' : ''"
                @click="activeView = 'popular'"
              >
                <Icon name="i-lucide-trending-up" class="size-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate">Más consultados</span>
                <span class="text-xs text-muted-foreground">{{ mostViewed.length }}</span>
              </button>
            </section>

            <section class="space-y-1">
              <p class="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categorías
              </p>

              <p
                v-if="categories.length === 0"
                class="px-2 py-2 text-xs text-muted-foreground"
              >
                No hay categorías configuradas.
              </p>

              <button
                v-for="category in categories"
                :key="category.value"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                :class="isNavActive('category', category.value) ? 'bg-primary/10 font-medium text-primary' : ''"
                @click="selectView('category', category.value)"
              >
                <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-background">
                  <Icon :name="institutionalLibraryCategoryIcon(category.icon)" class="size-4" />
                </div>
                <span class="min-w-0 flex-1 truncate">{{ category.label }}</span>
                <span class="text-xs text-muted-foreground">{{ categoryCount(category) }}</span>
              </button>
            </section>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle with-handle />

      <ResizablePanel id="institutional-library-content" :default-size="74" :min-size="50">
        <div class="flex h-full min-h-[32rem] flex-col">
          <div class="space-y-3 border-b px-4 py-3">
            <div class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <span>Biblioteca</span>
              <Icon name="i-lucide-chevron-right" class="size-3.5 shrink-0" />
              <span class="font-medium text-foreground">{{ breadcrumbLabel }}</span>
              <template v-if="selectedOrgUnit">
                <Icon name="i-lucide-chevron-right" class="size-3.5 shrink-0" />
                <span class="font-medium text-foreground">{{ selectedOrgUnit.name }}</span>
              </template>
            </div>

            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">
                  {{ breadcrumbLabel }}
                </h2>
                <p class="text-sm text-muted-foreground">
                  {{ totalDocuments }} documento{{ totalDocuments === 1 ? '' : 's' }}
                  <span v-if="activeView === 'category' && selectedCategoryMeta">
                    en {{ selectedCategoryMeta.label }}
                  </span>
                </p>
              </div>

              <div class="flex w-full flex-wrap items-end gap-2 sm:w-auto">
                <div class="w-full space-y-1 sm:w-56">
                  <Label class="text-xs text-muted-foreground">Área productora</Label>
                  <Select :model-value="orgUnitId || FILTER_ALL_ORG_UNITS" @update:model-value="onOrgUnitChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las áreas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="FILTER_ALL_ORG_UNITS">
                        Todas las áreas
                      </SelectItem>
                      <SelectItem
                        v-for="unit in orgUnits"
                        :key="unit.id"
                        :value="String(unit.id)"
                      >
                        {{ unit.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="relative w-full sm:w-72">
                  <Icon name="i-lucide-search" class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    :model-value="search"
                    class="pl-8"
                    placeholder="Buscar título, procedimiento, formato..."
                    @update:model-value="emit('update:search', String($event ?? ''))"
                    @keyup.enter="applySearch"
                  />
                </div>

                <Button variant="secondary" :disabled="loading" @click="applySearch">
                  Buscar
                </Button>
                <Button variant="outline" size="icon" :disabled="loading" @click="emit('refresh')">
                  <Icon name="i-lucide-refresh-cw" class="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div
              v-if="loading"
              class="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground"
            >
              Cargando documentos...
            </div>

            <div
              v-else-if="visibleDocuments.length === 0"
              class="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground"
            >
              <Icon name="i-lucide-file-search" class="size-8 opacity-50" />
              <p>No hay documentos publicados con los filtros seleccionados.</p>
              <Button
                v-if="selectedCategory || (orgUnitId && orgUnitId !== FILTER_ALL_ORG_UNITS) || search"
                variant="ghost"
                size="sm"
                @click="clearFilters"
              >
                Limpiar filtros
              </Button>
            </div>

            <div v-else class="space-y-4">
              <Card
                v-if="activeView === 'featured' && featured"
                class="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background"
              >
                <CardContent class="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div class="space-y-2">
                    <Badge variant="secondary">
                      Documento destacado
                    </Badge>
                    <div>
                      <h3 class="text-xl font-semibold">
                        {{ featured.title }}
                      </h3>
                      <p class="mt-1 text-sm text-muted-foreground">
                        Versión {{ featured.version_number }}
                        <span v-if="featured.effective_from"> · Vigente desde {{ formatDate(featured.effective_from) }}</span>
                      </p>
                    </div>
                    <p v-if="featured.org_unit" class="text-sm text-muted-foreground">
                      {{ featured.org_unit.name }}
                    </p>
                  </div>
                  <Button type="button" @click="emit('view-document', featured)">
                    Ver detalle
                  </Button>
                </CardContent>
              </Card>

              <div v-if="activeView !== 'featured'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="document in visibleDocuments"
                  :key="document.id"
                  class="group rounded-xl border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
                >
                  <div class="flex items-start gap-3">
                    <div class="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon
                        :name="institutionalLibraryCategoryIcon(document.institutional_category_icon)"
                        class="size-5"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="line-clamp-2 font-medium leading-snug">
                        {{ document.title }}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        Versión {{ document.version_number }}
                        <span v-if="document.effective_from"> · {{ formatDate(document.effective_from) }}</span>
                      </p>
                      <div class="mt-2 flex flex-wrap gap-1">
                        <Badge v-if="document.institutional_category_label" variant="outline" class="text-xs">
                          {{ document.institutional_category_label }}
                        </Badge>
                        <Badge v-if="document.is_effective !== false" variant="secondary" class="bg-emerald-50 text-xs text-emerald-700">
                          Vigente
                        </Badge>
                        <Badge v-if="document.org_unit" variant="outline" class="text-xs">
                          {{ document.org_unit.name }}
                        </Badge>
                        <Badge v-if="activeView === 'popular' && document.view_count" variant="outline" class="text-xs">
                          {{ document.view_count }} consultas
                        </Badge>
                      </div>
                    </div>
                    <Icon
                      name="i-lucide-chevron-right"
                      class="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" type="button" @click="emit('view-document', document)">
                      <Icon name="i-lucide-eye" class="mr-1 size-4" />
                      Ver detalle
                    </Button>
                    <a
                      v-if="downloadUrl(document)"
                      :href="downloadUrl(document)!"
                      class="inline-flex"
                      @click.stop
                    >
                      <Button variant="ghost" size="sm" type="button">
                        <Icon name="i-lucide-download" class="mr-1 size-4" />
                        Descargar
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="showPagination && pagination.last_page > 1"
            class="flex items-center justify-center gap-2 border-t px-4 py-3"
          >
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1 || loading"
              @click="emit('update:page', pagination.current_page - 1); emit('refresh')"
            >
              Anterior
            </Button>
            <span class="text-sm text-muted-foreground">
              Página {{ pagination.current_page }} de {{ pagination.last_page }}
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page || loading"
              @click="emit('update:page', pagination.current_page + 1); emit('refresh')"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
