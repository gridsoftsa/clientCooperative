<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { VentanillaFunctionalTypeRow, VentanillaReceptionMediumRow } from '~/types/ventanilla'
import { coerceBoolean } from '~/utils/coerce-boolean'

export type VentanillaCatalogEditorKind = 'functional-types' | 'reception-media'

type FunctionalDraft = {
  typeKey: string
  originalKey?: string
  label: string
  requires_response_default: boolean
  sla_business_days: string | number
  sort_order: string | number
  is_active: boolean
  show_in_public_form: boolean
  archival_file_type_id: string
  _clientId?: string
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
  archivalFileTypes: Array<{ id: number, name: string, type_key: string }>
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
    ? 'Son las opciones de «Tipo funcional» cuando alguien crea un radicado.'
    : 'Son las opciones de «Medio de recepción» cuando alguien crea un radicado.',
)

const NONE_ARCHIVAL_FILE_TYPE = 'none'

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

function resolveFunctionalTypeKey(row: VentanillaFunctionalTypeRow | { key?: string, value?: string }): string {
  const raw = row.key ?? row.value ?? ''
  return String(raw).trim()
}

function cloneFunctional(rows: VentanillaFunctionalTypeRow[]): FunctionalDraft[] {
  return rows.map((row) => {
    const typeKey = resolveFunctionalTypeKey(row)

    return {
      typeKey,
      originalKey: typeKey,
      label: row.label,
      requires_response_default: coerceBoolean(row.requires_response_default),
      sla_business_days: row.sla_business_days != null ? String(row.sla_business_days) : '',
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active === undefined ? true : coerceBoolean(row.is_active),
      show_in_public_form: row.show_in_public_form === undefined ? true : coerceBoolean(row.show_in_public_form),
      archival_file_type_id: row.archival_file_type_id != null
        ? String(row.archival_file_type_id)
        : NONE_ARCHIVAL_FILE_TYPE,
      _clientId: typeKey || `saved-${row.label}`,
    }
  })
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
  { deep: true, immediate: true },
)

watch(
  () => props.kind,
  () => {
    if (editing.value) {
      cancelEditing()
    }
  },
)

function startEditing() {
  resetDrafts()
  editing.value = true
}

function cancelEditing() {
  resetDrafts()
  editing.value = false
}

const visibleFunctionalRows = computed(() => functionalDraft.value.filter(row => !row._removed))

const visibleReceptionRows = computed(() => receptionDraft.value.filter(row => !row._removed))

const functionalQuery = ref('')

const displayedFunctionalRows = computed(() => {
  const query = functionalQuery.value.trim().toLowerCase()
  if (!query) {
    return visibleFunctionalRows.value
  }

  return visibleFunctionalRows.value.filter((row) => {
    const label = row.label.toLowerCase()
    const key = functionalRowKey(row).toLowerCase()
    return label.includes(query) || key.includes(query)
  })
})

function functionalRowKey(row: FunctionalDraft): string {
  return String(row.originalKey ?? row.typeKey ?? '').trim()
}

function addFunctionalRow() {
  functionalQuery.value = ''
  const maxOrder = visibleFunctionalRows.value.reduce(
    (max, row) => Math.max(max, Number(row.sort_order) || 0),
    0,
  )
  functionalDraft.value.push({
    typeKey: '',
    label: '',
    requires_response_default: true,
    sla_business_days: '',
    sort_order: String(maxOrder + 10),
    is_active: true,
    show_in_public_form: true,
    archival_file_type_id: NONE_ARCHIVAL_FILE_TYPE,
    _clientId: `new-${Date.now()}`,
    _isNew: true,
  })
}

function addReceptionRow() {
  const maxOrder = visibleReceptionRows.value.reduce(
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

function removeFunctionalRow(row: FunctionalDraft) {
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
  const row = visibleReceptionRows.value[index]
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

function validateFunctionalKey(row: FunctionalDraft): string {
  let typeKey = String(row.typeKey ?? '').trim()
  if (!typeKey && row._isNew) {
    typeKey = slugFromLabel(row.label)
  }
  if (!typeKey && row.originalKey) {
    typeKey = String(row.originalKey).trim()
  }
  if (row._isNew && typeKey) {
    typeKey = ensureUniqueFunctionalKey(typeKey, row)
  }
  row.typeKey = typeKey
  return typeKey
}

function usedFunctionalKeys(excludingRow?: FunctionalDraft): Set<string> {
  const used = new Set<string>()
  for (const row of functionalDraft.value) {
    if (row._removed) {
      continue
    }
    if (excludingRow && row === excludingRow) {
      continue
    }
    const key = String(row.originalKey ?? row.typeKey ?? '').trim()
    if (key) {
      used.add(key)
    }
  }

  return used
}

function ensureUniqueFunctionalKey(base: string, row: FunctionalDraft): string {
  const used = usedFunctionalKeys(row)
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) {
    const tail = `_${suffix}`
    candidate = `${base.slice(0, Math.max(1, 64 - tail.length))}${tail}`
    suffix += 1
  }

  return candidate
}

function archivalFileTypeLabel(id: string): string {
  if (!id || id === NONE_ARCHIVAL_FILE_TYPE) {
    return 'Sin expediente'
  }

  return props.archivalFileTypes.find(type => String(type.id) === id)?.name ?? 'Sin expediente automático'
}

function responseShort(row: FunctionalDraft): string {
  if (!row.requires_response_default) {
    return 'Sin respuesta'
  }

  const days = String(row.sla_business_days ?? '').trim()

  return days ? `${days} días hábiles` : 'Sin plazo'
}

function audienceShort(row: FunctionalDraft): string {
  return row.show_in_public_form ? 'Formulario público' : 'Solo personal'
}

function validateAndSave() {
  if (props.kind === 'functional-types') {
    const active = visibleFunctionalRows.value
    if (active.length === 0) {
      toast.error('Añade al menos un tipo funcional.')
      return
    }
    for (const row of active) {
      if (!row.label.trim()) {
        toast.error('Cada tipo funcional debe tener etiqueta.')
        return
      }
      const typeKey = validateFunctionalKey(row)
      if (!/^[a-z0-9_-]+$/.test(typeKey)) {
        toast.error(`Clave no válida para «${row.label.trim()}». Use solo letras minúsculas, números, guion y guion bajo.`)
        return
      }
    }
    emit('saveFunctional', functionalDraft.value.map(row => ({ ...row })))
    return
  }

  const active = visibleReceptionRows.value
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
  emit('saveReception', receptionDraft.value.map(row => ({ ...row })))
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
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <h3 class="text-lg font-semibold tracking-tight">
          {{ catalogTitle }}
        </h3>
        <p class="max-w-3xl text-sm text-muted-foreground">
          {{ helperText }}
        </p>
      </div>
      <div v-if="canEdit" class="flex gap-2">
        <Button
          v-if="!editing"
          type="button"
          variant="warning"
          size="sm"
          @click="startEditing"
        >
          <Icon name="i-lucide-pencil" class="mr-1 h-4 w-4" />
          Editar
        </Button>
        <template v-else>
          <Button type="button" variant="outline" size="sm" :disabled="saving" @click="cancelEditing">
            Cancelar
          </Button>
          <Button type="button" variant="default" size="sm" :disabled="saving" @click="validateAndSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 h-4 w-4 animate-spin" />
            Guardar
          </Button>
        </template>
      </div>
    </div>

    <template v-if="kind === 'reception-media'">
      <div class="flex flex-col gap-2">
        <div
          v-for="(row, idx) in visibleReceptionRows"
          :key="`${row.value || 'new'}-${idx}`"
          class="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
        >
          <Icon name="i-lucide-inbox" class="size-4 shrink-0 text-muted-foreground" />
          <p v-if="!editing || !canEdit" class="min-w-0 flex-1 truncate text-sm font-medium">
            {{ row.label || 'Sin nombre' }}
          </p>
          <Input
            v-else
            v-model="row.label"
            class="h-9"
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
      </div>
      <p
        v-if="visibleReceptionRows.length === 0"
        class="rounded-xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
      >
        No hay medios de recepción configurados.
      </p>
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
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="relative w-full max-w-sm">
          <Icon name="i-lucide-search" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="functionalQuery"
            class="h-9 pl-9"
            placeholder="Buscar por nombre…"
          />
        </div>
        <p v-if="functionalQuery.trim()" class="text-xs text-muted-foreground">
          {{ displayedFunctionalRows.length }} de {{ visibleFunctionalRows.length }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-if="!editing"
          class="hidden px-4 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_9rem_4rem_6.5rem] md:gap-4"
        >
          <span>Nombre</span>
          <span>Respuesta</span>
          <span>Expediente</span>
          <span>Quién lo elige</span>
          <span>Orden</span>
          <span>Estado</span>
        </div>
        <article
          v-for="row in displayedFunctionalRows"
          :key="row._clientId || functionalRowKey(row)"
          class="rounded-xl border bg-card px-4 py-3"
          :class="!editing && !row.is_active ? 'opacity-70' : ''"
        >
          <div
            v-if="!editing"
            class="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_9rem_4rem_6.5rem] md:items-center md:gap-4"
          >
            <p class="truncate font-medium">
              {{ row.label || 'Sin nombre' }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              <span class="md:hidden">Respuesta · </span>{{ responseShort(row) }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              <span class="md:hidden">Expediente · </span>{{ archivalFileTypeLabel(row.archival_file_type_id) }}
            </p>
            <p class="truncate text-sm text-muted-foreground">
              {{ audienceShort(row) }}
            </p>
            <p class="text-sm tabular-nums text-muted-foreground">
              <span class="md:hidden">Orden · </span>{{ row.sort_order || '0' }}
            </p>
            <p class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <span
                class="size-2 rounded-full"
                :class="row.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
              />
              {{ row.is_active ? 'En uso' : 'Oculto' }}
            </p>
          </div>

          <div
            v-else
            class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(8rem,0.8fr)_minmax(0,1.1fr)_auto_5.5rem_auto_auto] lg:items-center"
          >
            <Input
              v-model="row.label"
              class="h-9"
              placeholder="Nombre que verá la persona"
            />
            <div class="flex items-center gap-2">
              <label class="flex shrink-0 items-center gap-2 text-sm">
                <Checkbox v-model="row.requires_response_default" bare />
                Respuesta
              </label>
              <Input
                v-model="row.sla_business_days"
                type="number"
                min="1"
                max="365"
                class="h-9 w-20"
                :disabled="!row.requires_response_default"
                placeholder="Días"
              />
            </div>
            <Select v-model="row.archival_file_type_id">
              <SelectTrigger class="h-9 w-full">
                <SelectValue placeholder="Sin expediente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE_ARCHIVAL_FILE_TYPE">
                  Sin expediente
                </SelectItem>
                <SelectItem
                  v-for="fileType in archivalFileTypes"
                  :key="fileType.id"
                  :value="String(fileType.id)"
                >
                  {{ fileType.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <label class="flex items-center gap-2 text-sm whitespace-nowrap">
              <Checkbox v-model="row.show_in_public_form" bare />
              Público
            </label>
            <Input
              v-model="row.sort_order"
              type="number"
              min="0"
              class="h-9"
              aria-label="Orden"
            />
            <label class="flex items-center gap-2 text-sm whitespace-nowrap">
              <Checkbox v-model="row.is_active" bare />
              En uso
            </label>
            <Button
              v-if="canEdit"
              type="button"
              variant="ghost"
              size="icon"
              class="justify-self-end"
              :aria-label="`Eliminar ${row.label || 'tipo funcional'}`"
              @click="removeFunctionalRow(row)"
            >
              <Icon name="i-lucide-trash-2" class="size-4" />
            </Button>
          </div>
        </article>
      </div>

      <p
        v-if="displayedFunctionalRows.length === 0"
        class="rounded-xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
      >
        {{ visibleFunctionalRows.length === 0 ? 'No hay tipos funcionales configurados.' : 'Ningún tipo coincide con la búsqueda.' }}
      </p>

      <Button
        v-if="editing && canEdit"
        type="button"
        variant="outline"
        size="sm"
        @click="addFunctionalRow"
      >
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        Añadir tipo funcional
      </Button>
    </template>
  </div>
</template>
