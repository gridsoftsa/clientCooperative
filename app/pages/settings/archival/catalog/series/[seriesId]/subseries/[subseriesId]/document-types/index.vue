<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_ver',
})

const route = useRoute()
const router = useRouter()
const catalogApi = useArchivalCatalogApi()

const seriesId = computed(() => Number(route.params.seriesId))
const subseriesId = computed(() => Number(route.params.subseriesId))

const series = ref<DocSeriesRow | null>(null)
const subseries = ref<DocSubseriesRow | null>(null)
const rows = ref<DocDocumentTypeRow[]>([])
const loading = ref(false)

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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center text-muted-foreground leading-relaxed">
            No hay tipos documentales en esta subserie.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Soporte</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in rows" :key="r.id">
                  <TableCell class="font-mono text-sm">
                    {{ r.code }}
                  </TableCell>
                  <TableCell>{{ r.name }}</TableCell>
                  <TableCell class="text-muted-foreground">
                    {{ r.allowed_support || '—' }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="r.is_active ? 'default' : 'secondary'">
                      {{ r.is_active ? 'Activo' : 'Inactivo' }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="trd_catalogo_editar">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="router.push(`/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types/${r.id}/edit`)"
                      >
                        Editar
                      </Button>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
