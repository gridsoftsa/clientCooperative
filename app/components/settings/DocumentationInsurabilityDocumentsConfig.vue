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
    /** FNG: dos bloques (asesor vs revisión documental) y columna para marcar el ámbito de cada fila. */
    fngChecklistGroupedUi?: boolean
  }>(),
  { helpParagraph: null, fngChecklistGroupedUi: false },
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

type RowWithGlobalIndex = { row: DocumentationInsurabilityChecklistItem, globalIndex: number }

function rowsWithIndices(
  predicate: (row: DocumentationInsurabilityChecklistItem) => boolean,
): RowWithGlobalIndex[] {
  return items()
    .map((row, globalIndex) => ({ row, globalIndex }))
    .filter(({ row }) => predicate(row))
}

const adviserRowsIndexed = computed(() =>
  rowsWithIndices(row => !row.documentation_review_upload),
)

const documentationReviewRowsIndexed = computed(() =>
  rowsWithIndices(row => Boolean(row.documentation_review_upload)),
)

const allRowsIndexed = computed(() =>
  rowsWithIndices(() => true),
)

function patchItems(nextRows: DocumentationInsurabilityChecklistItem[]): void {
  emit('update:field', { key: 'items', value: nextRows })
}

function updateRowAtGlobalIndex(globalIndex: number, patch: Partial<DocumentationInsurabilityChecklistItem>): void {
  const rows = [...items()]
  const cur = rows[globalIndex]
  if (!cur) {
    return
  }
  rows[globalIndex] = { ...cur, ...patch }
  patchItems(rows)
}

function addRow(): void {
  patchItems([
    ...items(),
    {
      key: generateAuxiliaryChecklistItemKey(),
      label: 'Nuevo documento',
      required: false,
      documentation_review_upload: false,
    },
  ])
}

function addRowForSegment(documentationReviewUpload: boolean): void {
  patchItems([
    ...items(),
    {
      key: generateAuxiliaryChecklistItemKey(),
      label: documentationReviewUpload
        ? 'Nuevo documento (revisión documental)'
        : 'Nuevo documento (asesor / borrador)',
      required: false,
      documentation_review_upload: documentationReviewUpload,
    },
  ])
}

function removeRowAtGlobalIndex(globalIndex: number): void {
  patchItems(items().filter((_, i) => i !== globalIndex))
}

const tableColspan = computed(() => {
  let n = 2
  if (props.fngChecklistGroupedUi) {
    n += 1
  }
  if (props.editing && props.canEdit) {
    n += 1
  }
  return n
})
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      {{ resolvedHelpParagraph }}
    </p>

    <template v-if="fngChecklistGroupedUi">
      <div class="space-y-8">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-foreground">
            Paquete del asesor (borrador y devolución)
          </h4>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Estas filas aparecen en la radicación cuando el asesor edita la solicitud. No incluyen lo que solo carga revisión documental.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[28rem] table-fixed border-collapse text-sm rounded-lg border border-border">
              <thead>
                <tr class="border-b border-border bg-muted/20">
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground">
                    Documento
                  </th>
                  <th
                    class="w-36 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    title="Si está marcado, la fila solo aparece en revisión documental (no en el borrador del asesor)."
                  >
                    Ámbito
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
                  v-for="{ row, globalIndex } in adviserRowsIndexed"
                  :key="`adv-${row.key}-${globalIndex}`"
                  class="border-b border-border/80 last:border-b-0"
                >
                  <td class="px-3 py-2 align-top">
                    <Input
                      :model-value="row.label"
                      class="h-9 text-sm"
                      :disabled="!editing || !canEdit"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { label: String($event ?? '') })"
                    />
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <Checkbox
                      :model-value="Boolean(row.documentation_review_upload)"
                      :disabled="!editing || !canEdit"
                      class="mx-auto"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { documentation_review_upload: Boolean($event) })"
                    />
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <Checkbox
                      :model-value="Boolean(row.required)"
                      :disabled="!editing || !canEdit"
                      class="mx-auto"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { required: Boolean($event) })"
                    />
                  </td>
                  <td v-if="editing && canEdit" class="px-2 py-2 text-center align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click="removeRowAtGlobalIndex(globalIndex)"
                    >
                      <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                      <span class="sr-only">Quitar fila</span>
                    </Button>
                  </td>
                </tr>
                <tr v-if="adviserRowsIndexed.length === 0">
                  <td :colspan="tableColspan" class="px-3 py-6 text-center text-sm text-muted-foreground">
                    Sin filas en el paquete del asesor.
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
            @click="addRowForSegment(false)"
          >
            <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
            Añadir documento (asesor)
          </Button>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-foreground">
            Revisión documental
          </h4>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Estas filas no se muestran al asesor en borrador: las carga quien revisa documentación (p. ej. al aprobar el paso de revisión documental). Use la columna «Ámbito» en la tabla del paquete del asesor para devolver una fila a ese bloque.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[28rem] table-fixed border-collapse text-sm rounded-lg border border-border">
              <thead>
                <tr class="border-b border-border bg-muted/20">
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground">
                    Documento
                  </th>
                  <th
                    class="w-36 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    title="Si está marcado, la fila solo aparece en revisión documental (no en el borrador del asesor)."
                  >
                    Ámbito
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
                  v-for="{ row, globalIndex } in documentationReviewRowsIndexed"
                  :key="`rev-${row.key}-${globalIndex}`"
                  class="border-b border-border/80 last:border-b-0"
                >
                  <td class="px-3 py-2 align-top">
                    <Input
                      :model-value="row.label"
                      class="h-9 text-sm"
                      :disabled="!editing || !canEdit"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { label: String($event ?? '') })"
                    />
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <Checkbox
                      :model-value="Boolean(row.documentation_review_upload)"
                      :disabled="!editing || !canEdit"
                      class="mx-auto"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { documentation_review_upload: Boolean($event) })"
                    />
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <Checkbox
                      :model-value="Boolean(row.required)"
                      :disabled="!editing || !canEdit"
                      class="mx-auto"
                      @update:model-value="updateRowAtGlobalIndex(globalIndex, { required: Boolean($event) })"
                    />
                  </td>
                  <td v-if="editing && canEdit" class="px-2 py-2 text-center align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      @click="removeRowAtGlobalIndex(globalIndex)"
                    >
                      <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                      <span class="sr-only">Quitar fila</span>
                    </Button>
                  </td>
                </tr>
                <tr v-if="documentationReviewRowsIndexed.length === 0">
                  <td :colspan="tableColspan" class="px-3 py-6 text-center text-sm text-muted-foreground">
                    Sin filas solo para revisión documental.
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
            @click="addRowForSegment(true)"
          >
            <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
            Añadir documento (revisión documental)
          </Button>
        </div>
      </div>
    </template>

    <template v-else>
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
              v-for="{ row, globalIndex } in allRowsIndexed"
              :key="`${row.key}-${globalIndex}`"
              class="border-b border-border/80 last:border-b-0"
            >
              <td class="px-3 py-2 align-top">
                <Input
                  :model-value="row.label"
                  class="h-9 text-sm"
                  :disabled="!editing || !canEdit"
                  @update:model-value="updateRowAtGlobalIndex(globalIndex, { label: String($event ?? '') })"
                />
              </td>
              <td class="px-2 py-2 text-center align-middle">
                <Checkbox
                  :model-value="Boolean(row.required)"
                  :disabled="!editing || !canEdit"
                  class="mx-auto"
                  @update:model-value="updateRowAtGlobalIndex(globalIndex, { required: Boolean($event) })"
                />
              </td>
              <td v-if="editing && canEdit" class="px-2 py-2 text-center align-middle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  @click="removeRowAtGlobalIndex(globalIndex)"
                >
                  <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                  <span class="sr-only">Quitar fila</span>
                </Button>
              </td>
            </tr>
            <tr v-if="allRowsIndexed.length === 0">
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
    </template>
  </div>
</template>
