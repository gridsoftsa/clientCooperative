<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'documentacion_ver',
  modules: ['creditos', 'gestion_documental'],
})

const archivalApi = useArchivalFileApi()
const loading = ref(false)
const tree = ref<ArchivalFileTreeNode | null>(null)
const search = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

async function loadExplorer(term?: string) {
  loading.value = true
  try {
    tree.value = await archivalApi.fetchCreditDocumentExplorer(term)
  }
  catch {
    toast.error('No se pudo cargar el explorador de documentos.')
    tree.value = null
  }
  finally {
    loading.value = false
  }
}

watch(search, (value) => {
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }
  searchDebounce = setTimeout(() => {
    searchDebounce = null
    void loadExplorer(value)
  }, 400)
})

onMounted(() => {
  void loadExplorer()
})

onUnmounted(() => {
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Explorador de documentos
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Carpetas por solicitante: documentos maestros del asociado y, por cada radicación, las mismas carpetas de gestión documental (auxiliares, FNG, asegurabilidad y demás). El listado por radicación sigue en
          <NuxtLink to="/documentacion" class="underline underline-offset-2">
            Documentación
          </NuxtLink>.
        </p>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[16rem] max-w-md flex-1 space-y-1.5">
            <Label for="credit-explorer-search">Buscar por nombre, radicado o documento</Label>
            <div class="relative">
              <Icon name="i-lucide-search" class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="credit-explorer-search"
                v-model="search"
                placeholder="Nombre, cédula, RAD-… o título del archivo"
                class="pl-8"
              />
            </div>
          </div>
          <Button
            variant="secondary"
            class="h-9"
            :disabled="loading"
            @click="loadExplorer(search)"
          >
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-0 sm:p-0">
        <ArchivalFileAreaRepositoryBrowser
          :tree="tree"
          :org-unit-id="0"
          :loading="loading"
          :allow-upload="false"
          nav-title="Solicitantes"
          empty-tree-message="No hay expedientes de crédito enlazados para su usuario."
        />
      </CardContent>
    </Card>
  </div>
</template>
