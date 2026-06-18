<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: 'permission',
  permissions: 'reportes_ver',
})

interface SucursalCatalogItem {
  id: number
  name: string
  code?: string | null
}

interface FieldDef {
  key: string
  label: string
  group: string
  type: string
}

interface GroupDef {
  key: string
  label: string
  description: string
}

interface StatusOption {
  value: string
  label: string
}

interface ColumnDef {
  key: string
  label: string
  type: string
}

interface FieldsCatalogResponse {
  data: {
    groups: GroupDef[]
    fields: FieldDef[]
    statuses: StatusOption[]
    default_selection: string[]
  }
}

interface PreviewResponse {
  data: {
    filters: {
      created_from: string
      created_to: string
      sucursal_id: number | null
      sucursal_label: string
      status: string | null
      status_label: string | null
    }
    columns: ColumnDef[]
    rows: Array<Record<string, unknown>>
    total: number
    preview_limit: number
    truncated: boolean
  }
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const loadingCatalog = ref(false)
const loadingSucursales = ref(false)
const loadingPreview = ref(false)
const exportingXlsx = ref(false)
const exportingPdf = ref(false)

const groups = ref<GroupDef[]>([])
const fields = ref<FieldDef[]>([])
const statuses = ref<StatusOption[]>([])
const sucursales = ref<SucursalCatalogItem[]>([])

const selected = reactive<Record<string, boolean>>({})
const fieldSearch = ref('')

const filterDateFrom = ref('')
const filterDateTo = ref('')
const sucursalId = ref<number | null>(null)
const statusValue = ref<string | null>(null)

const preview = ref<PreviewResponse['data'] | null>(null)

let previewDebounce: ReturnType<typeof setTimeout> | null = null

const sucursalesSorted = computed(() =>
  [...sucursales.value].sort((a, b) => a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' })),
)

/** Campos en el orden del catálogo que están seleccionados. */
const selectedKeysOrdered = computed(() => fields.value.filter(f => selected[f.key]).map(f => f.key))

const selectedCount = computed(() => selectedKeysOrdered.value.length)

const normalizedSearch = computed(() => fieldSearch.value.trim().toLowerCase())

/** Campos por grupo, respetando el filtro de búsqueda por etiqueta. */
const fieldsByGroup = computed<Record<string, FieldDef[]>>(() => {
  const map: Record<string, FieldDef[]> = {}
  for (const g of groups.value) {
    map[g.key] = []
  }
  for (const f of fields.value) {
    if (normalizedSearch.value && !f.label.toLowerCase().includes(normalizedSearch.value)) {
      continue
    }
    ;(map[f.group] ??= []).push(f)
  }
  return map
})

const visibleGroups = computed(() => groups.value.filter(g => (fieldsByGroup.value[g.key]?.length ?? 0) > 0))

function groupSelectedCount(groupKey: string): number {
  return fields.value.filter(f => f.group === groupKey && selected[f.key]).length
}

function groupTotalCount(groupKey: string): number {
  return fields.value.filter(f => f.group === groupKey).length
}

function setField(key: string, value: boolean): void {
  selected[key] = value
}

function toggleGroup(groupKey: string, value: boolean): void {
  for (const f of fields.value) {
    if (f.group === groupKey) {
      selected[f.key] = value
    }
  }
}

function clearAll(): void {
  for (const key of Object.keys(selected)) {
    selected[key] = false
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (type === 'boolean') {
    return value ? 'Sí' : 'No'
  }
  if (type === 'currency' && Number.isFinite(Number(value))) {
    return formatCurrency(Number(value))
  }
  if (type === 'number' && Number.isFinite(Number(value))) {
    return new Intl.NumberFormat('es-CO').format(Number(value))
  }
  return String(value)
}

function isNumericType(type: string): boolean {
  return type === 'currency' || type === 'number'
}

function defaultRangeStartOfYear(): { from: string, to: string } {
  const t = today(getLocalTimeZone())
  return { from: `${t.year}-01-01`, to: `${t.year}-12-31` }
}

function assertValidDateRange(): boolean {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return false
  }
  return true
}

function buildQuery(): Record<string, string | number | string[]> {
  const q: Record<string, string | number | string[]> = {}
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from) {
    q.created_from = from
  }
  if (to) {
    q.created_to = to
  }
  if (sucursalId.value != null) {
    q.sucursal_id = sucursalId.value
  }
  if (statusValue.value) {
    q.status = statusValue.value
  }
  q.fields = selectedKeysOrdered.value
  return q
}

function buildParams(): URLSearchParams {
  const params = new URLSearchParams()
  const q = buildQuery()
  for (const [k, v] of Object.entries(q)) {
    if (Array.isArray(v)) {
      v.forEach(item => params.append(`${k}[]`, String(item)))
    } else {
      params.set(k, String(v))
    }
  }
  return params
}

async function loadCatalog(): Promise<void> {
  loadingCatalog.value = true
  try {
    const res = await $api<FieldsCatalogResponse>('/reports/advanced/fields')
    groups.value = res.data.groups ?? []
    fields.value = res.data.fields ?? []
    statuses.value = res.data.statuses ?? []
    for (const f of fields.value) {
      selected[f.key] = false
    }
    for (const key of res.data.default_selection ?? []) {
      if (key in selected) {
        selected[key] = true
      }
    }
  } catch (error: any) {
    console.error('Error cargando catálogo de campos:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el catálogo de campos')
  } finally {
    loadingCatalog.value = false
  }
}

async function fetchSucursales(): Promise<void> {
  loadingSucursales.value = true
  try {
    const res = await $api<{ data: SucursalCatalogItem[] }>('/catalogs/sucursales')
    sucursales.value = res.data ?? []
  } catch (error: any) {
    console.error('Error cargando sucursales:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar el catálogo de sucursales')
  } finally {
    loadingSucursales.value = false
  }
}

async function fetchPreview(): Promise<void> {
  if (selectedCount.value === 0) {
    preview.value = null
    return
  }
  if (!assertValidDateRange()) {
    return
  }
  loadingPreview.value = true
  try {
    const res = await $api<PreviewResponse>(`/reports/advanced?${buildParams().toString()}`)
    preview.value = res.data
  } catch (error: any) {
    console.error('Error cargando vista previa:', error)
    toast.error(error?.data?.message ?? 'No se pudo cargar la vista previa')
    preview.value = null
  } finally {
    loadingPreview.value = false
  }
}

async function exportReport(format: 'xlsx' | 'pdf'): Promise<void> {
  if (selectedCount.value === 0) {
    toast.error('Seleccione al menos un campo para exportar')
    return
  }
  if (!assertValidDateRange()) {
    return
  }
  const busy = format === 'xlsx' ? exportingXlsx : exportingPdf
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    const stamp = new Date().toISOString().slice(0, 10)
    const ext = format === 'xlsx' ? 'xlsx' : 'pdf'
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'
    await downloadReportFile('/reports/advanced/export', { ...buildQuery(), format }, `reporte-avanzado-${stamp}.${ext}`, mime)
    toast.success(format === 'xlsx' ? 'Archivo Excel descargado' : 'Archivo PDF descargado')
  } catch (e: unknown) {
    console.error('Error exportando reporte avanzado:', e)
    toast.error(e instanceof Error ? e.message : 'No se pudo generar el archivo')
  } finally {
    busy.value = false
  }
}

function schedulePreview(): void {
  if (previewDebounce) {
    clearTimeout(previewDebounce)
  }
  previewDebounce = setTimeout(() => {
    previewDebounce = null
    fetchPreview()
  }, 400)
}

watch(
  [() => selectedKeysOrdered.value.join('|'), filterDateFrom, filterDateTo, sucursalId, statusValue],
  () => schedulePreview(),
)

onMounted(async () => {
  const { from, to } = defaultRangeStartOfYear()
  filterDateFrom.value = from
  filterDateTo.value = to
  await Promise.all([loadCatalog(), fetchSucursales()])
  await fetchPreview()
})

onUnmounted(() => {
  if (previewDebounce) {
    clearTimeout(previewDebounce)
    previewDebounce = null
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" class="w-fit gap-2 px-2 text-muted-foreground" as-child>
        <NuxtLink to="/reportes">
          <Icon name="i-lucide-arrow-left" class="size-4" />
          Todos los reportes
        </NuxtLink>
      </Button>
    </div>

    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Reporte avanzado
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Arme su propio reporte: elija qué campos incluir (de radicación, sucursal, asesor, deudor, codeudores, score, documentación y tiempos) y combínelos como necesite. Una fila por radicación. Filtre por fecha, sucursal y estado, vea la vista previa y exporte a Excel o PDF.
      </p>
    </div>

    <div class="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <!-- Columna izquierda: filtros + selector de campos -->
      <div class="flex flex-col gap-5">
        <Card class="shadow-sm">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">
              Filtros
            </CardTitle>
            <CardDescription>
              Criterio de fecha: día en que se generó la radicación.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <DateRangeStringPicker
              id="reporte-avanzado-dates"
              label="Rango de fechas"
              v-model:from="filterDateFrom"
              v-model:to="filterDateTo"
            />
            <div class="space-y-1.5">
              <Label for="avanzado-sucursal">Sucursal</Label>
              <Select
                :model-value="sucursalId == null ? 'all' : String(sucursalId)"
                :disabled="loadingSucursales"
                @update:model-value="sucursalId = $event === 'all' ? null : Number($event)"
              >
                <SelectTrigger id="avanzado-sucursal" class="w-full">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todas las sucursales
                  </SelectItem>
                  <SelectItem v-for="s in sucursalesSorted" :key="s.id" :value="String(s.id)">
                    {{ s.name }}{{ s.code ? ` (${s.code})` : '' }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="avanzado-estado">Estado</Label>
              <Select
                :model-value="statusValue == null ? 'all' : statusValue"
                @update:model-value="statusValue = $event === 'all' ? null : String($event)"
              >
                <SelectTrigger id="avanzado-estado" class="w-full">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los estados
                  </SelectItem>
                  <SelectItem v-for="st in statuses" :key="st.value" :value="st.value">
                    {{ st.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card class="shadow-sm">
          <CardHeader class="gap-3 pb-3">
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">
                Campos
              </CardTitle>
              <Badge variant="secondary" class="font-normal">
                {{ selectedCount }} seleccionados
              </Badge>
            </div>
            <div class="relative">
              <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input v-model="fieldSearch" placeholder="Buscar campo…" class="pl-8" />
            </div>
            <div class="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" :disabled="selectedCount === 0" @click="clearAll">
                Limpiar selección
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="loadingCatalog" class="flex justify-center py-8">
              <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="visibleGroups.length === 0" class="py-6 text-center text-sm text-muted-foreground">
              Sin campos para «{{ fieldSearch }}».
            </div>
            <Accordion
              v-else
              type="multiple"
              :default-value="groups.map(g => g.key)"
              class="w-full"
            >
              <AccordionItem v-for="g in visibleGroups" :key="g.key" :value="g.key">
                <AccordionTrigger class="text-sm">
                  <span class="flex items-center gap-2">
                    {{ g.label }}
                    <Badge variant="outline" class="font-normal">
                      {{ groupSelectedCount(g.key) }}/{{ groupTotalCount(g.key) }}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent class="space-y-2">
                  <div class="flex items-center gap-3 pb-1">
                    <button type="button" class="text-xs font-medium text-primary hover:underline" @click="toggleGroup(g.key, true)">
                      Todos
                    </button>
                    <button type="button" class="text-xs font-medium text-muted-foreground hover:underline" @click="toggleGroup(g.key, false)">
                      Ninguno
                    </button>
                  </div>
                  <label
                    v-for="f in fieldsByGroup[g.key]"
                    :key="f.key"
                    class="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
                  >
                    <Checkbox
                      bare
                      :model-value="selected[f.key] ?? false"
                      @update:model-value="setField(f.key, Boolean($event))"
                    />
                    <span class="text-sm">{{ f.label }}</span>
                  </label>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <!-- Columna derecha: vista previa -->
      <Card class="shadow-sm">
        <CardHeader class="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1.5">
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>
              Se actualiza al cambiar campos o filtros. Exporte para obtener todas las filas.
            </CardDescription>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" class="gap-1.5" :disabled="exportingXlsx || selectedCount === 0" @click="exportReport('xlsx')">
              <Icon :name="exportingXlsx ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'" class="size-4" :class="{ 'animate-spin': exportingXlsx }" />
              {{ exportingXlsx ? 'Generando…' : 'Excel' }}
            </Button>
            <Button type="button" variant="outline" size="sm" class="gap-1.5" :disabled="exportingPdf || selectedCount === 0" @click="exportReport('pdf')">
              <Icon :name="exportingPdf ? 'i-lucide-loader-2' : 'i-lucide-file-text'" class="size-4" :class="{ 'animate-spin': exportingPdf }" />
              {{ exportingPdf ? 'Generando…' : 'PDF' }}
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="selectedCount === 0" class="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            Seleccione al menos un campo a la izquierda para ver el reporte.
          </div>

          <template v-else>
            <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span v-if="preview">
                <span class="font-medium text-foreground">{{ preview.total }}</span> radicaciones
              </span>
              <span v-if="preview?.truncated" class="text-xs">
                (mostrando las primeras {{ preview.preview_limit }})
              </span>
            </div>

            <div v-if="loadingPreview" class="flex justify-center py-12">
              <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
            </div>

            <div v-else-if="preview" class="overflow-hidden rounded-lg border">
              <div class="max-h-[70vh] overflow-auto">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead
                        v-for="col in preview.columns"
                        :key="col.key"
                        :class="isNumericType(col.type) ? 'text-right' : ''"
                        class="whitespace-nowrap"
                      >
                        {{ col.label }}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(row, idx) in preview.rows" :key="idx">
                      <TableCell
                        v-for="col in preview.columns"
                        :key="col.key"
                        :class="isNumericType(col.type) ? 'text-right tabular-nums' : ''"
                        class="whitespace-nowrap"
                      >
                        {{ formatCell(row[col.key], col.type) }}
                      </TableCell>
                    </TableRow>
                    <TableRow v-if="preview.rows.length === 0">
                      <TableCell :colspan="preview.columns.length" class="py-10 text-center text-muted-foreground">
                        No hay radicaciones para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
