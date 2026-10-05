<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFile, ArchivalFileTreeNode } from '~/types/archival-file'
import { mapArchivalFileMetadataFields } from '~/utils/archival-metadata-fields'
import { isArchivalFileOperational } from '~/utils/archival-file-status'
import { flattenFileDocumentNodes } from '~/utils/archival-file-upload'
import { archivalMetadataDisplayEntries } from '~/utils/archival-metadata-display'
import {
  archivalMetadataFieldDomId,
  findFirstMissingRequiredMetadataField,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'

const props = defineProps<{
  file: ArchivalFile
  tree?: ArchivalFileTreeNode | null
}>()

const emit = defineEmits<{
  updated: []
}>()

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const saving = ref(false)
const submitAttempted = ref(false)
const highlightedMetadataFieldCode = ref<string | null>(null)
const metadataValues = ref<Record<string, unknown>>({})

const canEdit = computed(() =>
  hasPermission('expedientes_editar')
  && isArchivalFileOperational(props.file.status, props.file.is_frozen),
)

const metadataFields = computed<ArchivalMetadataFieldRow[]>(() =>
  mapArchivalFileMetadataFields(props.file.metadata_schema?.active_fields),
)
const documents = computed(() => flattenFileDocumentNodes(props.tree ?? null))
const fileTypeSettingsPath = computed(() =>
  props.file.file_type?.id ? `/expedientes/tipos/${props.file.file_type.id}` : '/expedientes/tipos',
)

function documentMetadataEntries(document: ArchivalFileTreeNode) {
  return archivalMetadataDisplayEntries(document.metadata_values)
}

function syncFromFile() {
  metadataValues.value = { ...(props.file.metadata_values ?? {}) }
}

async function handleSave() {
  submitAttempted.value = true
  highlightedMetadataFieldCode.value = null

  const missingMetadata = findFirstMissingRequiredMetadataField(metadataFields.value, metadataValues.value)
  if (missingMetadata) {
    highlightedMetadataFieldCode.value = missingMetadata.code
    toast.error(`Complete el metadato obligatorio: ${missingMetadata.name}`)
    await nextTick()
    const idx = metadataFields.value.findIndex(f => f.code === missingMetadata.code)
    focusArchivalFieldById(archivalMetadataFieldDomId(missingMetadata, idx >= 0 ? idx : 0))
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.updateMetadata(props.file.id, metadataValues.value)
    toast.success(res.message)
    emit('updated')
  }
  catch {
    toast.error('No se pudieron guardar los metadatos.')
  }
  finally {
    saving.value = false
  }
}

watch(() => props.file, () => syncFromFile(), { immediate: true, deep: true })
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <p class="text-sm font-medium">
        Metadatos del expediente
      </p>
      <p v-if="metadataFields.length === 0" class="text-sm text-muted-foreground">
        El tipo de expediente
        <span class="font-medium text-foreground">{{ file.file_type?.name ?? 'actual' }}</span>
        no tiene esquema de metadatos del expediente.
        Asígnalo en
        <NuxtLink :to="fileTypeSettingsPath" class="text-primary underline-offset-4 hover:underline">
          configuración del tipo
        </NuxtLink>
        (esquema de nivel expediente, no del tipo documental).
      </p>

      <template v-else>
        <ArchivalFileDocumentMetadataFields
          v-model="metadataValues"
          :fields="metadataFields"
          :disabled="!canEdit || saving"
          :highlighted-field-code="highlightedMetadataFieldCode"
        />

        <Button
          v-if="canEdit"
          type="button"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Guardando…' : 'Guardar metadatos' }}
        </Button>
      </template>
    </div>

    <div class="space-y-3 border-t pt-4">
      <p class="text-sm font-medium">
        Metadatos de documentos
      </p>
      <p class="text-muted-foreground text-xs">
        Los campos capturados al adjuntar (por ejemplo en workflow) quedan en cada documento, no en esta ficha del expediente.
      </p>
      <div v-if="documents.length" class="space-y-2">
        <div
          v-for="document in documents"
          :key="document.id"
          class="space-y-2 rounded-md border bg-muted/15 p-3"
        >
          <div>
            <p class="text-sm font-medium">
              {{ document.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ document.doc_document_type_name ?? 'Documento' }}
            </p>
          </div>
          <dl v-if="documentMetadataEntries(document).length" class="grid gap-1 text-xs">
            <div
              v-for="entry in documentMetadataEntries(document)"
              :key="entry.key"
              class="flex flex-wrap justify-between gap-2"
            >
              <dt class="text-muted-foreground">
                {{ entry.label }}
              </dt>
              <dd class="font-medium">
                {{ entry.value }}
              </dd>
            </div>
          </dl>
          <p v-else class="text-xs text-muted-foreground">
            Este documento no tiene metadatos guardados. El tipo documental debe tener un esquema activo y hay que completar los campos al adjuntar.
          </p>
        </div>
      </div>
      <p v-else class="text-xs text-muted-foreground">
        Aún no hay documentos en el expediente.
      </p>
    </div>
  </div>
</template>
