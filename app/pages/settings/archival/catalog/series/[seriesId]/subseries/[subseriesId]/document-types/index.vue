<script setup lang="ts">
import { toast } from 'vue-sonner'
import { formatAllowedSupportLabels } from '~/constants/archival-document-support'
import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_ver',
})

const route = useRoute()
const router = useRouter()
const catalogApi = useArchivalCatalogApi()
const { $api } = useNuxtApp()

const seriesId = computed(() => Number(route.params.seriesId))
const subseriesId = computed(() => Number(route.params.subseriesId))

const series = ref<DocSeriesRow | null>(null)
const subseries = ref<DocSubseriesRow | null>(null)
const rows = ref<DocDocumentTypeRow[]>([])
const loading = ref(false)
const deactivatingRow = ref<DocDocumentTypeRow | null>(null)
const deactivateDialogOpen = ref(false)
const savingDeactivate = ref(false)

async function load() {
  if (
    !Number.isFinite(seriesId.value) || seriesId.value <= 0
    || !Number.isFinite(subseriesId.value) || subseriesId.value <= 0
  ) {
    toast.error('Ruta de catálogo no válida')
    await router.push('/settings/archival/catalog/series')
    return
  }

  loading.value = true
  try {
    const [seriesRow, subRow, types] = await Promise.all([
      catalogApi.fetchSeriesById(seriesId.value),
      catalogApi.fetchSubseriesById(subseriesId.value),
      catalogApi.fetchDocumentTypes(subseriesId.value),
    ])
    if (subRow.doc_series_id !== seriesId.value) {
      toast.error('La subserie no pertenece a esta serie')
      await router.push(catalogApi.subseriesListPath(seriesId.value))
      return
    }
    series.value = seriesRow
    subseries.value = subRow
    rows.value = types
  } catch {
    toast.error('No se pudieron cargar los tipos documentales')
    series.value = null
    subseries.value = null
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openDeactivateDialog(row: DocDocumentTypeRow) {
  deactivatingRow.value = row
  deactivateDialogOpen.value = true
}

function cancelDeactivateDialog() {
  deactivateDialogOpen.value = false
  deactivatingRow.value = null
}

async function confirmDeactivate() {
  const row = deactivatingRow.value
  if (!row) {
    return
  }

  savingDeactivate.value = true
  try {
    await $api(`/archival/catalog/document-types/${row.id}`, {
      method: 'PUT',
      body: { is_active: false },
    })
    toast.success('Tipo documental inactivado')
    await load()
  }
  catch (e: unknown) {
    const err = e as { data?: { errors?: Record<string, string[]>; message?: string } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? 'No se pudo inactivar el tipo documental')
  }
  finally {
    savingDeactivate.value = false
    cancelDeactivateDialog()
  }
}

onMounted(load)
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
            @click="router.push(catalogApi.subseriesListPath(seriesId))"
          >
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Subseries
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Tipos documentales
          </h2>
          <p v-if="series && subseries" class="text-muted-foreground leading-relaxed max-w-3xl">
            Serie <span class="font-mono text-sm">{{ series.code }}</span>
            → subserie <span class="font-mono text-sm">{{ subseries.code }}</span>
            — {{ subseries.name }}.
            Los tiempos de retención se asocian en las versiones de la tabla TRD del área productora.
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <PermissionGate permission="trd_catalogo_editar">
            <Button @click="router.push(catalogApi.documentTypesCreatePath(seriesId, subseriesId))">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nuevo tipo documental
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Tipos documentales
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Tercer nivel del cuadro de clasificación; unidad mínima para reglas de retención en TRD.
            La inactivación no elimina el registro; deja de usarse en radicación y nuevas asociaciones TRD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center text-muted-foreground leading-relaxed">
            No hay tipos documentales en esta subserie.
          </div>
          <div v-else class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Soporte</TableHead>
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
                  <TableCell class="text-muted-foreground">
                    {{ formatAllowedSupportLabels(r.allowed_support) }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="r.is_active ? 'default' : 'secondary'">
                      {{ r.is_active ? 'Activo' : 'Inactivo' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right !whitespace-normal">
                    <div class="flex flex-wrap justify-end gap-1">
                      <PermissionGate permission="trd_catalogo_editar">
                        <Button
                          variant="warning"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="router.push(`/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types/${r.id}/edit`)"
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

    <AlertDialog v-model:open="deactivateDialogOpen">
      <AlertDialogContent class="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Inactivar tipo documental</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="deactivatingRow">
              ¿Confirma inactivar <strong>{{ deactivatingRow.name }}</strong>
              (<span class="font-mono">{{ deactivatingRow.code }}</span>)?
              El registro se conserva en el catálogo pero quedará inactivo.
              Si está vinculado a una versión de TRD o tiene reglas de retención, la operación no se permitirá.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel :disabled="savingDeactivate" @click="cancelDeactivateDialog">
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="savingDeactivate"
            @click="confirmDeactivate"
          >
            Inactivar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsLayout>
</template>
