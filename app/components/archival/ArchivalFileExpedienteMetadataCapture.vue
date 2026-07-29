<script setup lang="ts">
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'

defineProps<{
  fields: ArchivalMetadataFieldRow[]
  schemaName?: string | null
  schemaVersion?: number | null
  loading?: boolean
  disabled?: boolean
  highlightedFieldCode?: string | null
}>()

const metadataValues = defineModel<Record<string, unknown>>({ required: true })
</script>

<template>
  <div v-if="loading" class="text-sm text-muted-foreground">
    Cargando metadatos del tipo…
  </div>

  <div
    v-else-if="fields.length"
    class="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4"
  >
    <div>
      <p class="text-sm font-medium">
        Metadatos del expediente
      </p>
      <p class="text-xs text-muted-foreground">
        <template v-if="schemaName">
          Esquema «{{ schemaName }}»
          <span v-if="schemaVersion">v{{ schemaVersion }}</span>.
        </template>
        Los campos obligatorios deben completarse antes de cerrar el expediente; puede diligenciarlos ahora o después en el detalle.
      </p>
    </div>

    <ArchivalFileDocumentMetadataFields
      v-model="metadataValues"
      :fields="fields"
      :disabled="disabled"
      :highlighted-field-code="highlightedFieldCode"
    />
  </div>
</template>
