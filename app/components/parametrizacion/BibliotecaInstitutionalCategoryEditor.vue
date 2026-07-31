<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InstitutionalLibraryCategoryRow } from '~/types/institutional-library'
import { institutionalLibraryCategoryIcon } from '~/utils/institutional-library-category'

type CategoryDraft = InstitutionalLibraryCategoryRow & {
  originalKey?: string
  _isNew?: boolean
  _removed?: boolean
}

const props = defineProps<{
  categories: InstitutionalLibraryCategoryRow[]
  canEdit: boolean
  saving: boolean
  savedVersion?: number
}>()

const emit = defineEmits<{
  save: [rows: CategoryDraft[]]
}>()

const editing = ref(false)
const draft = ref<CategoryDraft[]>([])

function slugFromLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)

  return base || 'categoria'
}

function cloneRows(rows: InstitutionalLibraryCategoryRow[]): CategoryDraft[] {
  return rows.map(row => ({
    ...row,
    originalKey: row.key,
    doc_type_code: row.doc_type_code ?? '',
  }))
}

function resetDraft() {
  draft.value = cloneRows(props.categories)
}

watch(
  () => props.savedVersion,
  () => {
    editing.value = false
    resetDraft()
  },
)

watch(
  () => props.savedVersion,
  () => {
    editing.value = false
    resetDraft()
  },
)

watch(
  () => [props.categories, props.savedVersion] as const,
  () => {
    if (!editing.value) {
      resetDraft()
    }
  },
  { deep: true, immediate: true },
)

const visibleRows = computed(() => draft.value.filter(row => !row._removed))

function startEditing() {
  resetDraft()
  editing.value = true
}

function cancelEditing() {
  resetDraft()
  editing.value = false
}

function addRow() {
  const maxOrder = visibleRows.value.reduce((max, row) => Math.max(max, row.sort_order ?? 0), 0)
  draft.value.push({
    key: '',
    label: '',
    icon: 'file-text',
    doc_type_code: '',
    sort_order: maxOrder + 10,
    is_active: true,
    _isNew: true,
  })
}

function removeRow(row: CategoryDraft) {
  if (row._isNew) {
    draft.value = draft.value.filter(item => item !== row)
    return
  }
  row._removed = true
}

function onLabelBlur(row: CategoryDraft) {
  if (!row._isNew || row.key.trim()) {
    return
  }
  row.key = slugFromLabel(row.label)
}

function submit() {
  const rows = visibleRows.value
  for (const row of rows) {
    if (!row.key.trim() || !row.label.trim()) {
      toast.error('Cada categoría debe tener clave y etiqueta.')
      return
    }
  }

  emit('save', draft.value)
}

defineExpose({ cancelEditing })
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
      <div class="space-y-1">
        <CardTitle class="text-base">
          Categorías de la biblioteca
        </CardTitle>
        <CardDescription class="max-w-3xl leading-relaxed">
          Clasificación visible en <NuxtLink to="/biblioteca" class="underline underline-offset-2">Biblioteca institucional</NuxtLink>
          y al publicar documentos desde expedientes. Solo las categorías activas aparecen en los filtros y formularios.
        </CardDescription>
      </div>
      <div v-if="canEdit" class="flex gap-2">
        <Button v-if="!editing" type="button" variant="outline" size="sm" @click="startEditing">
          Editar categorías
        </Button>
        <template v-else>
          <Button type="button" variant="outline" size="sm" :disabled="saving" @click="cancelEditing">
            Cancelar
          </Button>
          <Button type="button" size="sm" :disabled="saving" @click="submit">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </Button>
        </template>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Clave</TableHead>
              <TableHead>Icono</TableHead>
              <TableHead>Código TRD (opcional)</TableHead>
              <TableHead class="w-24">
                Orden
              </TableHead>
              <TableHead class="w-24">
                Activa
              </TableHead>
              <TableHead v-if="editing" class="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in visibleRows" :key="row.originalKey ?? row.key ?? row.label">
              <TableCell>
                <template v-if="editing">
                  <Input v-model="row.label" placeholder="Ej. Protocolos" @blur="onLabelBlur(row)" />
                </template>
                <template v-else>
                  <div class="flex items-center gap-2">
                    <Icon :name="institutionalLibraryCategoryIcon(row.icon)" class="size-4 text-muted-foreground" />
                    <span>{{ row.label }}</span>
                  </div>
                </template>
              </TableCell>
              <TableCell>
                <Input
                  v-if="editing"
                  v-model="row.key"
                  :readonly="!row._isNew"
                  placeholder="protocolos"
                  class="font-mono text-sm"
                />
                <span v-else class="font-mono text-sm text-muted-foreground">{{ row.key }}</span>
              </TableCell>
              <TableCell>
                <Input v-if="editing" v-model="row.icon" placeholder="clipboard-list" class="font-mono text-sm" />
                <span v-else class="font-mono text-sm text-muted-foreground">{{ row.icon }}</span>
              </TableCell>
              <TableCell>
                <Input
                  v-if="editing"
                  v-model="row.doc_type_code"
                  placeholder="protocolos"
                  class="font-mono text-sm"
                />
                <span v-else class="font-mono text-sm text-muted-foreground">{{ row.doc_type_code || '—' }}</span>
              </TableCell>
              <TableCell>
                <Input v-if="editing" v-model.number="row.sort_order" type="number" min="0" />
                <span v-else>{{ row.sort_order }}</span>
              </TableCell>
              <TableCell>
                <Checkbox
                  v-if="editing"
                  bare
                  :checked="row.is_active"
                  @update:checked="row.is_active = $event === true"
                />
                <Badge v-else :variant="row.is_active ? 'outline' : 'secondary'">
                  {{ row.is_active ? 'Sí' : 'No' }}
                </Badge>
              </TableCell>
              <TableCell v-if="editing">
                <Button type="button" variant="ghost" size="icon" class="size-8" @click="removeRow(row)">
                  <Icon name="i-lucide-trash-2" class="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Button v-if="editing" type="button" variant="outline" size="sm" @click="addRow">
        <Icon name="i-lucide-plus" class="mr-2 size-4" />
        Añadir categoría
      </Button>

      <p v-if="editing" class="text-xs text-muted-foreground leading-relaxed">
        La clave no se puede cambiar después de crear la categoría. El código TRD opcional permite preseleccionar la categoría según el tipo documental al publicar.
      </p>
    </CardContent>
  </Card>
</template>
