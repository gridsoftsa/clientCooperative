<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode } from '~/types/archival-file'

const props = defineProps<{
  open: boolean
  fileId: number
  documentNode: ArchivalFileTreeNode | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  replaced: []
}>()

const archivalApi = useArchivalFileApi()

const saving = ref(false)
const selectedFile = ref<File | null>(null)

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    selectedFile.value = null
  }
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function handleSubmit() {
  if (!props.documentNode?.archival_file_document_id) {
    toast.error('No se identificó el documento a versionar.')
    return
  }

  if (!selectedFile.value) {
    toast.error('Seleccione el archivo de la nueva versión.')
    return
  }

  saving.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await archivalApi.replaceDocumentVersion(
      props.fileId,
      props.documentNode.archival_file_document_id,
      formData,
    )
    toast.success(res.message)
    emit('update:open', false)
    emit('replaced')
  }
  catch {
    toast.error('No se pudo registrar la nueva versión.')
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
        <DialogTitle>Nueva versión</DialogTitle>
        <DialogDescription>
          Reemplace la versión vigente de
          <span class="font-medium">{{ documentNode?.name ?? 'documento' }}</span>.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <Label for="version-file">Archivo</Label>
        <Input
          id="version-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          @change="onFileChange"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button type="button" :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Subiendo…' : 'Registrar versión' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
