<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFile } from '~/types/archival-file'
import { mapArchivalFileMetadataFields } from '~/utils/archival-metadata-fields'
import { isArchivalFileOperational } from '~/utils/archival-file-status'
import {
  archivalMetadataFieldDomId,
  findFirstMissingRequiredMetadataField,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'

const props = defineProps<{
  file: ArchivalFile
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
  <div class="space-y-4">
    <p v-if="metadataFields.length === 0" class="text-sm text-muted-foreground">
      Este expediente no tiene esquema de metadatos configurado.
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
</template>
