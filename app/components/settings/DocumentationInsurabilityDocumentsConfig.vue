<script setup lang="ts">
import { generateAuxiliaryChecklistItemKey } from '~/constants/auxiliary-documents-checklist'
import type { DocumentationInsurabilityChecklistItem } from '~/constants/documentation-insurability-checklist'

const props = withDefaults(
  defineProps<{
    editedData: Record<string, unknown>
    editing: boolean
    canEdit: boolean
    /** Si se informa, sustituye el texto de ayuda por defecto (p. ej. checklist ente aprobador). */
    helpParagraph?: string | null
  }>(),
  { helpParagraph: null },
)

const defaultHelpParagraph =
  'Documentos que el revisor puede solicitar cuando marca «Asegurabilidad: Sí» al registrar el concepto de revisión documental. Claves técnicas en inglés; textos visibles en español.'

const resolvedHelpParagraph = computed(() => {
  const h = props.helpParagraph
  if (typeof h === 'string' && h.trim() !== '') {
    return h.trim()
  }
  return defaultHelpParagraph
})

const emit = defineEmits<{
  'update:field': [payload: { key: string, value: unknown }]
}>()

function items(): DocumentationInsurabilityChecklistItem[] {
  const raw = props.editedData.items
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (row): row is DocumentationInsurabilityChecklistItem =>
      row != null && typeof row === 'object' && typeof (row as { key?: unknown }).key === 'string',
  ) as DocumentationInsurabilityChecklistItem[]
}

function patchItems(nextRows: DocumentationInsurabilityChecklistItem[]): void {
  emit('update:field', { key: 'items', value: nextRows })
}

function updateRow(index: number, patch: Partial<DocumentationInsurabilityChecklistItem>): void {
  const rows = [...items()]
  const cur = rows[index]
  if (!cur) {
    return
  }
  rows[index] = { ...cur, ...patch }
  patchItems(rows)
}

function addRow(): void {
  patchItems([
    ...items(),
    {
      key: generateAuxiliaryChecklistItemKey(),
      label: 'Nuevo documento',
      required: false,
    },
  ])
}

function removeRow(index: number): void {
  patchItems(items().filter((_, i) => i !== index))
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      {{ resolvedHelpParagraph }}
    </p>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[28rem] table-fixed border-collapse text-sm rounded-lg border border-border">
        <thead>
          <tr class="border-b border-border bg-muted/20">
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Documento
            </th>
            <th class="w-28 px-2 py-2 text-center font-medium text-muted-foreground">
              Obligatorio
            </th>
            <th v-if="editing && canEdit" class="w-24 px-2 py-2 text-center font-medium text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in items()"
            :key="`${row.key}-${idx}`"
            class="border-b border-border/80 last:border-b-0"
          >
            <td class="px-3 py-2 align-top">
              <Input
                :model-value="row.label"
                class="h-9 text-sm"
                :disabled="!editing || !canEdit"
                @update:model-value="updateRow(idx, { label: String($event ?? '') })"
              />
            </td>
            <td class="px-2 py-2 text-center align-middle">
              <Checkbox
                :model-value="Boolean(row.required)"
                :disabled="!editing || !canEdit"
                class="mx-auto"
                @update:model-value="updateRow(idx, { required: Boolean($event) })"
              />
            </td>
            <td v-if="editing && canEdit" class="px-2 py-2 text-center align-middle">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="removeRow(idx)"
              >
                <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                <span class="sr-only">Quitar fila</span>
              </Button>
            </td>
          </tr>
          <tr v-if="items().length === 0">
            <td :colspan="editing && canEdit ? 3 : 2" class="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin documentos definidos.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Button
      v-if="editing && canEdit"
      type="button"
      variant="outline"
      size="sm"
      @click="addRow"
    >
      <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
      Añadir documento
    </Button>
  </div>
</template>
