<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_ver', 'estructura_org_importar_ver'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()
const { hasAnyPermission } = usePermissions()

const IMPORT_BLOCK_OPTIONS = [
  { value: 'offices', label: 'Oficinas' },
  { value: 'units', label: 'Áreas' },
  { value: 'positions', label: 'Cargos' },
  { value: 'staff', label: 'Funcionarios' },
] as const

type ImportBlock = (typeof IMPORT_BLOCK_OPTIONS)[number]['value']

const BLOCK_LABEL: Record<ImportBlock, string> = {
  offices: 'Oficinas',
  units: 'Áreas',
  positions: 'Cargos',
  staff: 'Funcionarios',
}

interface ImportPreview {
  offices: Array<Record<string, unknown>>
  units: Array<Record<string, unknown>>
  positions: Array<Record<string, unknown>>
  staff: Array<Record<string, unknown>>
  errors: Array<{ sheet: string; row: number; message: string }>
}

interface ImportHistoryRow {
  id: number
  blocks: string[]
  counts: Record<string, number>
  error_count: number
  source_filename?: string | null
  created_at: string
  created_by_user?: { id: number; name: string } | null
}

const TEMPLATE_CARDS: Array<{
  block: ImportBlock | null
  title: string
  description: string
  filename: string
  icon: string
}> = [
  {
    block: null,
    title: 'Libro completo',
    description: 'Cuatro hojas (Oficinas, Areas, Cargos, Funcionarios) en un solo archivo para cargas masivas.',
    filename: 'plantilla-estructura-organizacional.xlsx',
    icon: 'i-lucide-book-copy',
  },
  {
    block: 'offices',
    title: 'Solo agencias',
    description: 'Hoja Oficinas: código único por sede, tipo (main/branch/headquarters), vigencias y ciudad.',
    filename: 'plantilla-oficinas-estructura.xlsx',
    icon: 'i-lucide-building-2',
  },
  {
    block: 'units',
    title: 'Solo áreas',
    description: 'Hoja Areas: dependencias por código de oficina padre y jerarquía interna.',
    filename: 'plantilla-areas-estructura.xlsx',
    icon: 'i-lucide-network',
  },
  {
    block: 'positions',
    title: 'Solo cargos',
    description: 'Hoja Cargos: puestos ligados al código del área y nivel jerárquico.',
    filename: 'plantilla-cargos-estructura.xlsx',
    icon: 'i-lucide-briefcase',
  },
  {
    block: 'staff',
    title: 'Solo funcionarios',
    description: 'Hoja Funcionarios: datos personales y vínculo a oficina/área/cargo por código.',
    filename: 'plantilla-funcionarios-estructura.xlsx',
    icon: 'i-lucide-users',
  },
]

const selectedBlocks = ref<ImportBlock[]>(['offices', 'units', 'positions', 'staff'])
const preview = ref<ImportPreview | null>(null)
const previewing = ref(false)
const committing = ref(false)
const downloadingKey = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const lastSourceFilename = ref<string | null>(null)

const historyRows = ref<ImportHistoryRow[]>([])
const historyLoading = ref(true)
const historyPagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})
const historyBlockFilter = ref<'all' | ImportBlock>('all')
const historyDateFrom = ref('')
const historyDateTo = ref('')

const hasActiveHistoryFilters = computed(() => {
  return historyBlockFilter.value !== 'all'
    || Boolean(historyDateFrom.value?.trim())
    || Boolean(historyDateTo.value?.trim())
})

function countImportable(rows: Array<Record<string, unknown>>): number {
  return rows.filter(r => r.skip !== true).length
}

function summaryText(p: ImportPreview): string {
  const o = selectedBlocks.value.includes('offices') ? countImportable(p.offices) : 0
  const u = selectedBlocks.value.includes('units') ? countImportable(p.units) : 0
  const pos = selectedBlocks.value.includes('positions') ? countImportable(p.positions) : 0
  const s = selectedBlocks.value.includes('staff') ? countImportable(p.staff) : 0
  return `A importar: ${o} oficina(s), ${u} área(s), ${pos} cargo(s), ${s} funcionario(s) (filas omitidas por error no se cargan).`
}

function blocksSummary(blocks: string[]): string {
  if (!blocks.length) {
    return '—'
  }
  return blocks.map(b => BLOCK_LABEL[b as ImportBlock] ?? b).join(' · ')
}

async function downloadTemplateCard(block: ImportBlock | null, filename: string, key: string) {
  if (downloadingKey.value) {
    return
  }
  downloadingKey.value = key
  try {
    await downloadReportFile(
      '/organizational-structure/meta/import-template',
      block ? { block } : {},
      filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    toast.success('Plantilla descargada')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo descargar la plantilla'
    toast.error(msg)
  } finally {
    downloadingKey.value = null
  }
}

async function runPreview(file: File) {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx')) {
    toast.error('Use un archivo Excel .xlsx')
    return
  }
  lastSourceFilename.value = file.name
  previewing.value = true
  preview.value = null
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $api<{ data: ImportPreview }>('/organizational-structure/meta/import-preview', {
      method: 'POST',
      body: fd,
    })
    preview.value = res.data
    if (res.data.errors.length > 0) {
      toast.message('Vista previa lista', {
        description: `Se encontraron ${res.data.errors.length} alerta(s) en filas. Revise la tabla inferior.`,
      })
    } else {
      toast.success('Archivo válido para las filas revisadas')
    }
  } catch (e: unknown) {
    lastSourceFilename.value = null
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    toast.error(msg ?? 'No se pudo analizar el archivo')
  } finally {
    previewing.value = false
  }
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    void runPreview(file)
  }
}

function buildCommitBody(): Record<string, unknown[]> {
  const p = preview.value
  if (!p) {
    return { offices: [], units: [], positions: [], staff: [] }
  }
  return {
    offices: selectedBlocks.value.includes('offices') ? p.offices : [],
    units: selectedBlocks.value.includes('units') ? p.units : [],
    positions: selectedBlocks.value.includes('positions') ? p.positions : [],
    staff: selectedBlocks.value.includes('staff') ? p.staff : [],
  }
}

async function commitImport() {
  if (!preview.value) {
    return
  }
  if (!hasAnyPermission(['estructura_org_editar', 'estructura_org_importar_ejecutar'])) {
    toast.error('No tiene permiso para ejecutar la importación')
    return
  }
  if (selectedBlocks.value.length === 0) {
    toast.error('Seleccione al menos un bloque a importar')
    return
  }
  committing.value = true
  try {
    const res = await $api<{ data: Record<string, number> }>('/organizational-structure/meta/import-commit', {
      method: 'POST',
      body: {
        ...buildCommitBody(),
        source_filename: lastSourceFilename.value?.trim() || undefined,
        preview_error_count: preview.value.errors.length,
      },
    })
    const d = res.data
    toast.success('Importación completada', {
      description: `Oficinas: ${d.offices ?? 0}, áreas: ${d.units ?? 0}, cargos: ${d.positions ?? 0}, funcionarios: ${d.staff ?? 0}, asignaciones: ${d.assignments ?? 0}.`,
    })
    preview.value = null
    lastSourceFilename.value = null
    selectedBlocks.value = ['offices', 'units', 'positions', 'staff']
    historyPagination.value.current_page = 1
    await loadHistory()
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    toast.error(msg ?? 'Error al importar')
  } finally {
    committing.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const q: Record<string, string | number> = {
      per_page: historyPagination.value.per_page,
      page: historyPagination.value.current_page,
    }
    if (historyBlockFilter.value !== 'all') {
      q.block = historyBlockFilter.value
    }
    if (historyDateFrom.value.trim()) {
      q.created_from = historyDateFrom.value.trim()
    }
    if (historyDateTo.value.trim()) {
      q.created_to = historyDateTo.value.trim()
    }
    const res = await $api<{ data: ImportHistoryRow[]; meta: typeof historyPagination.value }>(
      '/organizational-structure/meta/import-histories',
      { query: q },
    )
    historyRows.value = res.data
    historyPagination.value = res.meta
  } catch {
    toast.error('No se pudo cargar el historial de importaciones')
    historyRows.value = []
  } finally {
    historyLoading.value = false
  }
}

function clearHistoryFilters() {
  historyBlockFilter.value = 'all'
  historyDateFrom.value = ''
  historyDateTo.value = ''
  historyPagination.value.current_page = 1
  void loadHistory()
}

function formatHistoryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

let historyFilterDebounce: ReturnType<typeof setTimeout> | null = null
watch([historyBlockFilter, historyDateFrom, historyDateTo], () => {
  if (historyFilterDebounce) {
    clearTimeout(historyFilterDebounce)
  }
  historyFilterDebounce = setTimeout(() => {
    historyFilterDebounce = null
    historyPagination.value.current_page = 1
    void loadHistory()
  }, 350)
})

onMounted(() => {
  void loadHistory()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Importar estructura (Excel)
        </h2>
        <Button variant="outline" @click="router.push('/settings/organizational-structure')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas por tipo</CardTitle>
          <CardDescription class="leading-relaxed max-w-4xl">
            Descargue el libro completo o una plantilla con una sola hoja para agencias, áreas, cargos o funcionarios.
            En la fila 1, el fondo rosado indica columnas obligatorias y el azul claro las opcionales; cada celda usa el
            formato <span class="font-mono text-xs">clave|descripción</span> (conserve la clave y el separador
            <span class="font-mono text-xs">|</span> para que el sistema reconozca la columna). Si combina hojas en un
            solo archivo, mantenga los nombres de hoja Oficinas, Areas, Cargos y Funcionarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="(card, idx) in TEMPLATE_CARDS"
              :key="card.block ?? `full-${idx}`"
              class="flex flex-col rounded-lg border bg-card p-4 shadow-sm"
            >
              <div class="mb-3 flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon :name="card.icon" class="h-5 w-5 text-muted-foreground" />
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="font-semibold leading-tight">
                    {{ card.title }}
                  </p>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    {{ card.description }}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="mt-auto w-full"
                :disabled="downloadingKey !== null"
                @click="downloadTemplateCard(card.block, card.filename, card.block ?? 'full')"
              >
                <Icon
                  :name="downloadingKey === (card.block ?? 'full') ? 'i-lucide-loader-2' : 'i-lucide-download'"
                  class="mr-2 h-4 w-4 shrink-0"
                  :class="{ 'animate-spin': downloadingKey === (card.block ?? 'full') }"
                />
                Descargar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validar e importar</CardTitle>
          <CardDescription class="leading-relaxed max-w-4xl">
            Hojas reconocidas: <strong>Oficinas</strong>, <strong>Areas</strong>, <strong>Cargos</strong>, <strong>Funcionarios</strong>.
            La primera fila debe seguir siendo la cabecera (colores y texto clave|descripción como en la plantilla).
            Valide el archivo; elija bloques a cargar y confirme. Cada importación exitosa queda en el historial inferior.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-3">
            <Button
              variant="default"
              :disabled="previewing"
              @click="fileInputRef?.click()"
            >
              <Icon
                :name="previewing ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
                class="mr-2 h-4 w-4"
                :class="{ 'animate-spin': previewing }"
              />
              Validar archivo (.xlsx)
            </Button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="sr-only"
              @change="onFileChange"
            >
          </div>

          <Card v-if="preview" class="border-primary/20 bg-muted/20">
            <CardHeader class="pb-2">
              <CardTitle class="text-base">
                Resumen de vista previa
              </CardTitle>
              <CardDescription>
                {{ summaryText(preview) }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-5">
              <div class="space-y-2 max-w-xl">
                <Label>Bloques a incluir en la importación</Label>
                <Multiselect
                  v-model="selectedBlocks"
                  mode="tags"
                  :options="[...IMPORT_BLOCK_OPTIONS]"
                  value-prop="value"
                  label="label"
                  :close-on-select="false"
                  :searchable="false"
                  class="org-import-blocks-ms"
                />
              </div>
              <PermissionGate :any-permission="['estructura_org_editar', 'estructura_org_importar_ejecutar']">
                <Button
                  :disabled="committing || selectedBlocks.length === 0"
                  @click="commitImport"
                >
                  <Icon
                    :name="committing ? 'i-lucide-loader-2' : 'i-lucide-upload'"
                    class="mr-2 h-4 w-4"
                    :class="{ 'animate-spin': committing }"
                  />
                  Confirmar importación
                </Button>
              </PermissionGate>
            </CardContent>
          </Card>

          <div v-if="preview && preview.errors.length > 0" class="rounded-lg border border-destructive/30 bg-destructive/5">
            <div class="border-b border-destructive/20 px-4 py-3">
              <h3 class="font-semibold text-destructive">
                Alertas por fila
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                Las filas con error se omiten al importar. Corrija el Excel y vuelva a validar si necesita esos registros.
              </p>
            </div>
            <div class="overflow-x-auto rounded-b-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hoja</TableHead>
                    <TableHead class="w-24">
                      Fila
                    </TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(err, i) in preview.errors" :key="`e-${i}`">
                    <TableCell>{{ err.sheet }}</TableCell>
                    <TableCell>{{ err.row }}</TableCell>
                    <TableCell>{{ err.message }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de importaciones</CardTitle>
          <CardDescription>
            Solo se registran cargas confirmadas correctamente. Filtre por tipo de bloque o por rango de fechas.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div class="grid w-full gap-2 lg:max-w-[220px] lg:shrink-0">
              <Label for="hist-block" class="text-xs text-muted-foreground">Tipo (bloque incluido)</Label>
              <Select v-model="historyBlockFilter">
                <SelectTrigger id="hist-block">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los tipos
                  </SelectItem>
                  <SelectItem
                    v-for="opt in IMPORT_BLOCK_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid w-full gap-2 sm:max-w-[160px] sm:shrink-0">
              <Label for="hist-from" class="text-xs text-muted-foreground">Desde</Label>
              <Input id="hist-from" v-model="historyDateFrom" type="date" class="w-full" />
            </div>
            <div class="grid w-full gap-2 sm:max-w-[160px] sm:shrink-0">
              <Label for="hist-to" class="text-xs text-muted-foreground">Hasta</Label>
              <Input id="hist-to" v-model="historyDateTo" type="date" class="w-full" />
            </div>
            <div class="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto lg:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="!hasActiveHistoryFilters"
                @click="clearHistoryFilters"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          <p v-if="!historyLoading" class="text-sm text-muted-foreground">
            {{ historyPagination.total }} registro{{ historyPagination.total === 1 ? '' : 's' }}.
          </p>

          <div v-if="historyLoading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="historyRows.length === 0" class="py-12 text-center text-sm text-muted-foreground leading-relaxed">
            <template v-if="hasActiveHistoryFilters">
              No hay importaciones con esos criterios.
            </template>
            <template v-else>
              Aún no hay importaciones ejecutadas. Confirme una carga para verla aquí.
            </template>
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Bloques</TableHead>
                  <TableHead class="text-right">
                    Cargados
                  </TableHead>
                  <TableHead class="text-center w-20">
                    Alertas prev.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="h in historyRows" :key="h.id">
                  <TableCell class="whitespace-nowrap text-sm tabular-nums">
                    {{ formatHistoryDate(h.created_at) }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ h.created_by_user?.name ?? '—' }}
                  </TableCell>
                  <TableCell class="max-w-[200px] truncate text-sm text-muted-foreground" :title="h.source_filename ?? ''">
                    {{ h.source_filename ?? '—' }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ blocksSummary(h.blocks) }}
                  </TableCell>
                  <TableCell class="text-right text-xs tabular-nums text-muted-foreground">
                    Of. {{ h.counts?.offices ?? 0 }} · Ar. {{ h.counts?.units ?? 0 }} · Ca. {{ h.counts?.positions ?? 0 }} · Fun. {{ h.counts?.staff ?? 0 }} · Asig. {{ h.counts?.assignments ?? 0 }}
                  </TableCell>
                  <TableCell class="text-center">
                    <Badge :variant="h.error_count > 0 ? 'secondary' : 'outline'">
                      {{ h.error_count }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div
            v-if="!historyLoading && historyPagination.last_page > 1"
            class="flex flex-wrap items-center justify-between gap-2 border-t pt-4"
          >
            <p class="text-sm text-muted-foreground">
              Página {{ historyPagination.current_page }} de {{ historyPagination.last_page }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="historyPagination.current_page <= 1"
                @click="historyPagination.current_page--; loadHistory()"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="historyPagination.current_page >= historyPagination.last_page"
                @click="historyPagination.current_page++; loadHistory()"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.org-import-blocks-ms :deep(.multiselect) {
  min-height: 2.75rem;
}
</style>
