<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

interface DocSeriesRow {
  id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  subseries_count?: number
}

const rows = ref<DocSeriesRow[]>([])
const loading = ref(false)

async function fetchSeries() {
  loading.value = true
  try {
    const res = await $api<{ data: DocSeriesRow[]; meta: { total: number } }>('/archival/catalog/series', {
      query: { per_page: 200 },
    })
    rows.value = res.data
  } catch {
    toast.error('No se pudo cargar el catálogo de series')
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSeries()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Catálogo — Series documentales
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-3xl">
            Las series son el primer nivel del cuadro de clasificación. Desde aquí puede continuar con subseries y tipos documentales vía API o pantallas que agreguemos en siguientes entregas.
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/archival')">
            Resumen TRD
          </Button>
          <PermissionGate permission="trd_catalogo_editar">
            <Button @click="router.push('/settings/archival/catalog/series/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva serie
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Series
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Listado paginado desde el API (<code class="rounded bg-muted px-1 py-0.5 text-xs">GET /archival/catalog/series</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center text-muted-foreground">
            No hay series registradas.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in rows" :key="r.id">
                  <TableCell class="font-mono text-sm">
                    {{ r.code }}
                  </TableCell>
                  <TableCell>{{ r.name }}</TableCell>
                  <TableCell>
                    <Badge :variant="r.is_active ? 'default' : 'secondary'">
                      {{ r.is_active ? 'Activa' : 'Inactiva' }}
                    </Badge>
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
