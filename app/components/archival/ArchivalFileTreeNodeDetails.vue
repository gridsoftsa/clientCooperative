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
}>()

const isDocument = computed(() =>
  props.node.type === 'document' || props.node.type === 'document_reference',
)

const isFolder = computed(() => props.node.type === 'folder')

const isFileRoot = computed(() => props.node.type === 'file')

const metadataEntries = computed(() => {
  if (isFileRoot.value) {
    return archivalMetadataDisplayEntries(props.fileMetadataValues, props.metadataFields)
  }

  return archivalMetadataDisplayEntries(props.node.metadata_values, props.metadataFields)
})

const structuralEntries = computed(() => {
  const entries: Array<{ label: string, value: string }> = []

  if (isDocument.value) {
    if (props.node.doc_document_type_name) {
      entries.push({ label: 'Tipo documental', value: props.node.doc_document_type_name })
    }

    if (props.node.version_number) {
      entries.push({ label: 'Versión', value: `v${props.node.version_number}` })
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

const hasContent = computed(() =>
  structuralEntries.value.length > 0 || metadataEntries.value.length > 0,
)
</script>

<template>
  <div v-if="hasContent" class="space-y-2 text-xs">
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
  </div>

  <p v-else class="text-xs text-muted-foreground">
    Sin metadatos registrados para este elemento.
  </p>
</template>
