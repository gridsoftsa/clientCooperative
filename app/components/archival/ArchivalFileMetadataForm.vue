<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFile } from '~/types/archival-file'
import { mapArchivalFileMetadataFields } from '~/utils/archival-metadata-fields'
import { validateArchivalMetadataFields } from '~/utils/archival-file-upload'
import { isArchivalFileOperational } from '~/utils/archival-file-status'

const props = defineProps<{
  file: ArchivalFile
}>()

const emit = defineEmits<{
  updated: []
}>()

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const saving = ref(false)
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
  const validationError = validateArchivalMetadataFields(metadataFields.value, metadataValues.value)
  if (validationError) {
    toast.error(validationError)
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
