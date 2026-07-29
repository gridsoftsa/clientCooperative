<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_ver',
})

const route = useRoute()
const router = useRouter()
const catalogApi = useArchivalCatalogApi()

const seriesId = computed(() => Number(route.params.seriesId))

const seriesListPath = computed(() => {
  const orgUnitId = series.value?.org_unit_id
  if (orgUnitId != null) {
    return `/settings/archival/catalog/series?org_unit_id=${orgUnitId}`
  }

  return '/settings/archival/catalog/series'
})

const series = ref<DocSeriesRow | null>(null)
const rows = ref<DocSubseriesRow[]>([])
const loading = ref(false)
const deactivatingRow = ref<DocSubseriesRow | null>(null)
const cascadeDialogOpen = ref(false)
const savingDeactivate = ref(false)

const { $api } = useNuxtApp()

async function load() {
  if (!Number.isFinite(seriesId.value) || seriesId.value <= 0) {
    toast.error('Serie no válida')
    await router.push('/settings/archival/catalog/series')
    return
  }

  loading.value = true
  try {
    const [seriesRow, subseries] = await Promise.all([
      catalogApi.fetchSeriesById(seriesId.value),
      catalogApi.fetchSubseries(seriesId.value),
    ])
    series.value = seriesRow
    rows.value = subseries
  } catch {
    toast.error('No se pudieron cargar las subseries')
    series.value = null
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openDeactivateDialog(row: DocSubseriesRow) {
  deactivatingRow.value = row
  const activeTypes = row.active_document_types_count ?? 0
  if (activeTypes > 0) {
    cascadeDialogOpen.value = true
    return
  }

  void deactivateSubseries(row, false)
}

function cancelDeactivateDialog() {
  cascadeDialogOpen.value = false
  deactivatingRow.value = null
}

async function deactivateSubseries(row: DocSubseriesRow, cascade: boolean) {
  savingDeactivate.value = true
  try {
    await $api(`/archival/catalog/subseries/${row.id}`, {
      method: 'PUT',
      body: {
        is_active: false,
        ...(cascade ? { cascade_deactivate_active_children: true } : {}),
      },
    })
    toast.success('Subserie inactivada')
    await load()
  }
  catch (e: unknown) {
    const err = e as { data?: { errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? 'No se pudo inactivar la subserie')
  }
  finally {
    savingDeactivate.value = false
    cancelDeactivateDialog()
  }
}

function confirmCascadeDeactivate() {
  if (deactivatingRow.value) {
    void deactivateSubseries(deactivatingRow.value, true)
  }
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-fit -ml-2 px-2"
            @click="router.push(seriesListPath)"
          >
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Series
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Subseries documentales
          </h2>
          <p v-if="series" class="text-muted-foreground leading-relaxed max-w-3xl">
            Serie
            <span class="font-mono text-sm">{{ series.code }}</span>
            — {{ series.name }}.
            El siguiente nivel del cuadro de clasificación son los tipos documentales por subserie.
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/archival')">
            Resumen TRD
          </Button>
          <PermissionGate permission="trd_catalogo_editar">
            <Button @click="router.push(catalogApi.subseriesCreatePath(seriesId))">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva subserie
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Subseries
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Segundo nivel del catálogo documental institucional (módulo TRD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center text-muted-foreground leading-relaxed">
            No hay subseries en esta serie.
          </div>
          <div v-else class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead class="text-right">
                    Tipos doc.
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in rows" :key="r.id">
                  <TableCell class="font-mono text-sm">
                    {{ r.code }}
                  </TableCell>
                  <TableCell>{{ r.name }}</TableCell>
                  <TableCell class="text-right tabular-nums text-muted-foreground">
                    {{ r.document_types_count ?? 0 }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="r.is_active ? 'default' : 'secondary'">
                      {{ r.is_active ? 'Activa' : 'Inactiva' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right !whitespace-normal">
                    <div class="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        @click="router.push(catalogApi.documentTypesListPath(seriesId, r.id))"
                      >
                        Tipos documentales
                      </Button>
                      <PermissionGate permission="trd_catalogo_editar">
                        <Button
                          variant="warning"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="router.push(`/settings/archival/catalog/series/${seriesId}/subseries/${r.id}/edit`)"
                        >
                          Editar
                        </Button>
                        <Button
                          v-if="r.is_active"
                          type="button"
                          variant="destructive"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="openDeactivateDialog(r)"
                        >
                          <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                          Inactivar
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <AlertDialog v-model:open="cascadeDialogOpen">
      <AlertDialogContent class="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Inactivar subserie</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="deactivatingRow">
              La subserie <strong>{{ deactivatingRow.name }}</strong> tiene
              <strong>{{ deactivatingRow.active_document_types_count ?? 0 }}</strong>
              tipo(s) documental(es) activo(s).
              ¿Desea inactivarlos también antes de inactivar la subserie?
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel :disabled="savingDeactivate" @click="cancelDeactivateDialog">
            Cancelar
          </AlertDialogCancel>
          <Button :disabled="savingDeactivate" @click="confirmCascadeDeactivate">
            Inactivar tipos y subserie
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsLayout>
</template>
