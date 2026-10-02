<script setup lang="ts">
import type { ArchivalDocumentSelectionDecision } from '~/types/archival-file'
import type { ArchivalTransferDocumentSelectionRow } from '~/composables/useArchivalLifecycleApi'

const decisions = defineModel<Record<number, ArchivalDocumentSelectionDecision>>({ required: true })

const props = defineProps<{
  documents: ArchivalTransferDocumentSelectionRow[]
}>()

const requiringSelection = computed(() =>
  props.documents.filter(document => documentNeedsSelectionChoice(document)),
)

function documentNeedsSelectionChoice(document: ArchivalTransferDocumentSelectionRow): boolean {
  if (document.requires_selection) {
    return true
  }

  return (document.final_disposition ?? '')
    .split('|')
    .map(part => part.trim())
    .includes('selection')
}

function setDecision(documentId: number, decision: ArchivalDocumentSelectionDecision) {
  decisions.value = {
    ...decisions.value,
    [documentId]: decision,
  }
}
</script>

<template>
  <div v-if="requiringSelection.length" class="space-y-3">
    <p class="text-sm text-muted-foreground">
      La TRD de estos documentos indica <strong>selección</strong>. Indique si cada uno continúa en conservación o se envía a eliminación.
    </p>
    <div
      v-for="document in requiringSelection"
      :key="document.id"
      class="rounded-md border p-3 space-y-2"
    >
      <p class="text-sm font-medium">
        {{ document.title }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ document.doc_document_type_name || 'Documento' }}
        <span v-if="document.final_disposition_label">
          · {{ document.final_disposition_label }}
        </span>
        <span v-if="document.inherited_from_label">
          ({{ document.inherited_from_label }})
        </span>
      </p>
      <div class="flex flex-wrap gap-4 text-sm">
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            class="size-4 accent-primary"
            :name="`selection-${document.id}`"
            :checked="decisions[document.id] === 'conservation'"
            @change="setDecision(document.id, 'conservation')"
          >
          Conservación
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            class="size-4 accent-primary"
            :name="`selection-${document.id}`"
            :checked="decisions[document.id] === 'elimination'"
            @change="setDecision(document.id, 'elimination')"
          >
          Eliminación
        </label>
      </div>
    </div>
  </div>
</template>
