<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type { DocSeriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_ver',
})

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const catalogApi = useArchivalCatalogApi()

const producerUnits = ref<OrgUnitOption[]>([])
const loadingUnits = ref(false)
const selectedOrgUnitId = ref<number | null>(null)

const rows = ref<DocSeriesRow[]>([])
const loadingSeries = ref(false)

const selectedUnit = computed(() =>
  producerUnits.value.find(u => u.id === selectedOrgUnitId.value) ?? null,
)

const producerUnitOptions = computed(() =>
  producerUnits.value.map(u => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  })),
)

const createSeriesPath = computed(() => {
  if (selectedOrgUnitId.value == null) {
    return '/settings/archival/catalog/series/create'
  }
  return `/settings/archival/catalog/series/create?org_unit_id=${selectedOrgUnitId.value}`
})

function orgUnitIdFromRoute(): number | null {
  const id = Number(route.query.org_unit_id)
  return Number.isFinite(id) && id > 0 ? id : null
}

function applyRouteOrgUnitId(): void {
  const fromRoute = orgUnitIdFromRoute()
  if (fromRoute == null) {
    return
  }
  if (producerUnits.value.some(u => u.id === fromRoute)) {
    selectedOrgUnitId.value = fromRoute
  }
}

async function fetchProducerUnits() {
  loadingUnits.value = true
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    producerUnits.value = (res.data ?? []).filter(u => u.is_document_producer)
    applyRouteOrgUnitId()
    if (selectedOrgUnitId.value == null && producerUnits.value.length === 1) {
      selectedOrgUnitId.value = producerUnits.value[0].id
    }
  } catch {
    toast.error('No se pudieron cargar las áreas productoras')
    producerUnits.value = []
  } finally {
    loadingUnits.value = false
  }
}

async function fetchSeries() {
  if (selectedOrgUnitId.value == null) {
    rows.value = []
    return
  }
  loadingSeries.value = true
  try {
    rows.value = await catalogApi.fetchSeries(200, selectedOrgUnitId.value)
  } catch {
    toast.error('No se pudo cargar las series del área')
    rows.value = []
  } finally {
    loadingSeries.value = false
  }
}

watch(selectedOrgUnitId, (orgUnitId) => {
  const query = orgUnitId != null ? { org_unit_id: String(orgUnitId) } : {}
  router.replace({ path: route.path, query })
  fetchSeries()
})

watch(
  () => route.query.org_unit_id,
  () => {
    applyRouteOrgUnitId()
  },
)

onMounted(async () => {
  await fetchProducerUnits()
  await fetchSeries()
})
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
            @click="router.push('/settings/archival')"
          >
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            TRD y archivo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Catálogo — Series documentales
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-3xl">
            Cada serie pertenece a un área productora documental. Elija el área y administre su cuadro de clasificación (serie → subserie → tipo).
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <PermissionGate permission="trd_catalogo_editar">
            <Button
              :disabled="selectedOrgUnitId == null"
              @click="router.push(createSeriesPath)"
            >
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva serie
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div class="w-full min-w-0 space-y-2 sm:max-w-md shrink-0">
              <Label for="producer-area" class="leading-snug">Área productora documental</Label>
              <div class="catalog-producer-area-ms w-full">
                <Multiselect
                  id="producer-area"
                  v-model="selectedOrgUnitId"
                  mode="single"
                  :object="false"
                  :options="producerUnitOptions"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :can-clear="true"
                  :disabled="loadingUnits || producerUnits.length === 0"
                  placeholder="Seleccione un área…"
                  no-options-text="No hay áreas productoras"
                  no-results-text="Sin coincidencias"
                  class="multiselect-producer-area w-full"
                />
              </div>
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <CardTitle class="leading-snug">
                Series por área
              </CardTitle>
              <CardDescription class="leading-relaxed">
                Solo se listan las series del área seleccionada (misma relación que la tabla TRD del área).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="loadingUnits" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="producerUnits.length === 0" class="py-8 text-center text-muted-foreground">
            No hay áreas marcadas como productoras documentales. Configúrelas en
            <NuxtLink to="/settings/organizational-structure/units" class="underline">
              estructura organizacional → unidades
            </NuxtLink>.
          </div>
          <div v-else-if="selectedOrgUnitId == null" class="py-8 text-center text-muted-foreground">
            Seleccione un área productora para ver y administrar sus series.
          </div>
          <div v-else-if="loadingSeries" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center space-y-3">
            <p class="text-muted-foreground">
              No hay series para
              <strong v-if="selectedUnit">{{ selectedUnit.name }}</strong>.
            </p>
            <PermissionGate permission="trd_catalogo_editar">
              <Button @click="router.push(createSeriesPath)">
                <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                Crear primera serie
              </Button>
            </PermissionGate>
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <p v-if="selectedUnit" class="text-sm text-muted-foreground px-4 py-2 border-b bg-muted/30">
              Área: <span class="font-medium text-foreground">{{ selectedUnit.name }}</span>
              <span class="font-mono">({{ selectedUnit.code }})</span>
              — {{ rows.length }} serie(s)
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead class="text-right">
                    Subseries
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
                    {{ r.subseries_count ?? 0 }}
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
                        @click="router.push(catalogApi.subseriesListPath(r.id))"
                      >
                        Subseries
                      </Button>
                      <PermissionGate permission="trd_catalogo_editar">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="router.push(`/settings/archival/catalog/series/${r.id}/edit`)"
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

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.catalog-producer-area-ms :deep(.multiselect-producer-area) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.375rem;
  --ms-radius: 0.375rem;
  --ms-border-color: hsl(var(--input));
  --ms-bg: hsl(var(--background));
  --ms-py: 0.75rem;
  --ms-px: 0.75rem;
  --ms-dropdown-radius: 0.375rem;
  min-height: 3rem;
  width: 100%;
  min-width: 0;
  border-color: hsl(var(--input));
  background-color: hsl(var(--background));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.catalog-producer-area-ms :deep(.multiselect-producer-area.is-active) {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--ring) / 0.5);
}

.catalog-producer-area-ms :deep(.multiselect-producer-area .multiselect-wrapper) {
  min-height: 3rem;
  align-items: center;
}

.catalog-producer-area-ms :deep(.multiselect-producer-area .multiselect-single-label),
.catalog-producer-area-ms :deep(.multiselect-producer-area .multiselect-placeholder) {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  line-height: 1.375rem;
}

.catalog-producer-area-ms :deep(.multiselect-producer-area .multiselect-caret) {
  margin-right: 0.75rem;
}
</style>
