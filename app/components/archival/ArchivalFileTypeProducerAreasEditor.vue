<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { ArchivalFileType, ArchivalFileTypeProducerAreaDraft } from '~/types/archival-file'
import type { TrdTableRow } from '~/types/archival-trd'
import {
  archivalFileTypeBasePayload,
  mapProducerAreaDrafts,
  producerAreasSavePayload,
} from '~/utils/archival-file-type-payload'

const PAGE_SIZE = 8

function emptyRow(sortOrder: number): ArchivalFileTypeProducerAreaDraft {
  return {
    org_unit_id: null,
    trd_table_id: null,
    doc_series_id: null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    sort_order: sortOrder,
  }
}

const props = defineProps<{
  fileType: ArchivalFileType
}>()

const emit = defineEmits<{
  updated: [type: ArchivalFileType]
}>()

const archivalApi = useArchivalFileApi()
const trdApi = useTrdApi()
const orgApi = useOrgStructureApi()
const route = useRoute()
const router = useRouter()

const orgUnits = ref<OrgUnitRow[]>([])
const trdTables = ref<TrdTableRow[]>([])
const loadingCatalogs = ref(true)
const saving = ref(false)
const search = ref('')
const page = ref(1)
const view = ref<'list' | 'form'>('list')
const editingIndex = ref<number | null>(null)
const draft = ref<ArchivalFileTypeProducerAreaDraft>(emptyRow(0))
const pendingDeleteIndex = ref<number | null>(null)

const rows = computed(() => mapProducerAreaDrafts(props.fileType.producer_areas))

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return rows.value.map((row, index) => ({ row, index }))
  }

  return rows.value
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const haystack = [
        row.org_unit?.name,
        row.org_unit?.code,
        row.doc_series?.code,
        row.doc_series?.name,
        row.doc_subseries?.code,
        row.doc_subseries?.name,
        row.doc_document_type?.code,
        row.doc_document_type?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))

const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE

  return filteredRows.value.slice(start, start + PAGE_SIZE)
})

const formTitle = computed(() =>
  editingIndex.value == null ? 'Agregar área productora' : 'Editar área productora',
)

const excludeOrgUnitIds = computed(() =>
  rows.value
    .filter((_, index) => index !== editingIndex.value)
    .map(row => row.org_unit_id)
    .filter((id): id is number => id != null),
)

function areaLabel(row: ArchivalFileTypeProducerAreaDraft): string {
  return row.org_unit?.name ?? (row.org_unit_id ? `Área #${row.org_unit_id}` : 'Sin área')
}

function catalogLabel(code?: string | null, name?: string | null): string {
  if (code && name) {
    return `${code} — ${name}`
  }

  return code || name || '—'
}

watch(search, () => {
  page.value = 1
})

watch(
  () => props.fileType.producer_areas,
  () => {
    if (page.value > totalPages.value) {
      page.value = totalPages.value
    }
  },
)

function openCreate() {
  editingIndex.value = null
  draft.value = emptyRow(rows.value.length)
  view.value = 'form'
}

function openEdit(index: number) {
  const row = rows.value[index]
  if (!row) {
    return
  }

  editingIndex.value = index
  draft.value = { ...row }
  view.value = 'form'
}

function backToList() {
  view.value = 'list'
  editingIndex.value = null
  draft.value = emptyRow(0)

  if (route.query.view) {
    const query = { ...route.query }
    delete query.view
    router.replace({ query })
  }
}

async function persist(nextRows: ArchivalFileTypeProducerAreaDraft[], successMessage: string) {
  saving.value = true

  try {
    const res = await archivalApi.saveFileType({
      ...archivalFileTypeBasePayload(props.fileType),
      producer_areas: producerAreasSavePayload(nextRows),
    }, props.fileType.id)

    toast.success(successMessage)
    emit('updated', res.data)
    backToList()
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo guardar el área.')
  }
  finally {
    saving.value = false
  }
}

async function saveDraft() {
  if (draft.value.org_unit_id == null || draft.value.doc_series_id == null || draft.value.doc_subseries_id == null) {
    toast.error('Complete área, serie y subserie.')
    return
  }

  const nextRows = [...rows.value]

  if (editingIndex.value == null) {
    nextRows.push({ ...draft.value, sort_order: nextRows.length })
  }
  else {
    nextRows[editingIndex.value] = { ...draft.value, sort_order: editingIndex.value }
  }

  await persist(
    nextRows,
    editingIndex.value == null ? 'Área productora agregada.' : 'Área productora actualizada.',
  )
}

async function confirmDelete() {
  const index = pendingDeleteIndex.value
  pendingDeleteIndex.value = null

  if (index == null) {
    return
  }

  const nextRows = rows.value.filter((_, rowIndex) => rowIndex !== index)
  await persist(nextRows, 'Área productora eliminada.')
}

async function loadCatalogs() {
  loadingCatalogs.value = true

  try {
    const [units, tables] = await Promise.all([
      orgApi.fetchUnits({ activeOnly: true }),
      trdApi.fetchTables(),
    ])

    orgUnits.value = units
    trdTables.value = tables
  }
  catch {
    toast.error('No se pudieron cargar las áreas y tablas TRD.')
  }
  finally {
    loadingCatalogs.value = false
  }
}

onMounted(() => {
  void loadCatalogs()
})

defineExpose({
  openCreate,
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="view === 'list'" class="space-y-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium">
            Áreas productoras y TRD
            <Badge v-if="rows.length > 0" variant="secondary" class="ml-2 align-middle">
              {{ rows.length }}
            </Badge>
          </p>
          <p class="text-xs text-muted-foreground">
            Un mismo tipo puede usarse en muchas áreas. Consulte el listado y agregue o edite cada una por separado.
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:max-w-xl lg:flex-1">
          <div class="relative min-w-0 flex-1">
            <Icon name="i-lucide-search" class="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
            <Input
              v-model="search"
              class="pl-9"
              placeholder="Buscar por área, serie o subserie…"
            />
          </div>
          <Button type="button" size="sm" class="shrink-0" :disabled="saving || loadingCatalogs" @click="openCreate">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Agregar área
          </Button>
        </div>
      </div>

      <div
        v-if="rows.length === 0"
        class="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
      >
        <p class="text-sm text-muted-foreground">
          Sin áreas productoras. El tipo podrá usarse en cualquier área hasta que configure las que correspondan.
        </p>
        <Button type="button" variant="outline" size="sm" :disabled="saving || loadingCatalogs" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-4" />
          Agregar la primera
        </Button>
      </div>

      <div v-else-if="filteredRows.length === 0" class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay áreas que coincidan con la búsqueda.
      </div>

      <div v-else class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Área productora</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Subserie</TableHead>
              <TableHead>Tipo documental</TableHead>
              <TableHead class="w-[1%] text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="{ row, index } in pagedRows" :key="row.id ?? `area-${index}`">
              <TableCell class="font-medium">
                {{ areaLabel(row) }}
              </TableCell>
              <TableCell class="text-sm">
                {{ catalogLabel(row.doc_series?.code, row.doc_series?.name) }}
              </TableCell>
              <TableCell class="text-sm">
                {{ catalogLabel(row.doc_subseries?.code, row.doc_subseries?.name) }}
              </TableCell>
              <TableCell class="text-sm">
                {{ catalogLabel(row.doc_document_type?.code, row.doc_document_type?.name) }}
              </TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    :disabled="saving"
                    @click="openEdit(index)"
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    :disabled="saving"
                    @click="pendingDeleteIndex = index"
                  >
                    <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-if="filteredRows.length > PAGE_SIZE" class="flex items-center justify-between gap-3 text-sm">
        <p class="text-muted-foreground">
          Página {{ page }} de {{ totalPages }}
        </p>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="page -= 1"
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="page += 1"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button type="button" variant="ghost" size="sm" class="-ml-2" :disabled="saving" @click="backToList">
            <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
            Volver al listado
          </Button>
          <h2 class="mt-1 text-base font-semibold">
            {{ formTitle }}
          </h2>
          <p class="text-xs text-muted-foreground">
            Configure la TRD de una sola área. El resto permanece en el listado.
          </p>
        </div>
      </div>

      <div v-if="loadingCatalogs" class="py-8 text-center text-sm text-muted-foreground">
        Cargando catálogos…
      </div>

      <ArchivalFileTypeProducerAreaForm
        v-else
        v-model="draft"
        :org-units="orgUnits"
        :trd-tables="trdTables"
        :disabled="saving"
        :exclude-org-unit-ids="excludeOrgUnitIds"
      />

      <div class="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" :disabled="saving" @click="backToList">
          Cancelar
        </Button>
        <Button type="button" :disabled="saving || loadingCatalogs" @click="saveDraft">
          {{ saving ? 'Guardando…' : (editingIndex == null ? 'Agregar área' : 'Guardar área') }}
        </Button>
      </div>
    </div>

    <AlertDialog :open="pendingDeleteIndex != null" @update:open="pendingDeleteIndex = $event ? pendingDeleteIndex : null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitar área productora</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la configuración TRD de esta área en el tipo. Los documentos obligatorios asociados a esa área también se quitarán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="saving">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction :disabled="saving" @click="confirmDelete">
            Quitar área
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
