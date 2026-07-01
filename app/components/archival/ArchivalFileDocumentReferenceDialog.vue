<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import { flattenFileFolderNodes } from '~/utils/archival-file-upload'

const props = defineProps<{
  open: boolean
  fileId: number
  tree: ArchivalFileTreeNode | null
  targetNode?: ArchivalFileTreeNode | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const archivalApi = useArchivalFileApi()

const saving = ref(false)
const referencedDocumentId = ref('')
const archivalFileNodeId = ref<number | null>(null)

const folderOptions = computed(() => flattenFileFolderNodes(props.tree))

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }

  referencedDocumentId.value = ''
  archivalFileNodeId.value = props.targetNode?.archival_file_node_id ?? null
})

async function handleSubmit() {
  const documentId = Number(referencedDocumentId.value)
  if (!Number.isFinite(documentId) || documentId <= 0) {
    toast.error('Indique el identificador del documento maestro a referenciar.')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.createDocumentReference(props.fileId, {
      referenced_document_id: documentId,
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
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Referenciar documento</DialogTitle>
        <DialogDescription>
          Vincule un documento maestro existente sin duplicar el archivo físico.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="referenced-document-id">ID del documento origen</Label>
          <Input
            id="referenced-document-id"
            v-model="referencedDocumentId"
            inputmode="numeric"
            placeholder="Ej. 125"
          />
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
        <Button type="button" :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Guardando…' : 'Crear referencia' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
