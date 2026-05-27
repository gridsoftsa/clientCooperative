<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { VentanillaFunctionalTypeRow, VentanillaReceptionMediumRow } from '~/types/ventanilla'

export type VentanillaCatalogEditorKind = 'functional-types' | 'reception-media'

type FunctionalDraft = {
  key: string
  label: string
  requires_response_default: boolean
  sla_business_days: string
  sort_order: string
  is_active: boolean
  _isNew?: boolean
  _removed?: boolean
}

type ReceptionDraft = {
  value: string
  label: string
  sort_order: string
  is_active: boolean
  _isNew?: boolean
  _removed?: boolean
}

const props = defineProps<{
  kind: VentanillaCatalogEditorKind
  functionalTypes: VentanillaFunctionalTypeRow[]
  receptionMedia: VentanillaReceptionMediumRow[]
  canEdit: boolean
  saving: boolean
  savedVersion?: number
}>()

const emit = defineEmits<{
  saveFunctional: [rows: FunctionalDraft[]]
  saveReception: [rows: ReceptionDraft[]]
}>()

const editing = ref(false)
const functionalDraft = ref<FunctionalDraft[]>([])
const receptionDraft = ref<ReceptionDraft[]>([])

const catalogTitle = computed(() =>
  props.kind === 'functional-types' ? 'Tipos funcionales' : 'Medios de recepción',
)

const helperText = computed(() =>
  props.kind === 'functional-types'
    ? `Opciones del desplegable «Tipo funcional» en nuevo radicado. Configure respuesta, SLA y orden.`
    : `Mismo texto que aparece en el desplegable de «Medio de recepción» al radicar.`,
)

function slugFromLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)

  return base || 'opcion'
}

function cloneFunctional(rows: VentanillaFunctionalTypeRow[]): FunctionalDraft[] {
  return rows.map(row => ({
    key: row.key,
    label: row.label,
    requires_response_default: row.requires_response_default,
    sla_business_days: row.sla_business_days != null ? String(row.sla_business_days) : '',
    sort_order: String(row.sort_order ?? 0),
    is_active: row.is_active ?? true,
  }))
}

function cloneReception(rows: VentanillaReceptionMediumRow[]): ReceptionDraft[] {
  return rows.map(row => ({
    value: row.value,
    label: row.label,
    sort_order: String(row.sort_order ?? 0),
    is_active: row.is_active ?? true,
  }))
}

function resetDrafts() {
  functionalDraft.value = cloneFunctional(props.functionalTypes)
  receptionDraft.value = cloneReception(props.receptionMedia)
}

watch(
  () => [props.functionalTypes, props.receptionMedia, props.kind] as const,
  () => {
    if (!editing.value) {
      resetDrafts()
    }
  },
  { deep: true },
)

function startEditing() {
  resetDrafts()
  editing.value = true
}

function cancelEditing() {
  resetDrafts()
  editing.value = false
}

function visibleFunctionalRows(): FunctionalDraft[] {
  return functionalDraft.value.filter(row => !row._removed)
}

function visibleReceptionRows(): ReceptionDraft[] {
  return receptionDraft.value.filter(row => !row._removed)
}

function addFunctionalRow() {
  const maxOrder = visibleFunctionalRows().reduce(
    (max, row) => Math.max(max, Number(row.sort_order) || 0),
    0,
  )
  functionalDraft.value.push({
    key: '',
    label: '',
    requires_response_default: true,
    sla_business_days: '',
    sort_order: String(maxOrder + 10),
    is_active: true,
    _isNew: true,
  })
}

function addReceptionRow() {
  const maxOrder = visibleReceptionRows().reduce(
    (max, row) => Math.max(max, Number(row.sort_order) || 0),
    0,
  )
  receptionDraft.value.push({
    value: '',
    label: '',
    sort_order: String(maxOrder + 10),
    is_active: true,
    _isNew: true,
  })
}

function removeFunctionalRow(index: number) {
  const row = visibleFunctionalRows()[index]
  if (!row) {
    return
  }
  if (row._isNew) {
    const idx = functionalDraft.value.indexOf(row)
    if (idx >= 0) {
      functionalDraft.value.splice(idx, 1)
    }
    return
  }
  row._removed = true
}

function removeReceptionRow(index: number) {
  const row = visibleReceptionRows()[index]
  if (!row) {
    return
  }
  if (row._isNew) {
    const idx = receptionDraft.value.indexOf(row)
    if (idx >= 0) {
      receptionDraft.value.splice(idx, 1)
    }
    return
  }
  row._removed = true
}

function validateAndSave() {
  if (props.kind === 'functional-types') {
    const active = visibleFunctionalRows()
    if (active.length === 0) {
      toast.error('Añade al menos un tipo funcional.')
      return
    }
    for (const row of active) {
      if (!row.label.trim()) {
        toast.error('Cada tipo funcional debe tener etiqueta.')
        return
      }
      if (!row.key.trim() && row._isNew) {
        row.key = slugFromLabel(row.label)
      }
      if (!/^[a-z0-9_-]+$/.test(row.key.trim())) {
        toast.error(`Clave no válida: ${row.label}`)
        return
      }
    }
    emit('saveFunctional', functionalDraft.value)
    return
  }

  const active = visibleReceptionRows()
  if (active.length === 0) {
    toast.error('Añade al menos un medio de recepción.')
    return
  }
  for (const row of active) {
    if (!row.label.trim()) {
      toast.error('Cada medio debe tener texto visible.')
      return
    }
    if (!row.value.trim() && row._isNew) {
      row.value = slugFromLabel(row.label)
    }
    if (!/^[a-z0-9_-]+$/.test(row.value.trim())) {
      toast.error(`Valor no válido: ${row.label}`)
      return
    }
  }
  emit('saveReception', receptionDraft.value)
}

watch(
  () => props.savedVersion,
  () => {
    if (props.savedVersion && props.savedVersion > 0) {
      editing.value = false
      resetDrafts()
    }
  },
)
</script>

<template>
  <div class="rounded-lg border bg-muted/30 p-4 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 class="font-medium text-sm">
          {{ catalogTitle }}
        </h4>
        <p class="text-xs text-muted-foreground">
          {{ helperText }}
        </p>
      </div>
      <div v-if="canEdit" class="flex gap-2">
        <Button
          v-if="!editing"
          variant="warning"
          size="sm"
          @click="startEditing"
        >
          <Icon name="i-lucide-pencil" class="mr-1 h-4 w-4" />
          Editar
        </Button>
        <template v-else>
          <Button variant="outline" size="sm" :disabled="saving" @click="cancelEditing">
            Cancelar
          </Button>
          <Button variant="default" size="sm" :disabled="saving" @click="validateAndSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 h-4 w-4 animate-spin" />
            Guardar
          </Button>
        </template>
      </div>
    </div>

    <template v-if="kind === 'reception-media'">
      <div class="overflow-x-auto rounded-md border bg-background">
        <div
          class="grid min-w-[12rem] grid-cols-[1fr_auto] gap-2 border-b bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Texto en el formulario de radicación</span>
          <span v-if="editing && canEdit" class="w-9 shrink-0" />
        </div>
        <div
          v-for="(row, idx) in visibleReceptionRows()"
          :key="`${row.value || 'new'}-${idx}`"
          class="grid min-w-[12rem] grid-cols-[1fr_auto] items-center gap-2 border-b border-border/80 px-3 py-2 last:border-b-0"
        >
          <Input
            v-model="row.label"
            class="h-9"
            :disabled="!editing || !canEdit"
            placeholder="Ej.: Presencial"
          />
          <Button
            v-if="editing && canEdit"
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0"
            :aria-label="`Eliminar opción ${idx + 1}`"
            @click="removeReceptionRow(idx)"
          >
            <Icon name="i-lucide-trash-2" class="size-4" />
          </Button>
        </div>
        <p
          v-if="visibleReceptionRows().length === 0"
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          No hay medios de recepción configurados.
        </p>
      </div>
      <Button
        v-if="editing && canEdit"
        type="button"
        variant="outline"
        size="sm"
        @click="addReceptionRow"
      >
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Añadir opción
      </Button>
    </template>

    <template v-else>
      <div class="overflow-x-auto rounded-md border bg-background">
        <div
          class="grid min-w-[48rem] grid-cols-[minmax(10rem,1.4fr)_minmax(8rem,1fr)_5.5rem_5rem_4.5rem_4.5rem_auto] gap-2 border-b bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <span>Texto en el formulario</span>
          <span>Clave técnica</span>
          <span>Respuesta</span>
          <span>SLA</span>
          <span>Orden</span>
          <span>Activo</span>
          <span v-if="editing && canEdit" class="w-9 shrink-0" />
        </div>
        <div
          v-for="(row, idx) in visibleFunctionalRows()"
          :key="`${row.key || 'new'}-${idx}`"
          class="grid min-w-[48rem] grid-cols-[minmax(10rem,1.4fr)_minmax(8rem,1fr)_5.5rem_5rem_4.5rem_4.5rem_auto] items-center gap-2 border-b border-border/80 px-3 py-2 last:border-b-0"
        >
          <Input
            v-model="row.label"
            class="h-9"
            :disabled="!editing || !canEdit"
            placeholder="Ej.: PQRSFD"
          />
          <Input
            v-model="row.key"
            class="h-9 font-mono text-xs"
            :disabled="!editing || !canEdit || !row._isNew"
            placeholder="pqrsfd"
          />
          <div class="flex justify-center">
            <Checkbox
              :checked="row.requires_response_default"
              :disabled="!editing || !canEdit"
              @update:checked="(v: boolean) => { row.requires_response_default = v }"
            />
          </div>
          <Input
            v-model="row.sla_business_days"
            type="number"
            min="1"
            max="365"
            class="h-9"
            :disabled="!editing || !canEdit || !row.requires_response_default"
            placeholder="—"
          />
          <Input
            v-model="row.sort_order"
            type="number"
            min="0"
            class="h-9"
            :disabled="!editing || !canEdit"
          />
          <div class="flex justify-center">
            <Checkbox
              :checked="row.is_active"
              :disabled="!editing || !canEdit"
              @update:checked="(v: boolean) => { row.is_active = v }"
            />
          </div>
          <Button
            v-if="editing && canEdit"
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0"
            :aria-label="`Eliminar tipo ${idx + 1}`"
            @click="removeFunctionalRow(idx)"
          >
            <Icon name="i-lucide-trash-2" class="size-4" />
          </Button>
        </div>
        <p
          v-if="visibleFunctionalRows().length === 0"
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          No hay tipos funcionales configurados.
        </p>
      </div>
      <Button
        v-if="editing && canEdit"
        type="button"
        variant="outline"
        size="sm"
        @click="addFunctionalRow"
      >
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Añadir opción
      </Button>
    </template>
  </div>
</template>
