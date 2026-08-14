<script setup lang="ts">
import type {
  InstitutionalLibraryCategory,
  InstitutionalLibraryDocument,
  InstitutionalLibraryHome,
  InstitutionalLibrarySection,
} from '~/types/institutional-library'
import {
  institutionalLibraryCategoryAccent,
  institutionalLibraryCategoryIcon,
} from '~/utils/institutional-library-category'

const FILTER_ALL_ORG_UNITS = 'all'

const props = defineProps<{
  loading?: boolean
  home: InstitutionalLibraryHome | null
  listDocuments?: InstitutionalLibraryDocument[]
  listLoading?: boolean
  listPagination?: { current_page: number, last_page: number, total: number }
  viewMode?: 'portal' | 'list'
  search: string
  selectedOrgUnitId: string
  selectedCategory: string
  canDownload?: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:selectedOrgUnitId': [value: string]
  'update:selectedCategory': [value: string]
  search: []
  'view-document': [document: InstitutionalLibraryDocument]
  'open-category': [category: InstitutionalLibraryCategory]
  'open-section': [section: InstitutionalLibrarySection]
  'back-to-portal': []
  'list-page': [page: number]
}>()

const archivalApi = useArchivalFileApi()

const categories = computed(() => props.home?.categories ?? [])
const sections = computed(() => props.home?.sections ?? [])
const featured = computed(() => props.home?.featured ?? null)
const recent = computed(() => props.home?.recent ?? [])
const mostViewed = computed(() => props.home?.most_viewed ?? [])
const orgUnitsWithCounts = computed(() => props.home?.org_units ?? [])

const selectedCategoryMeta = computed(() =>
  categories.value.find(category => category.value === props.selectedCategory) ?? null,
)

const selectedOrgUnitName = computed(() => {
  if (props.selectedOrgUnitId === FILTER_ALL_ORG_UNITS) {
    return null
  }

  return orgUnitsWithCounts.value.find(unit => String(unit.id) === props.selectedOrgUnitId)?.name
    ?? null
})

function formatDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString('es-CO')
}

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days <= 0) {
    return 'Hoy'
  }

  if (days === 1) {
    return 'Ayer'
  }

  if (days < 7) {
    return `Hace ${days} días`
  }

  return formatDate(value)
}

function downloadUrl(document: InstitutionalLibraryDocument) {
  if (!props.canDownload) {
    return null
  }

  return archivalApi.documentDownloadUrl(document.archival_file_id, document.id)
}

function selectOrgUnit(value: string) {
  emit('update:selectedOrgUnitId', value)
  emit('search')
}

function selectCategory(category: InstitutionalLibraryCategory) {
  emit('update:selectedCategory', category.value)
  emit('open-category', category)
}

function openSection(section: InstitutionalLibrarySection) {
  emit('update:selectedCategory', section.category ?? '')
  if (section.org_unit?.id) {
    emit('update:selectedOrgUnitId', String(section.org_unit.id))
  }
  emit('open-section', section)
}

function clearCategoryFilter() {
  emit('update:selectedCategory', '')
  emit('back-to-portal')
}

function applySearch() {
  emit('search')
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          :model-value="search"
          class="h-11 pl-9"
          placeholder="Buscar documentos, procedimientos, formatos..."
          @update:model-value="emit('update:search', String($event ?? ''))"
          @keyup.enter="applySearch"
        />
      </div>
      <Button class="h-11 shrink-0" :disabled="loading || listLoading" @click="applySearch">
        Buscar
      </Button>
    </div>

    <div v-if="viewMode === 'list'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" class="-ml-2" @click="clearCategoryFilter">
            <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
            Volver al portal
          </Button>
          <h2 class="text-lg font-semibold tracking-tight">
            {{ selectedCategoryMeta?.label ?? 'Documentos' }}
            <span v-if="selectedOrgUnitName" class="text-muted-foreground"> — {{ selectedOrgUnitName }}</span>
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ listPagination?.total ?? 0 }} documento{{ (listPagination?.total ?? 0) === 1 ? '' : 's' }}
          </p>
        </div>
      </div>

      <div v-if="listLoading" class="py-16 text-center text-sm text-muted-foreground">
        Cargando documentos...
      </div>

      <div
        v-else-if="!listDocuments?.length"
        class="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground"
      >
        No hay documentos con los filtros seleccionados.
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ArchivalInstitutionalLibraryCard
          v-for="document in listDocuments"
          :key="document.id"
          :document="document"
          :can-download="canDownload"
          @view="emit('view-document', $event)"
        />
      </div>

      <div
        v-if="listPagination && listPagination.last_page > 1"
        class="flex items-center justify-center gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          :disabled="listPagination.current_page <= 1 || listLoading"
          @click="emit('list-page', listPagination.current_page - 1)"
        >
          Anterior
        </Button>
        <span class="text-sm text-muted-foreground">
          Página {{ listPagination.current_page }} de {{ listPagination.last_page }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="listPagination.current_page >= listPagination.last_page || listLoading"
          @click="emit('list-page', listPagination.current_page + 1)"
        >
          Siguiente
        </Button>
      </div>
    </div>

    <template v-else>
      <div v-if="loading && !home" class="py-20 text-center text-sm text-muted-foreground">
        Cargando biblioteca institucional...
      </div>

      <template v-else>
        <section
          v-if="featured"
          class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-sky-700 px-6 py-8 text-primary-foreground shadow-lg sm:px-8 sm:py-10"
        >
          <div class="relative z-10 max-w-2xl space-y-4">
            <Badge class="bg-white/20 text-white hover:bg-white/20">
              Destacado
            </Badge>
            <div class="space-y-2">
              <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                {{ featured.title }}
              </h2>
              <p class="text-sm text-primary-foreground/85">
                Versión {{ featured.version_number }}
                <span v-if="featured.effective_from"> · Vigente desde {{ formatDate(featured.effective_from) }}</span>
              </p>
              <p v-if="featured.org_unit" class="text-sm text-primary-foreground/75">
                {{ featured.org_unit.name }}
              </p>
            </div>
            <Button
              variant="secondary"
              class="bg-white text-primary hover:bg-white/90"
              @click="emit('view-document', featured)"
            >
              Ver documento
            </Button>
          </div>
          <div class="pointer-events-none absolute -right-6 -bottom-8 opacity-30 sm:right-4 sm:bottom-0 sm:opacity-40">
            <Icon name="i-lucide-shield-check" class="size-40 sm:size-52" />
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Categorías
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <button
              v-for="category in categories"
              :key="category.value"
              type="button"
              class="rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              :class="selectedCategory === category.value ? 'border-primary ring-2 ring-primary/20' : ''"
              @click="selectCategory(category)"
            >
              <div
                class="mb-3 flex size-10 items-center justify-center rounded-lg"
                :class="institutionalLibraryCategoryAccent(category.value).iconBox"
              >
                <Icon
                  :name="institutionalLibraryCategoryIcon(category.icon)"
                  class="size-5"
                  :class="institutionalLibraryCategoryAccent(category.value).icon"
                />
              </div>
              <p class="font-medium leading-tight">
                {{ category.label }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ category.count ?? 0 }} documento{{ (category.count ?? 0) === 1 ? '' : 's' }}
              </p>
            </button>
          </div>
        </section>

        <section class="space-y-3">
          <p class="text-sm font-medium text-muted-foreground">
            Filtrar por área
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              :variant="selectedOrgUnitId === FILTER_ALL_ORG_UNITS ? 'default' : 'outline'"
              class="rounded-full"
              @click="selectOrgUnit(FILTER_ALL_ORG_UNITS)"
            >
              Todas las áreas
            </Button>
            <Button
              v-for="unit in orgUnitsWithCounts"
              :key="unit.id"
              size="sm"
              :variant="selectedOrgUnitId === String(unit.id) ? 'default' : 'outline'"
              class="rounded-full"
              @click="selectOrgUnit(String(unit.id))"
            >
              {{ unit.name }}
              <span class="ml-1 text-xs opacity-80">({{ unit.count }})</span>
            </Button>
          </div>
        </section>

        <section v-if="sections.length" class="space-y-6">
          <div
            v-for="section in sections"
            :key="`${section.org_unit?.id ?? 'all'}-${section.category ?? 'none'}`"
            class="space-y-3"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-lg font-semibold tracking-tight">
                {{ section.title }}
              </h3>
              <Button
                v-if="section.total > section.documents.length"
                variant="link"
                class="h-auto px-0 text-sm"
                @click="openSection(section)"
              >
                Ver todos ({{ section.total }})
              </Button>
            </div>

            <div class="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <article
                v-for="document in section.documents"
                :key="document.id"
                class="flex w-[min(100%,18rem)] shrink-0 flex-col rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
              >
                <div class="flex items-start justify-between gap-2">
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    :class="institutionalLibraryCategoryAccent(section.category).iconBox"
                  >
                    <Icon
                      :name="institutionalLibraryCategoryIcon(section.category_icon)"
                      class="size-4"
                      :class="institutionalLibraryCategoryAccent(section.category).icon"
                    />
                  </div>
                  <Badge v-if="document.is_effective !== false" class="bg-emerald-50 text-emerald-700">
                    Vigente
                  </Badge>
                </div>
                <h4 class="mt-3 line-clamp-2 text-sm font-semibold leading-snug">
                  {{ document.title }}
                </h4>
                <p class="mt-1 text-xs text-muted-foreground">
                  Versión {{ document.version_number }}
                </p>
                <div class="mt-4 flex items-center gap-1 border-t pt-3">
                  <Button variant="ghost" size="icon" class="size-8" @click="emit('view-document', document)">
                    <Icon name="i-lucide-eye" class="size-4" />
                  </Button>
                  <a
                    v-if="downloadUrl(document)"
                    :href="downloadUrl(document)!"
                    class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon name="i-lucide-download" class="size-4" />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          v-else-if="!loading"
          class="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground"
        >
          No hay documentos publicados para el área o filtros seleccionados.
        </section>

        <div class="grid gap-8 lg:grid-cols-2">
          <section v-if="recent.length" class="space-y-3">
            <h3 class="text-lg font-semibold tracking-tight">
              Documentos actualizados
            </h3>
            <div class="space-y-2">
              <button
                v-for="document in recent"
                :key="`recent-${document.id}`"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
                @click="emit('view-document', document)"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium">
                    {{ document.title }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    v{{ document.version_number }}
                    <span v-if="document.published_at"> · {{ formatRelativeDate(document.published_at) }}</span>
                  </p>
                </div>
                <Badge variant="outline" class="shrink-0 text-xs">
                  {{ document.institutional_category_label }}
                </Badge>
              </button>
            </div>
          </section>

          <section v-if="mostViewed.length" class="space-y-3">
            <h3 class="text-lg font-semibold tracking-tight">
              Más consultados
            </h3>
            <div class="space-y-2">
              <button
                v-for="document in mostViewed"
                :key="`popular-${document.id}`"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
                @click="emit('view-document', document)"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium">
                    {{ document.title }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ document.view_count ?? 0 }} consultas
                  </p>
                </div>
                <Icon name="i-lucide-trending-up" class="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </section>
        </div>
      </template>
    </template>
  </div>
</template>
