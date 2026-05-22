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

const series = ref<DocSeriesRow | null>(null)
const rows = ref<DocSubseriesRow[]>([])
const loading = ref(false)

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
            @click="router.push('/settings/archival/catalog/series')"
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
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead class="text-right">
                    Tipos doc.
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="w-[200px]" />
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
                  <TableCell>
                    <div class="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="router.push(catalogApi.documentTypesListPath(seriesId, r.id))"
                      >
                        Tipos
                      </Button>
                      <PermissionGate permission="trd_catalogo_editar">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="router.push(`/settings/archival/catalog/series/${seriesId}/subseries/${r.id}/edit`)"
                        >
                          Editar
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
  </SettingsLayout>
</template>
