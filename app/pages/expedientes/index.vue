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

const loading = ref(true)
const files = ref<ArchivalFile[]>([])
const search = ref('')
const STATUS_FILTER_ALL = 'all'
const statusFilter = ref<ArchivalFileStatus | typeof STATUS_FILTER_ALL>(STATUS_FILTER_ALL)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

const canCreate = computed(() => hasPermission('expedientes_crear'))

async function loadFiles(page = 1) {
  loading.value = true

  try {
    const query: Record<string, string | number> = { page, per_page: 15 }
    if (search.value.trim())
      query.search = search.value.trim()
    if (statusFilter.value !== STATUS_FILTER_ALL)
      query.status = statusFilter.value

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

onMounted(() => loadFiles())
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
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando expedientes...
        </div>
        <div v-else-if="files.length === 0" class="py-10 text-center text-muted-foreground">
          No hay expedientes para los filtros seleccionados.
        </div>
        <Table v-else>
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
      </CardContent>
    </Card>
  </div>
</template>
