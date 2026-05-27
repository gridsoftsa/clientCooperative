<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocumentationVaultListRow } from '~/constants/documentation-vault'
import {
  creditApplicationStatusFilterOptions,
  getCreditApplicationStatusBadgeVariant,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

definePageMeta({
  middleware: 'permission',
  permissions: 'documentacion_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

const rows = ref<DocumentationVaultListRow[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

const filterStatus = ref('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterCode = ref('')
const filterExternal = ref('')
const filterSearch = ref('')
const filterOnlyWithDocuments = ref(false)

const statusFilterOptions = creditApplicationStatusFilterOptions

const hasActiveFilters = computed(() =>
  filterStatus.value !== 'all'
  || Boolean(filterDateFrom.value?.trim())
  || Boolean(filterDateTo.value?.trim())
  || Boolean(filterCode.value?.trim())
  || Boolean(filterExternal.value?.trim())
  || Boolean(filterSearch.value?.trim())
  || filterOnlyWithDocuments.value,
)

const skipFilterWatch = ref(false)
let listFilterDebounce: ReturnType<typeof setTimeout> | null = null

function buildListQuery(): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    per_page: pagination.value.per_page,
    page: pagination.value.current_page,
  }
  if (filterStatus.value !== 'all') {
    q.status = filterStatus.value
  }
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from) {
    q.created_from = from
  }
  if (to) {
    q.created_to = to
  }
  const code = filterCode.value?.trim()
  if (code) {
    q.code = code
  }
  const ext = filterExternal.value?.trim()
  if (ext) {
    q.numero_radicado_externo = ext
  }
  const search = filterSearch.value?.trim()
  if (search) {
    q.search = search
  }
  if (filterOnlyWithDocuments.value) {
    q.only_with_documents = true
  }
  return q
}

async function fetchRows(): Promise<void> {
  const from = filterDateFrom.value?.trim()
  const to = filterDateTo.value?.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return
  }
  loading.value = true
  try {
    const res = await $api<{ data: DocumentationVaultListRow[], meta: typeof pagination.value }>(
      '/documentation/credit-applications',
      { query: buildListQuery() },
    )
    rows.value = res.data
    pagination.value = res.meta
  } catch (e) {
    console.error(e)
    toast.error('No se pudo cargar el listado de documentación')
  } finally {
    loading.value = false
  }
}

watch([filterStatus, filterDateFrom, filterDateTo, filterCode, filterExternal, filterSearch, filterOnlyWithDocuments], () => {
  if (skipFilterWatch.value) {
    return
  }
  if (listFilterDebounce) {
    clearTimeout(listFilterDebounce)
  }
  listFilterDebounce = setTimeout(() => {
    listFilterDebounce = null
    pagination.value.current_page = 1
    void fetchRows()
  }, 400)
})

function clearFilters(): void {
  if (listFilterDebounce) {
    clearTimeout(listFilterDebounce)
    listFilterDebounce = null
  }
  skipFilterWatch.value = true
  filterStatus.value = 'all'
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterCode.value = ''
  filterExternal.value = ''
  filterSearch.value = ''
  filterOnlyWithDocuments.value = false
  pagination.value.current_page = 1
  nextTick(() => {
    skipFilterWatch.value = false
    void fetchRows()
  })
}

function goToPage(page: number): void {
  pagination.value.current_page = page
  void fetchRows()
}

function formatCreatedAt(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function debtorLine(row: DocumentationVaultListRow): string {
  const d = row.debtor_summary
  if (!d) {
    return '—'
  }
  const name = d.full_name?.trim() || '—'
  const doc = d.document_number ? `${d.document_type ?? ''} ${d.document_number}`.trim() : ''
  return doc ? `${name} · ${doc}` : name
}

onMounted(() => {
  void fetchRows()
})

onUnmounted(() => {
  if (listFilterDebounce) {
    clearTimeout(listFilterDebounce)
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Documentación
        </h2>
        <p class="mt-1 text-sm text-muted-foreground max-w-2xl">
          Consulte el expediente documental de cada radicación: PDFs generados, checklist por actividad, FNG, asegurabilidad, ente aprobador y demás adjuntos del ciclo de vida.
        </p>
      </div>
      <Button variant="outline" as-child>
        <NuxtLink to="/radicacion">
          <Icon name="i-lucide-file-text" class="mr-2 h-4 w-4" />
          Ir a radicación
        </NuxtLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Radicaciones</CardTitle>
        <CardDescription>
          Filtre por estado, fechas, código o solicitante y abra el expediente completo.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div class="space-y-1.5">
              <Label for="doc-filter-status" class="text-xs text-muted-foreground">Estado</Label>
              <Select v-model="filterStatus">
                <SelectTrigger id="doc-filter-status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in statusFilterOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5 sm:col-span-2">
              <Label for="doc-filter-search" class="text-xs text-muted-foreground">Buscar (código, radicado externo, documento o nombre)</Label>
              <Input
                id="doc-filter-search"
                v-model="filterSearch"
                placeholder="Ej. RAD-2026, cédula o apellido"
              />
            </div>
            <div class="space-y-1.5">
              <Label for="doc-filter-code" class="text-xs text-muted-foreground">Código interno</Label>
              <Input id="doc-filter-code" v-model="filterCode" placeholder="RAD-…" />
            </div>
            <div class="space-y-1.5">
              <Label for="doc-filter-ext" class="text-xs text-muted-foreground">Radicado externo</Label>
              <Input id="doc-filter-ext" v-model="filterExternal" />
            </div>
            <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <div class="flex items-center gap-2 pb-2">
                <Checkbox
                  id="doc-filter-with-files"
                  :model-value="filterOnlyWithDocuments"
                  @update:model-value="filterOnlyWithDocuments = !!$event"
                />
                <Label for="doc-filter-with-files" class="text-sm font-normal cursor-pointer">
                  Solo con archivos
                </Label>
              </div>
            </div>
          </div>
          <DateRangeStringPicker
            id="doc-filter-range"
            v-model:from="filterDateFrom"
            v-model:to="filterDateTo"
          />
          <div class="flex justify-end">
            <Button type="button" variant="outline" :disabled="!hasActiveFilters" @click="clearFilters">
              Limpiar filtros
            </Button>
          </div>
        </div>

        <p v-if="!loading" class="text-sm text-muted-foreground">
          {{ pagination.total }} radicación{{ pagination.total === 1 ? '' : 'es' }} encontrada{{ pagination.total === 1 ? '' : 's' }}.
        </p>

        <div v-if="loading" class="flex justify-center py-10">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="rows.length === 0" class="py-12 text-center text-muted-foreground">
          <template v-if="hasActiveFilters">
            No hay resultados con los filtros actuales.
          </template>
          <template v-else>
            No hay radicaciones registradas.
          </template>
        </div>
        <div v-else class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Deudor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Archivos</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead class="text-right">
                  Expediente
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in rows" :key="row.id">
                <TableCell class="font-medium font-mono text-sm">
                  {{ row.code || '—' }}
                </TableCell>
                <TableCell class="max-w-[240px] text-sm leading-snug">
                  {{ debtorLine(row) }}
                </TableCell>
                <TableCell>
                  <Badge :variant="getCreditApplicationStatusBadgeVariant(row.status)">
                    {{ getCreditApplicationStatusLabel(row.status) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span class="tabular-nums">{{ row.documents_count }}</span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
                  {{ formatCreatedAt(row.created_at) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="router.push(`/documentacion/${row.id}`)"
                  >
                    <Icon name="i-lucide-folder-open" class="mr-2 h-4 w-4" />
                    Ver documentos
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="pagination.last_page > 1"
          class="flex flex-wrap items-center justify-between gap-2 pt-2"
        >
          <p class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1 || loading"
              @click="goToPage(pagination.current_page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page || loading"
              @click="goToPage(pagination.current_page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
