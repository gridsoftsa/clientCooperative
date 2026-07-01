<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFile } from '~/types/archival-file'
import { validateArchivalMetadataFields } from '~/utils/archival-file-upload'

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
  && !props.file.is_frozen
  && props.file.status !== 'closed',
)

const metadataFields = computed<ArchivalMetadataFieldRow[]>(() => {
  const fields = props.file.metadata_schema?.active_fields ?? []

  return fields.map((field, index) => ({
    code: field.code,
    name: field.name,
    data_type: field.data_type,
    is_required: field.is_required,
    sort_order: index,
    is_active: true,
    is_reusable: field.is_reusable,
    is_variable: field.is_variable,
    is_ocr_extractable: false,
    is_autocompletable: field.is_autocompletable,
    is_searchable: false,
    is_reportable: false,
    options: field.options ?? null,
  }))
})

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
