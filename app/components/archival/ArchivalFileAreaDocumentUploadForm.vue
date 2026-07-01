<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  orgUnitId: number
  archivalFileId: number
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const uploading = ref(false)
const fileInput = ref<File | null>(null)
const docTypeId = ref('')
const title = ref('')

const canUpload = computed(() =>
  hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'),
)

async function handleUpload() {
  if (!fileInput.value || !docTypeId.value) {
    toast.error('Seleccione archivo y tipo documental.')
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('archival_file_id', String(props.archivalFileId))
    formData.append('org_unit_id', String(props.orgUnitId))
    formData.append('doc_document_type_id', docTypeId.value)
    formData.append('file', fileInput.value)
    if (title.value.trim())
      formData.append('title', title.value.trim())

    const res = await archivalApi.uploadAreaDocument(formData)
    toast.success(res.message)
    fileInput.value = null
    title.value = ''
    emit('uploaded')
  }
  catch {
    toast.error('No se pudo cargar el documento en el área.')
  }
  finally {
    uploading.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  fileInput.value = input.files?.[0] ?? null
}
</script>

<template>
  <div v-if="canUpload" class="space-y-3 rounded-lg border p-4">
    <p class="text-sm font-medium">
      Cargar documento al expediente #{{ archivalFileId }}
    </p>

    <div class="space-y-2">
      <Label for="area-doc-type">Tipo documental (ID)</Label>
      <Input
        id="area-doc-type"
        v-model="docTypeId"
        type="number"
        min="1"
        placeholder="ID del tipo documental TRD"
      />
    </div>

    <div class="space-y-2">
      <Label for="area-doc-title">Título (opcional)</Label>
      <Input id="area-doc-title" v-model="title" />
    </div>

    <div class="space-y-2">
      <Label for="area-doc-file">Archivo</Label>
      <Input id="area-doc-file" type="file" @change="onFileChange" />
    </div>

    <Button :disabled="uploading" @click="handleUpload">
      {{ uploading ? 'Cargando…' : 'Cargar en área' }}
    </Button>
  </div>
</template>
