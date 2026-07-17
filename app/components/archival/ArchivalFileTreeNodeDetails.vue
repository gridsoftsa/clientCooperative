<script setup lang="ts">
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import {
  archivalMetadataDisplayEntries,
  formatArchivalFileSize,
} from '~/utils/archival-metadata-display'

const props = defineProps<{
  node: ArchivalFileTreeNode
  metadataFields?: ArchivalMetadataFieldRow[]
  fileMetadataValues?: Record<string, unknown> | null
  fileId?: number
  canViewDocuments?: boolean
  canDownloadDocuments?: boolean
}>()

const isDocument = computed(() => props.node.type === 'document')
const isReference = computed(() => props.node.type === 'document_reference')
const isDocumentLike = computed(() => isDocument.value || isReference.value)

const isFolder = computed(() => props.node.type === 'folder')
const isFileRoot = computed(() => props.node.type === 'file')

const resolvedFileId = computed(() => props.fileId ?? props.node.archival_file_id ?? null)
const documentId = computed(() => props.node.archival_file_document_id ?? null)

const metadataEntries = computed(() => {
  if (isFileRoot.value) {
    return archivalMetadataDisplayEntries(props.fileMetadataValues, props.metadataFields)
  }

  return archivalMetadataDisplayEntries(props.node.metadata_values, props.metadataFields)
})

const structuralEntries = computed(() => {
  const entries: Array<{ label: string, value: string }> = []

  if (isDocumentLike.value) {
    if (props.node.doc_document_type_name) {
      entries.push({ label: 'Tipo documental', value: props.node.doc_document_type_name })
    }

    if (isReference.value && props.node.referenced_version_number != null) {
      const refTitle = props.node.referenced_title ? ` (${props.node.referenced_title})` : ''
      entries.push({
        label: 'Referencia fija',
        value: `Versión ${props.node.referenced_version_number}${refTitle}`,
      })
    }
    else if (props.node.version_number) {
      const suffix = props.node.is_current_version === false ? ' (histórica)' : ' (vigente)'
      entries.push({ label: 'Versión actual', value: `v${props.node.version_number}${suffix}` })
    }

    if (props.node.source_label) {
      entries.push({ label: 'Origen', value: props.node.source_label })
    }

    if (props.node.mime_type) {
      entries.push({ label: 'Formato', value: props.node.mime_type })
    }

    if (props.node.size_bytes != null) {
      entries.push({ label: 'Tamaño', value: formatArchivalFileSize(props.node.size_bytes) })
    }

    if (props.node.uploaded_at) {
      entries.push({
        label: 'Cargado',
        value: new Date(props.node.uploaded_at).toLocaleString('es-CO'),
      })
    }

    if (props.node.uploaded_by_name) {
      entries.push({ label: 'Usuario', value: props.node.uploaded_by_name })
    }

    if (props.node.folio_start != null || props.node.folio_end != null) {
      const start = props.node.folio_start ?? '—'
      const end = props.node.folio_end ?? '—'
      entries.push({ label: 'Folios', value: `${start} – ${end}` })
    }
  }

  if (isFolder.value && props.node.workflow_stage_key) {
    entries.push({ label: 'Etapa workflow', value: props.node.workflow_stage_key })
  }

  if (isFileRoot.value && props.node.file_number) {
    entries.push({ label: 'Número', value: props.node.file_number })
  }

  if (props.node.status_label) {
    entries.push({ label: 'Estado', value: props.node.status_label })
  }

  return entries
})

const showVersionHistory = computed(() =>
  isDocument.value
  && resolvedFileId.value != null
  && documentId.value != null,
)

const hasContent = computed(() =>
  structuralEntries.value.length > 0
  || metadataEntries.value.length > 0
  || showVersionHistory.value,
)
</script>

<template>
  <div v-if="hasContent" class="space-y-3 text-xs">
    <dl v-if="structuralEntries.length" class="grid gap-1.5 sm:grid-cols-2">
      <div
        v-for="entry in structuralEntries"
        :key="`struct-${entry.label}`"
        class="min-w-0"
      >
        <dt class="text-muted-foreground">
          {{ entry.label }}
        </dt>
        <dd class="font-medium break-words">
          {{ entry.value }}
        </dd>
      </div>
    </dl>

    <div v-if="metadataEntries.length" class="space-y-1.5">
      <p class="font-medium text-muted-foreground">
        Metadatos
      </p>
      <dl class="grid gap-1.5 sm:grid-cols-2">
        <div
          v-for="entry in metadataEntries"
          :key="entry.key"
          class="min-w-0 rounded-md bg-background/60 px-2 py-1.5"
        >
          <dt class="text-muted-foreground">
            {{ entry.label }}
          </dt>
          <dd class="font-medium break-words">
            {{ entry.value }}
          </dd>
        </div>
      </dl>
    </div>

    <ArchivalFileDocumentVersionHistory
      v-if="showVersionHistory"
      :file-id="resolvedFileId!"
      :document-id="documentId!"
      :document-title="node.name"
      :can-view="canViewDocuments"
      :can-download="canDownloadDocuments"
      compact
    />
  </div>

  <p v-else class="text-xs text-muted-foreground">
    Sin metadatos registrados para este elemento.
  </p>
</template>
