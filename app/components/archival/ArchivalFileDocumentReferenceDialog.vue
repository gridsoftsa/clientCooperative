<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
  ArchivalMasterDocumentSearchResult,
} from '~/types/archival-file'
import {
  flattenCatalogDocumentTypes,
  flattenFileFolderNodes,
  type ArchivalFileDocTypeOption,
} from '~/utils/archival-file-upload'

const props = defineProps<{
  open: boolean
  fileId: number
  tree: ArchivalFileTreeNode | null
  targetNode?: ArchivalFileTreeNode | null
  entityKey?: string | null
  entityLabel?: string | null
  orgUnitId?: number | null
  required?: ArchivalFileRequiredDocumentsEvaluation | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const archivalApi = useArchivalFileApi()
const trdApi = useTrdApi()

const saving = ref(false)
const searching = ref(false)
const loadingCatalog = ref(false)
const searchQuery = ref('')
const debouncedSearch = refDebounced(searchQuery, 300)
const sameEntityOnly = ref(true)
const docDocumentTypeId = ref<number | null>(null)
const docTypeOptions = ref<ArchivalFileDocTypeOption[]>([])
const results = ref<ArchivalMasterDocumentSearchResult[]>([])
const selectedMaster = ref<ArchivalMasterDocumentSearchResult | null>(null)
const archivalFileNodeId = ref<number | null>(null)

const folderOptions = computed(() => flattenFileFolderNodes(props.tree))

const hasEntityFilter = computed(() => Boolean(props.entityKey?.trim()))

const selectedDocTypeLabel = computed(() =>
  docTypeOptions.value.find(option => option.id === docDocumentTypeId.value)?.label ?? '',
)

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }

  searchQuery.value = ''
  results.value = []
  selectedMaster.value = null
  docDocumentTypeId.value = null
  sameEntityOnly.value = Boolean(props.entityKey?.trim())
  archivalFileNodeId.value = props.targetNode?.archival_file_node_id ?? null
  void loadCatalog()
})

watch(debouncedSearch, () => {
  if (props.open) {
    void loadResults()
  }
})

watch(sameEntityOnly, () => {
  if (props.open) {
    void loadResults()
  }
})

watch(docDocumentTypeId, () => {
  if (props.open) {
    void loadResults()
  }
})

function preselectDocumentType() {
  const fromNode = props.targetNode?.doc_document_type_id
  if (fromNode && docTypeOptions.value.some(option => option.id === fromNode)) {
    docDocumentTypeId.value = fromNode
    return
  }

  const firstMissing = props.required?.missing?.[0]?.doc_document_type_id
  if (firstMissing && docTypeOptions.value.some(option => option.id === firstMissing)) {
    docDocumentTypeId.value = firstMissing
  }
}

async function loadCatalog() {
  if (!props.orgUnitId) {
    docTypeOptions.value = []
    await loadResults()
    return
  }

  loadingCatalog.value = true

  try {
    const tree = await trdApi.fetchCatalogTree(props.orgUnitId, true)
    docTypeOptions.value = flattenCatalogDocumentTypes(tree)
    preselectDocumentType()
    await loadResults()
  }
  catch {
    docTypeOptions.value = []
    toast.error('No se pudo cargar el catálogo documental.')
    await loadResults()
  }
  finally {
    loadingCatalog.value = false
  }
}

async function loadResults() {
  searching.value = true

  try {
    const response = await archivalApi.searchMasterDocuments({
      search: debouncedSearch.value.trim() || undefined,
      entity_key: sameEntityOnly.value && props.entityKey ? props.entityKey : undefined,
      exclude_file_id: props.fileId,
      doc_document_type_id: docDocumentTypeId.value ?? undefined,
      per_page: 20,
    })
    results.value = response.data ?? []
    if (selectedMaster.value && !results.value.some(item => item.id === selectedMaster.value?.id)) {
      selectedMaster.value = null
    }
  }
  catch {
    results.value = []
    toast.error('No se pudieron buscar documentos maestros.')
  }
  finally {
    searching.value = false
  }
}

function selectMaster(item: ArchivalMasterDocumentSearchResult) {
  selectedMaster.value = item
}

function masterSummary(item: ArchivalMasterDocumentSearchResult): string {
  const parts = [
    item.document_type_name,
    item.file_type_name,
    item.file_number,
  ].filter(Boolean)

  return parts.join(' · ')
}

async function handleSubmit() {
  if (!selectedMaster.value) {
    toast.error('Seleccione un documento maestro de la lista.')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.createDocumentReference(props.fileId, {
      referenced_document_id: selectedMaster.value.id,
      archival_file_node_id: archivalFileNodeId.value,
    })
    toast.success(res.message)
    emit('update:open', false)
    emit('created')
  }
  catch {
    toast.error('No se pudo crear la referencia documental.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Referenciar documento maestro</DialogTitle>
        <DialogDescription>
          Busque un documento marcado como maestro en otro expediente. No se duplica el archivo físico.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 overflow-y-auto pr-1">
        <div class="space-y-2">
          <Label for="master-doc-type">Tipo documental</Label>
          <Select
            :model-value="docDocumentTypeId != null ? String(docDocumentTypeId) : 'all'"
            :disabled="loadingCatalog"
            @update:model-value="docDocumentTypeId = $event === 'all' ? null : Number($event)"
          >
            <SelectTrigger id="master-doc-type">
              <SelectValue :placeholder="loadingCatalog ? 'Cargando catálogo…' : 'Todos los tipos documentales'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos los tipos documentales
              </SelectItem>
              <SelectItem
                v-for="docType in docTypeOptions"
                :key="docType.id"
                :value="String(docType.id)"
              >
                {{ docType.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="docDocumentTypeId && selectedDocTypeLabel" class="text-xs text-muted-foreground">
            Filtrando por: {{ selectedDocTypeLabel }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="master-search">Buscar</Label>
          <Input
            id="master-search"
            v-model="searchQuery"
            placeholder="Ej. cédula, nombre, número de expediente…"
            autocomplete="off"
          />
          <p v-if="entityLabel" class="text-xs text-muted-foreground">
            Titular de este expediente: {{ entityLabel }}
            <span v-if="entityKey"> ({{ entityKey }})</span>
          </p>
        </div>

        <label
          v-if="hasEntityFilter"
          class="flex items-center gap-2 text-sm"
        >
          <Checkbox
            bare
            :checked="sameEntityOnly"
            @update:checked="sameEntityOnly = $event === true"
          />
          Solo documentos del mismo titular
        </label>

        <div class="rounded-md border">
          <div v-if="searching" class="p-4 text-sm text-muted-foreground">
            Buscando documentos maestros…
          </div>
          <div v-else-if="results.length === 0" class="p-4 text-sm text-muted-foreground">
            No se encontraron documentos maestros vigentes.
            <span v-if="docDocumentTypeId">
              Pruebe otro tipo documental o quite el filtro.
            </span>
            <span v-else-if="sameEntityOnly && hasEntityFilter">
              Pruebe desmarcar «Solo documentos del mismo titular».
            </span>
          </div>
          <ul v-else class="max-h-56 divide-y overflow-y-auto">
            <li
              v-for="item in results"
              :key="item.id"
            >
              <button
                type="button"
                class="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/60"
                :class="selectedMaster?.id === item.id ? 'bg-primary/10' : ''"
                @click="selectMaster(item)"
              >
                <span class="text-sm font-medium">{{ item.title }}</span>
                <span class="text-xs text-muted-foreground">{{ masterSummary(item) }}</span>
                <span v-if="item.entity_label" class="text-xs text-muted-foreground">
                  {{ item.entity_label }}
                  <span v-if="item.entity_key"> · {{ item.entity_key }}</span>
                  · v{{ item.version_number }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div
          v-if="selectedMaster"
          class="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
        >
          <p class="font-medium">Seleccionado</p>
          <p>{{ selectedMaster.title }}</p>
          <p class="text-xs text-muted-foreground">
            {{ masterSummary(selectedMaster) }} · v{{ selectedMaster.version_number }}
          </p>
        </div>

        <div v-if="folderOptions.length" class="space-y-2">
          <Label for="reference-folder">Carpeta destino (opcional)</Label>
          <Select
            :model-value="archivalFileNodeId != null ? String(archivalFileNodeId) : undefined"
            @update:model-value="archivalFileNodeId = $event ? Number($event) : null"
          >
            <SelectTrigger id="reference-folder">
              <SelectValue placeholder="Raíz del expediente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="folder in folderOptions"
                :key="folder.id"
                :value="String(folder.id)"
              >
                {{ folder.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button type="button" :disabled="saving || !selectedMaster" @click="handleSubmit">
          {{ saving ? 'Guardando…' : 'Crear referencia' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
