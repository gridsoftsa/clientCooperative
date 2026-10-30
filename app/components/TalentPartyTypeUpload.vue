<script setup lang="ts">
import type { TalentPartyDocumentTypeFolder } from '~/types/talent-party'
import { toast } from 'vue-sonner'
import { appendFileToFormData } from '~/utils/safe-upload-file-name'

const props = defineProps<{
  partyId: number
  documentType: TalentPartyDocumentTypeFolder
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const talentApi = useTalentPartyApi()
const title = ref('')
const folioStart = ref('1')
const folioEnd = ref('1')
const file = ref<File | null>(null)
const fileInputKey = ref(0)
const saving = ref(false)
const inputId = `talent-file-${props.partyId}-${props.documentType.id}`

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
  if (!title.value.trim() && file.value) {
    title.value = file.value.name.replace(/\.[^.]+$/, '')
  }
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: string, errors?: Record<string, string[]> } })?.data
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined

  return first || data?.message || fallback
}

async function upload() {
  if (!file.value) {
    toast.error('Seleccione un archivo.')
    return
  }

  const start = Number(folioStart.value)
  const end = Number(folioEnd.value)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    toast.error('Indique un rango de folios válido.')
    return
  }

  saving.value = true
  try {
    const body = new FormData()
    appendFileToFormData(body, file.value, 'documento')
    body.append('doc_document_type_id', String(props.documentType.id))
    body.append('title', title.value.trim() || file.value.name)
    body.append('folio_start', String(start))
    body.append('folio_end', String(end))
    const response = await talentApi.uploadDocument(props.partyId, body)
    toast.success(response.message || 'Archivo cargado.')
    title.value = ''
    folioStart.value = '1'
    folioEnd.value = '1'
    file.value = null
    fileInputKey.value += 1
    emit('uploaded')
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo cargar el archivo.'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-3 rounded-lg border p-4">
    <div>
      <p class="text-sm font-medium">
        {{ documentType.code }} — {{ documentType.name }}
      </p>
      <p class="text-xs text-muted-foreground">
        Subcarpeta del tipo documental
      </p>
    </div>

    <ul v-if="documentType.documents.length" class="space-y-2">
      <li
        v-for="document in documentType.documents"
        :key="document.id"
        class="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
      >
        <span class="min-w-0 truncate">{{ document.title }}</span>
        <span class="shrink-0 text-xs text-muted-foreground">
          Folios {{ document.folio_start }}–{{ document.folio_end }}
        </span>
      </li>
    </ul>
    <p v-else class="text-sm text-muted-foreground">
      Sin archivos en esta subcarpeta.
    </p>

    <PermissionGate permission="talento_gestionar">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2 md:col-span-2">
          <Label :for="inputId">Archivo</Label>
          <Input
            :id="inputId"
            :key="fileInputKey"
            type="file"
            @change="onFileChange"
          />
        </div>
        <div class="space-y-2 md:col-span-2">
          <Label :for="`${inputId}-title`">Título</Label>
          <Input
            :id="`${inputId}-title`"
            v-model="title"
            placeholder="Nombre del documento"
          />
        </div>
        <div class="space-y-2">
          <Label :for="`${inputId}-folio-start`">Folio inicial</Label>
          <Input
            :id="`${inputId}-folio-start`"
            v-model="folioStart"
            type="number"
            min="1"
          />
        </div>
        <div class="space-y-2">
          <Label :for="`${inputId}-folio-end`">Folio final</Label>
          <Input
            :id="`${inputId}-folio-end`"
            v-model="folioEnd"
            type="number"
            min="1"
          />
        </div>
      </div>
      <Button
        type="button"
        class="mt-3"
        :disabled="saving"
        @click="upload"
      >
        <Icon
          v-if="saving"
          name="i-lucide-loader-2"
          class="mr-1.5 size-4 animate-spin"
        />
        Cargar archivo
      </Button>
    </PermissionGate>
  </div>
</template>
