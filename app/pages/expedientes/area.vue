<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode, ArchivalPhaseTarget } from '~/types/archival-file'
import { ARCHIVAL_PHASE_TARGET_LABELS } from '~/types/archival-file'
import { filterArchivalAreaTreeToFoldersWithDocuments } from '~/utils/archival-area-repository'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_area_ver',
})

const route = useRoute()
const archivalApi = useArchivalFileApi()
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const orgUnitId = ref<number | null>(null)
const loading = ref(false)
const tree = ref<ArchivalFileTreeNode | null>(null)
const repositoryError = ref('')
const accessDenied = ref(false)
const showAllTrdFolders = ref(true)
const archive = ref<Extract<ArchivalPhaseTarget, 'management' | 'central' | 'historical'>>('management')

const archiveOptions = [
  { value: 'management' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.management },
  { value: 'central' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.central },
  { value: 'historical' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.historical },
]

const orgUnitSelectOptions = computed(() =>
  orgUnits.value.map(unit => ({
    value: unit.id,
    label: unit.name,
  })),
)

const emptyTreeMessage = computed(() => {
  if (repositoryError.value) {
    return repositoryError.value
  }

  if (orgUnits.value.length === 0) {
    return 'No hay áreas asignadas para consultar el repositorio. La TRD de otras áreas está restringida a su personal.'
  }

  return 'Seleccione un área para consultar su documentación.'
})

const displayTree = computed(() => {
  if (!tree.value) {
    return null
  }

  if (showAllTrdFolders.value) {
    return tree.value
  }

  return filterArchivalAreaTreeToFoldersWithDocuments(tree.value)
})

const selectedOrgUnitNumericId = computed(() => orgUnitId.value)

const focusArchivalFileId = computed(() => {
  const value = Number(route.query.archival_file_id)

  return Number.isFinite(value) && value > 0 ? value : null
})

function fetchErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const e = error as Record<string, unknown>
  if (typeof e.statusCode === 'number') {
    return e.statusCode
  }

  if (typeof e.status === 'number') {
    return e.status
  }

  return null
}

async function loadOrgUnits() {
  try {
    orgUnits.value = await archivalApi.fetchAreaRepositoryOrgUnits()
  }
  catch {
    orgUnits.value = []
  }
}

async function loadRepository() {
  if (selectedOrgUnitNumericId.value == null) {
    tree.value = null
    repositoryError.value = ''
    accessDenied.value = false
    return
  }

  loading.value = true
  repositoryError.value = ''
  accessDenied.value = false

  try {
    tree.value = await archivalApi.fetchAreaRepository(selectedOrgUnitNumericId.value, archive.value)
  }
  catch (error) {
    tree.value = null
    const status = fetchErrorStatus(error)
    accessDenied.value = status === 403
    repositoryError.value = messageFromFetchError(
      error,
      accessDenied.value
        ? 'No tiene permiso para consultar el repositorio de otra área. La TRD y el archivo de gestión están restringidos al área a la que pertenece.'
        : 'No se pudo cargar el repositorio del área.',
    )
    toast.error(repositoryError.value)
  }
  finally {
    loading.value = false
  }
}

function onArchiveChange(value: unknown) {
  if (value === 'central' || value === 'historical' || value === 'management') {
    archive.value = value
    void loadRepository()
  }
}

watch(orgUnitId, () => {
  void loadRepository()
})

onMounted(async () => {
  await loadOrgUnits()
  const fromQuery = Number(route.query.org_unit_id)
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    orgUnitId.value = fromQuery
    return
  }

  if (orgUnits.value.length === 1) {
    orgUnitId.value = orgUnits.value[0].id
  }
})
</script>

<template>
  <div class="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col gap-4 overflow-hidden">
    <div class="shrink-0">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Repositorio por área
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          {{ archive === 'management'
            ? 'Archivo de gestión: documentos vigentes del área. En un tipo documental puede crear una carpeta, cargar archivos con folios y, si la serie TRD lo permite, publicarlos en biblioteca. Tras el plazo de retención en gestión, el expediente se traslada al archivo central (y luego al histórico).'
            : archive === 'central'
              ? 'Archivo central: expedientes ya trasladados desde gestión. Consulta y descarga; no se cargan documentos nuevos aquí.'
              : 'Archivo histórico: expedientes con valor permanente. Consulta y descarga; no se cargan documentos nuevos aquí.' }}
        </p>
      </div>
    </div>

    <Card class="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader class="shrink-0 px-6 pt-6 pb-4">
        <div class="flex flex-wrap items-stretch gap-3">
          <div class="flex min-w-[18rem] flex-1 flex-col justify-end gap-2 md:max-w-md">
            <Label for="area-repository-org-unit">Área productora</Label>
            <ArchivalSingleMultiselect
              id="area-repository-org-unit"
              v-model="orgUnitId"
              coerce-number
              :options="orgUnitSelectOptions"
              placeholder="Buscar y seleccionar un área…"
              no-options-text="No hay áreas asignadas"
              no-results-text="Sin coincidencias. Solo aparecen las áreas a las que tiene acceso."
            />
          </div>
          <div class="flex flex-col justify-end gap-2">
            <Label>Archivo</Label>
            <Select :model-value="archive" @update:model-value="onArchiveChange">
              <SelectTrigger class="h-9 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in archiveOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col justify-end">
            <Button
              variant="secondary"
              class="h-9"
              :disabled="!orgUnitId || loading"
              @click="loadRepository"
            >
              Actualizar
            </Button>
          </div>
          <label
            class="flex min-h-9 min-w-[16rem] flex-1 cursor-pointer items-center gap-3 rounded-md border px-3"
            :class="!orgUnitId ? 'cursor-not-allowed opacity-60' : ''"
          >
            <Switch
              id="area-show-all-trd-folders"
              :model-value="showAllTrdFolders"
              :disabled="!orgUnitId"
              @update:model-value="showAllTrdFolders = $event"
            />
            <span class="min-w-0 space-y-0.5">
              <span class="block text-sm font-medium leading-none">
                Todas las carpetas TRD
              </span>
              <span class="block text-xs text-muted-foreground leading-snug">
                {{ showAllTrdFolders
                  ? 'Incluye series, subseries y tipos aunque no tengan documentos.'
                  : 'Solo series, subseries y tipos que contienen documentos.' }}
              </span>
            </span>
          </label>
        </div>
      </CardHeader>
      <CardContent class="flex min-h-0 flex-1 flex-col p-0 sm:p-0">
        <ArchivalFileAreaRepositoryBrowser
          :tree="displayTree"
          :org-unit-id="selectedOrgUnitNumericId ?? 0"
          :loading="loading"
          :allow-upload="archive === 'management' && !accessDenied"
          :focus-archival-file-id="focusArchivalFileId"
          :empty-tree-message="emptyTreeMessage"
          :empty-is-restricted="accessDenied"
          contained
          @uploaded="loadRepository"
        />
      </CardContent>
    </Card>
  </div>
</template>
