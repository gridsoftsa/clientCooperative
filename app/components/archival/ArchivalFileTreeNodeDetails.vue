<script setup lang="ts">
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import { toast } from 'vue-sonner'
import {
  archivalMetadataDisplayEntries,
  formatArchivalFileSize,
} from '~/utils/archival-metadata-display'
import { messageFromFetchError } from '~/utils/http-error-message'

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

const nodeMetadataFields = computed(() =>
  (props.node.metadata_fields?.length ? props.node.metadata_fields : props.metadataFields) ?? [],
)

const metadataEntries = computed(() => {
  if (isFileRoot.value) {
    return archivalMetadataDisplayEntries(props.fileMetadataValues, props.metadataFields)
  }

  return archivalMetadataDisplayEntries(props.node.metadata_values, nodeMetadataFields.value)
})

const filingMetadataEntries = computed(() => {
  if (!isFileRoot.value || !props.node.source_filing) {
    return []
  }

  return archivalMetadataDisplayEntries(
    props.node.source_filing.metadata_values,
    props.node.source_filing.metadata_fields,
  )
})

const structuralEntries = computed(() => {
  const entries: Array<{ label: string, value: string }> = []

  if (isDocumentLike.value) {
    const trd = props.node.trd
    if (trd?.series) {
      entries.push({ label: 'Serie TRD', value: `${trd.series.code} — ${trd.series.name}` })
    }
    if (trd?.subseries) {
      entries.push({ label: 'Subserie TRD', value: `${trd.subseries.code} — ${trd.subseries.name}` })
    }
    if (trd?.document_type) {
      entries.push({ label: 'Tipo documental', value: `${trd.document_type.code} — ${trd.document_type.name}` })
    }
    else if (props.node.doc_document_type_name) {
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

    if (props.node.retention?.final_disposition_label) {
      const inherited = props.node.retention.inherited_from_label
        ? ` (heredada de ${props.node.retention.inherited_from_label})`
        : ''
      entries.push({
        label: 'Disposición final TRD',
        value: `${props.node.retention.final_disposition_label}${inherited}`,
      })
    }

    if (props.node.retention?.selection_decision_label) {
      entries.push({ label: 'Conservación o eliminación', value: props.node.retention.selection_decision_label })
    }
  }

  if (isFolder.value && props.node.workflow_stage_key) {
    entries.push({ label: 'Etapa workflow', value: props.node.workflow_stage_key })
  }

  if (isFileRoot.value && props.node.file_number) {
    entries.push({ label: 'Número', value: props.node.file_number })
  }

  if (isFileRoot.value && props.node.trd?.path) {
    entries.push({ label: 'Ubicación TRD', value: props.node.trd.path })
  }

  if (isFileRoot.value && props.node.source_filing?.filing_number) {
    entries.push({ label: 'Radicado', value: props.node.source_filing.filing_number })
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

const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()
const savingSelection = ref(false)

const emit = defineEmits<{
  selectionUpdated: []
}>()

const canRecordSelection = computed(() =>
  isDocument.value
  && !isReference.value
  && Boolean(props.node.retention?.requires_selection)
  && resolvedFileId.value != null
  && documentId.value != null
  && hasPermission('expedientes_transferir'),
)

async function recordSelection(decision: 'conservation' | 'elimination'): Promise<void> {
  if (resolvedFileId.value == null || documentId.value == null) {
    return
  }

  savingSelection.value = true
  try {
    const res = await archivalApi.saveDocumentSelection(resolvedFileId.value, [
      { archival_file_document_id: documentId.value, decision },
    ])
    toast.success(res.message ?? 'Decisión registrada en el documento')
    emit('selectionUpdated')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo guardar la selección'))
  }
  finally {
    savingSelection.value = false
  }
}

const hasContent = computed(() =>
  structuralEntries.value.length > 0
  || metadataEntries.value.length > 0
  || filingMetadataEntries.value.length > 0
  || showVersionHistory.value
  || canRecordSelection.value,
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
        <dd class="font-medium break-words" :title="entry.value">
          {{ entry.value }}
        </dd>
      </div>
    </dl>

    <div v-if="filingMetadataEntries.length" class="space-y-1.5">
      <p class="font-medium text-muted-foreground">
        Metadatos del radicado (workflow)
      </p>
      <dl class="grid gap-1.5 sm:grid-cols-2">
        <div
          v-for="entry in filingMetadataEntries"
          :key="`filing-${entry.key}`"
          class="min-w-0 rounded-md bg-background/60 px-2 py-1.5"
        >
          <dt class="text-muted-foreground">
            {{ entry.label }}
          </dt>
          <dd class="font-medium break-words" :title="entry.value">
            {{ entry.value }}
          </dd>
        </div>
      </dl>
    </div>

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
          <dd class="font-medium break-words" :title="entry.value">
            {{ entry.value }}
          </dd>
        </div>
      </dl>
    </div>

    <div
      v-if="canRecordSelection"
      class="space-y-2 rounded-md border bg-background/80 px-2 py-2"
    >
      <p class="text-xs text-muted-foreground">
        La TRD indica <strong>selección</strong>: registre aquí si el documento se conserva o se elimina. No se elige en el acta de transferencia.
      </p>
      <div class="flex flex-wrap gap-3">
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            class="size-4 accent-primary"
            :name="`file-doc-selection-${documentId}`"
            :checked="node.retention?.selection_decision === 'conservation'"
            :disabled="savingSelection"
            @change="recordSelection('conservation')"
          >
          Conservación
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            class="size-4 accent-primary"
            :name="`file-doc-selection-${documentId}`"
            :checked="node.retention?.selection_decision === 'elimination'"
            :disabled="savingSelection"
            @change="recordSelection('elimination')"
          >
          Eliminación
        </label>
      </div>
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
