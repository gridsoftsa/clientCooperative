<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InstitutionalLibraryCategoryRow } from '~/types/institutional-library'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver|expedientes_biblioteca_ver',
})

const libraryApi = useInstitutionalLibraryApi()
const { hasPermission } = usePermissions()

const canEdit = computed(() =>
  hasPermission('plantillas_editar') || hasPermission('expedientes_biblioteca_publicar'),
)

const loading = ref(true)
const saving = ref(false)
const categories = ref<InstitutionalLibraryCategoryRow[]>([])
const savedVersion = ref(0)

async function loadCategories() {
  loading.value = true
  try {
    categories.value = await libraryApi.fetchCategorySettings()
  }
  catch {
    toast.error('No se pudieron cargar las categorías de la biblioteca.')
    categories.value = []
  }
  finally {
    loading.value = false
  }
}

type CategoryDraft = InstitutionalLibraryCategoryRow & {
  originalKey?: string
  _isNew?: boolean
  _removed?: boolean
}

async function saveCategories(rows: CategoryDraft[]) {
  saving.value = true
  try {
    const removed = rows.filter(row => row._removed && row.originalKey)
    const activeRows = rows.filter(row => !row._removed)

    for (const row of removed) {
      if (!row.originalKey) {
        continue
      }
      await libraryApi.updateCategory(row.originalKey, { is_active: false })
    }

    for (const row of activeRows) {
      const payload = {
        label: row.label.trim(),
        icon: row.icon.trim() || 'file-text',
        doc_type_code: row.doc_type_code?.trim() || null,
        sort_order: Number(row.sort_order) || 0,
        is_active: row.is_active,
      }

      if (row._isNew) {
        await libraryApi.createCategory({
          key: row.key.trim(),
          ...payload,
        })
      }
      else if (row.originalKey) {
        await libraryApi.updateCategory(row.originalKey, payload)
      }
    }

    toast.success('Categorías de biblioteca actualizadas.')
    savedVersion.value += 1
    await loadCategories()
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudieron guardar las categorías.'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadCategories()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">
          Biblioteca institucional
        </h1>
        <p class="max-w-3xl text-sm text-muted-foreground leading-relaxed">
          Administre las categorías con las que se organizan los documentos publicados en la biblioteca y al publicar desde expedientes.
        </p>
      </div>
      <Button variant="outline" as-child>
        <NuxtLink to="/biblioteca">
          <Icon name="i-lucide-library" class="mr-2 size-4" />
          Ver biblioteca
        </NuxtLink>
      </Button>
    </div>

    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      Cargando categorías...
    </div>

    <ParametrizacionBibliotecaInstitutionalCategoryEditor
      v-else
      :categories="categories"
      :can-edit="canEdit"
      :saving="saving"
      :saved-version="savedVersion"
      @save="saveCategories"
    />
  </div>
</template>
