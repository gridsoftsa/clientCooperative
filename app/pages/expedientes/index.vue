<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFile, ArchivalFileStatus } from '~/types/archival-file'
import { ARCHIVAL_FILE_STATUS_LABELS } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_ver',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const loading = ref(true)
const files = ref<ArchivalFile[]>([])
const search = ref('')
const STATUS_FILTER_ALL = 'all'
const PHASE_FILTER_ALL = 'all'
const statusFilter = ref<ArchivalFileStatus | typeof STATUS_FILTER_ALL>(STATUS_FILTER_ALL)
const phaseFilter = ref<string | typeof PHASE_FILTER_ALL>(PHASE_FILTER_ALL)
const fileTypeFilter = ref('')
const orgUnitFilter = ref('')
const metadataSearch = ref('')
const hasAlertsFilter = ref(false)
const createdFrom = ref('')
const createdTo = ref('')
const closedFrom = ref('')
const closedTo = ref('')
const advancedOpen = ref(false)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const fileTypes = ref<Array<{ id: number, name: string }>>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])

const canCreate = computed(() => hasPermission('expedientes_crear'))

const phaseOptions = [
  { value: 'management', label: 'Archivo de gestión' },
  { value: 'central', label: 'Archivo central' },
  { value: 'historical', label: 'Archivo histórico' },
  { value: 'disposed', label: 'Disposición final' },
]

async function loadFilters() {
  try {
    const [types, units] = await Promise.all([
      archivalApi.fetchFileTypes(),
      api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units'),
    ])
    fileTypes.value = types.map(type => ({ id: type.id, name: type.name }))
    orgUnits.value = units.data ?? []
  }
  catch {
    fileTypes.value = []
    orgUnits.value = []
  }
}

async function loadFiles(page = 1) {
  loading.value = true

  try {
    const query: Record<string, string | number> = { page, per_page: 15 }
    if (search.value.trim())
      query.search = search.value.trim()
    if (statusFilter.value !== STATUS_FILTER_ALL)
      query.status = statusFilter.value
    if (phaseFilter.value !== PHASE_FILTER_ALL)
      query.archival_phase = phaseFilter.value
    if (fileTypeFilter.value)
      query.archival_file_type_id = Number(fileTypeFilter.value)
    if (orgUnitFilter.value)
      query.org_unit_id = Number(orgUnitFilter.value)
    if (metadataSearch.value.trim())
      query.metadata_search = metadataSearch.value.trim()
    if (hasAlertsFilter.value)
      query.has_alerts = 1
    if (createdFrom.value)
      query.created_from = createdFrom.value
    if (createdTo.value)
      query.created_to = createdTo.value
    if (closedFrom.value)
      query.closed_from = closedFrom.value
    if (closedTo.value)
      query.closed_to = closedTo.value

    const res = await archivalApi.fetchFiles(query)
    files.value = res.data
    meta.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      total: res.meta.total,
    }
  }
  catch {
    toast.error('No se pudieron cargar los expedientes.')
  }
  finally {
    loading.value = false
  }
}

function clearAdvanced() {
  phaseFilter.value = PHASE_FILTER_ALL
  fileTypeFilter.value = ''
  orgUnitFilter.value = ''
  metadataSearch.value = ''
  hasAlertsFilter.value = false
  createdFrom.value = ''
  createdTo.value = ''
  closedFrom.value = ''
  closedTo.value = ''
  loadFiles(1)
}

onMounted(async () => {
  await loadFilters()
  await loadFiles()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Expedientes
        </h1>
        <p class="text-sm text-muted-foreground">
          Gestión documental por entidad, caso y área productora.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          v-if="hasPermission('expedientes_area_ver')"
          variant="outline"
          @click="router.push('/expedientes/area')"
        >
          <Icon name="i-lucide-building-2" class="mr-2 size-4" />
          Repositorio por área
        </Button>
        <Button
          v-if="hasPermission('expedientes_tipos_configurar')"
          variant="outline"
          @click="router.push('/expedientes/tipos')"
        >
          <Icon name="i-lucide-settings-2" class="mr-2 size-4" />
          Tipos
        </Button>
        <Button
          v-if="hasPermission('expedientes_reportes_ver')"
          variant="outline"
          @click="router.push('/expedientes/reportes')"
        >
          <Icon name="i-lucide-bar-chart-3" class="mr-2 size-4" />
          Reportes
        </Button>
        <Button
          v-if="canCreate"
          @click="router.push('/expedientes/nuevo')"
        >
          <Icon name="i-lucide-plus" class="mr-2 size-4" />
          Nuevo expediente
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap gap-3">
          <Input
            v-model="search"
            placeholder="Buscar por título, número, cédula o nombre..."
            class="max-w-md"
            @keyup.enter="loadFiles(1)"
          />
          <Select v-model="statusFilter">
            <SelectTrigger class="w-56">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="STATUS_FILTER_ALL">
                Todos los estados
              </SelectItem>
              <SelectItem
                v-for="(label, value) in ARCHIVAL_FILE_STATUS_LABELS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" @click="loadFiles(1)">
            Buscar
          </Button>
          <Button variant="outline" @click="advancedOpen = !advancedOpen">
            <Icon name="i-lucide-sliders-horizontal" class="mr-2 size-4" />
            Búsqueda avanzada
          </Button>
        </div>

        <Collapsible v-model:open="advancedOpen" class="mt-4">
          <CollapsibleContent class="grid gap-4 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-3">
            <div class="space-y-2">
              <Label>Fase archivística</Label>
              <Select v-model="phaseFilter">
                <SelectTrigger>
                  <SelectValue placeholder="Todas las fases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="PHASE_FILTER_ALL">
                    Todas las fases
                  </SelectItem>
                  <SelectItem
                    v-for="phase in phaseOptions"
                    :key="phase.value"
                    :value="phase.value"
                  >
                    {{ phase.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Tipo de expediente</Label>
              <Select v-model="fileTypeFilter">
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    Todos los tipos
                  </SelectItem>
                  <SelectItem
                    v-for="type in fileTypes"
                    :key="type.id"
                    :value="String(type.id)"
                  >
                    {{ type.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Área productora</Label>
              <Select v-model="orgUnitFilter">
                <SelectTrigger>
                  <SelectValue placeholder="Todas las áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    Todas las áreas
                  </SelectItem>
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

            <div class="space-y-2 md:col-span-2">
              <Label>Metadatos</Label>
              <Input
                v-model="metadataSearch"
                placeholder="Buscar en valores de metadatos..."
              />
            </div>

            <div class="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox
                id="has-alerts"
                :checked="hasAlertsFilter"
                @update:checked="hasAlertsFilter = $event === true"
              />
              <Label for="has-alerts" class="cursor-pointer">
                Solo con alertas abiertas
              </Label>
            </div>

            <div class="space-y-2 md:col-span-2 xl:col-span-3">
              <Label>Creación</Label>
              <DateRangeStringPicker
                id="created-range"
                v-model:from="createdFrom"
                v-model:to="createdTo"
                placeholder-text="Rango de creación"
              />
            </div>

            <div class="space-y-2 md:col-span-2 xl:col-span-3">
              <Label>Cierre</Label>
              <DateRangeStringPicker
                id="closed-range"
                v-model:from="closedFrom"
                v-model:to="closedTo"
                placeholder-text="Rango de cierre"
              />
            </div>

            <div class="flex gap-2 md:col-span-2 xl:col-span-3">
              <Button variant="secondary" @click="loadFiles(1)">
                Aplicar filtros
              </Button>
              <Button variant="outline" @click="clearAdvanced">
                Limpiar avanzados
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando expedientes...
        </div>
        <div v-else-if="files.length === 0" class="py-10 text-center text-muted-foreground">
          No hay expedientes para los filtros seleccionados.
        </div>
        <template v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="file in files"
                :key="file.id"
                class="cursor-pointer"
                @click="router.push(`/expedientes/${file.id}`)"
              >
                <TableCell class="font-mono text-sm">
                  {{ file.file_number }}
                </TableCell>
                <TableCell>{{ file.title }}</TableCell>
                <TableCell>{{ file.file_type?.name }}</TableCell>
                <TableCell>
                  <div v-if="file.entity_label">
                    {{ file.entity_label }}
                  </div>
                  <div v-if="file.entity_key" class="text-xs text-muted-foreground">
                    {{ file.entity_key }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {{ ARCHIVAL_FILE_STATUS_LABELS[file.status] }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    @click.stop="router.push(`/expedientes/${file.id}`)"
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div v-if="meta.last_page > 1" class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{{ meta.total }} expedientes</span>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                :disabled="meta.current_page <= 1"
                @click="loadFiles(meta.current_page - 1)"
              >
                Anterior
              </Button>
              <span class="px-2 py-1">
                {{ meta.current_page }} / {{ meta.last_page }}
              </span>
              <Button
                size="sm"
                variant="outline"
                :disabled="meta.current_page >= meta.last_page"
                @click="loadFiles(meta.current_page + 1)"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
