<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode, ArchivalPhaseTarget } from '~/types/archival-file'
import { ARCHIVAL_PHASE_TARGET_LABELS } from '~/types/archival-file'
import { filterArchivalAreaTreeToFoldersWithDocuments } from '~/utils/archival-area-repository'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_area_ver',
})

const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const orgUnitId = ref<string | undefined>(undefined)
const loading = ref(false)
const tree = ref<ArchivalFileTreeNode | null>(null)
const showAllTrdFolders = ref(true)
const archive = ref<Extract<ArchivalPhaseTarget, 'management' | 'central' | 'historical'>>('management')

const archiveOptions = [
  { value: 'management' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.management },
  { value: 'central' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.central },
  { value: 'historical' as const, label: ARCHIVAL_PHASE_TARGET_LABELS.historical },
]

const displayTree = computed(() => {
  if (!tree.value) {
    return null
  }

  if (showAllTrdFolders.value) {
    return tree.value
  }

  return filterArchivalAreaTreeToFoldersWithDocuments(tree.value)
})

const selectedOrgUnitNumericId = computed(() => {
  if (!orgUnitId.value) {
    return null
  }

  const parsed = Number(orgUnitId.value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

async function loadOrgUnits() {
  try {
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
  }
  catch {
    orgUnits.value = []
  }
}

async function loadRepository() {
  if (selectedOrgUnitNumericId.value == null) {
    tree.value = null
    return
  }

  loading.value = true

  try {
    tree.value = await archivalApi.fetchAreaRepository(selectedOrgUnitNumericId.value, archive.value)
  }
  catch {
    toast.error('No se pudo cargar el repositorio del área.')
    tree.value = null
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

function onOrgUnitChange(value: unknown) {
  const next = value == null || value === '' ? undefined : String(value)
  orgUnitId.value = next
  void loadRepository()
}

onMounted(async () => {
  await loadOrgUnits()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Repositorio por área
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          {{ archive === 'management'
            ? 'Archivo de gestión: documentos vigentes del área. Tras el plazo de retención en gestión, el expediente se traslada al archivo central (y luego al histórico) desde el detalle del expediente.'
            : archive === 'central'
              ? 'Archivo central: expedientes ya trasladados desde gestión. Consulta y descarga; no se cargan documentos nuevos aquí.'
              : 'Archivo histórico: expedientes con valor permanente. Consulta y descarga; no se cargan documentos nuevos aquí.' }}
        </p>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-4">
        <div class="flex flex-wrap items-stretch gap-3">
          <div class="flex flex-col justify-end gap-2">
            <Label>Área productora</Label>
            <Select :model-value="orgUnitId" @update:model-value="onOrgUnitChange">
              <SelectTrigger class="h-9 w-72">
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in orgUnits"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
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
      <CardContent class="p-0 sm:p-0">
        <ArchivalFileAreaRepositoryBrowser
          :tree="displayTree"
          :org-unit-id="selectedOrgUnitNumericId ?? 0"
          :loading="loading"
          :allow-upload="archive === 'management'"
          @uploaded="loadRepository"
        />
      </CardContent>
    </Card>
  </div>
</template>
