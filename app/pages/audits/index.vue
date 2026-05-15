<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'auditoria_ver',
})

const ALL_MODELS = '__all__'
const ALL_EVENTS = '__all__'

type AuditableTypeOption = {
  type: string
  label: string
}

type AuditRow = {
  id: number
  event: string
  auditable_type: string | null
  auditable_type_short: string | null
  auditable_label?: string | null
  auditable_id: string | number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user: { id: number; name: string; email?: string | null } | null
  ip_address?: string | null
  url?: string | null
  tags?: string | null
  created_at: string | null
  description: string
}

type AuditMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const EVENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: ALL_EVENTS, label: 'Todos los eventos' },
  { value: 'created', label: 'Creación' },
  { value: 'updated', label: 'Actualización' },
  { value: 'deleted', label: 'Eliminación' },
  { value: 'restored', label: 'Restauración' },
  { value: 'sync', label: 'Sincronización' },
  { value: 'attach', label: 'Vinculación' },
  { value: 'detach', label: 'Desvinculación' },
]

const PER_PAGE_OPTIONS = [15, 25, 50] as const

const { $api } = useNuxtApp()

const audits = ref<AuditRow[]>([])
const loading = ref(false)
const loadingAuditableTypes = ref(false)
const auditableTypes = ref<AuditableTypeOption[]>([])
const pagination = ref<AuditMeta>({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAuditableType = ref<string>(ALL_MODELS)
const filterEvent = ref<string>(ALL_EVENTS)
const expandedId = ref<number | null>(null)

function eventLabel(event: string): string {
  const map: Record<string, string> = {
    created: 'Creación',
    updated: 'Actualización',
    deleted: 'Eliminación',
    restored: 'Restauración',
    sync: 'Sincronización',
    attach: 'Vinculación',
    detach: 'Desvinculación',
  }
  return map[event] ?? event
}

function eventBadgeVariant(event: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (event === 'deleted') {
    return 'destructive'
  }
  if (event === 'updated') {
    return 'secondary'
  }
  if (event === 'created') {
    return 'default'
  }
  if (event === 'restored') {
    return 'outline'
  }
  return 'outline'
}

function formatJsonPreview(obj: Record<string, unknown> | null): string {
  if (obj == null || Object.keys(obj).length === 0) {
    return '—'
  }
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function auditQueryParams(): Record<string, string | number> {
  const q: Record<string, string | number> = {
    per_page: pagination.value.per_page,
    page: pagination.value.current_page,
  }
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()
  if (from) {
    q.date_from = from
  }
  if (to) {
    q.date_to = to
  }
  if (filterAuditableType.value !== ALL_MODELS && filterAuditableType.value) {
    q.auditable_type = filterAuditableType.value
  }
  if (filterEvent.value !== ALL_EVENTS && filterEvent.value) {
    q.event = filterEvent.value
  }
  return q
}

async function fetchAuditableTypes(): Promise<void> {
  loadingAuditableTypes.value = true
  try {
    const res = await $api<{ data: AuditableTypeOption[] }>('/audit/auditable-types')
    auditableTypes.value = Array.isArray(res.data) ? res.data : []
  } catch (e: unknown) {
    console.error(e)
    auditableTypes.value = []
  } finally {
    loadingAuditableTypes.value = false
  }
}

async function fetchAudits(): Promise<void> {
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la final.')
    return
  }

  loading.value = true
  expandedId.value = null
  try {
    const res = await $api<{ data: AuditRow[]; meta: AuditMeta }>('/audit', {
      query: auditQueryParams(),
    })
    audits.value = res.data ?? []
    pagination.value = res.meta
  } catch (e: unknown) {
    console.error(e)
    const msg = messageFromFetchError(e, 'No se pudo cargar el registro de auditoría.')
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

function goPage(page: number): void {
  pagination.value.current_page = page
  void fetchAudits()
}

function toggleRowDetail(id: number): void {
  expandedId.value = expandedId.value === id ? null : id
}

async function copyJson(label: string, obj: Record<string, unknown> | null): Promise<void> {
  const text = formatJsonPreview(obj)
  if (text === '—') {
    toast.info('No hay datos para copiar.')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  } catch {
    toast.error('No se pudo copiar (permiso del navegador).')
  }
}

function clearFilters(): void {
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAuditableType.value = ALL_MODELS
  filterEvent.value = ALL_EVENTS
  pagination.value.current_page = 1
  pagination.value.per_page = 15
  expandedId.value = null

  void fetchAudits()
}

watchDebounced(
  [filterDateFrom, filterDateTo, filterAuditableType, filterEvent],
  () => {
    const from = filterDateFrom.value.trim()
    const to = filterDateTo.value.trim()
    if (from && to && from > to) {
      toast.error('La fecha inicial no puede ser posterior a la final.')
      return
    }
    pagination.value.current_page = 1
    void fetchAudits()
  },
  { debounce: 400 },
)

watch(
  () => pagination.value.per_page,
  (next, prev) => {
    if (prev === undefined || next === prev) {
      return
    }
    pagination.value.current_page = 1
    void fetchAudits()
  },
)

onMounted(async () => {
  await fetchAuditableTypes()
  await fetchAudits()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-16 pt-2 sm:px-6 lg:px-8">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-6">
      <div class="space-y-2 max-w-3xl">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="i-lucide-scroll-text" class="h-4 w-4 shrink-0" />
          <span>Traza de actividad</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
          Auditoría
        </h1>
        <p class="text-muted-foreground text-sm leading-relaxed sm:text-base">
          Consulte quién cambió qué y cuándo. Use filtros para acotar por fechas, tipo de registro o acción.
          El detalle técnico (valores previos y nuevos) se despliega por fila.
        </p>
      </div>
      <Button variant="outline" size="sm" class="shrink-0" :disabled="loading" @click="fetchAudits">
        <Icon name="i-lucide-refresh-cw" :class="['mr-2 h-4 w-4', loading && 'animate-spin']" />
        Actualizar
      </Button>
    </div>

    <Card class="shadow-sm">
      <CardHeader class="gap-1 pb-2">
        <CardTitle class="text-lg">
          Historial de eventos
        </CardTitle>
        <CardDescription class="leading-relaxed">
          Acciones auditadas sobre los modelos del sistema (creación, edición, borrado, restauración y relaciones).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:p-5">
          <div class="grid gap-4 lg:grid-cols-12 lg:items-end">
            <div class="min-w-0 lg:col-span-4">
              <DateRangeStringPicker
                id="audit-date-range"
                label="Rango de fechas"
                v-model:from="filterDateFrom"
                v-model:to="filterDateTo"
                placeholder-text="Cualquier fecha"
                compact
              />
            </div>
            <div class="grid min-w-0 gap-1.5 lg:col-span-3">
              <Label for="audit-model-filter" class="leading-snug">Tipo de registro</Label>
              <Select v-model="filterAuditableType">
                <SelectTrigger id="audit-model-filter" class="w-full min-w-0">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent class="max-h-72">
                  <SelectItem :value="ALL_MODELS">
                    Todos los tipos
                  </SelectItem>
                  <SelectItem
                    v-for="opt in auditableTypes"
                    :key="opt.type"
                    :value="opt.type"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="loadingAuditableTypes" class="text-xs text-muted-foreground">
                Cargando tipos…
              </p>
            </div>
            <div class="grid min-w-0 gap-1.5 lg:col-span-3">
              <Label for="audit-event-filter" class="leading-snug">Acción</Label>
              <Select v-model="filterEvent">
                <SelectTrigger id="audit-event-filter" class="w-full min-w-0">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in EVENT_FILTER_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid min-w-0 gap-1.5 lg:col-span-2">
              <Label for="audit-per-page" class="leading-snug">Por página</Label>
              <Select
                :model-value="String(pagination.per_page)"
                @update:model-value="(v) => { pagination.per_page = Number(v) }"
              >
                <SelectTrigger id="audit-per-page" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="n in PER_PAGE_OPTIONS"
                    :key="n"
                    :value="String(n)"
                  >
                    {{ n }} filas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" @click="clearFilters">
              <Icon name="i-lucide-filter-x" class="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </div>

        <div
          v-if="!loading && pagination.total > 0"
          class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            <span class="font-medium text-foreground">{{ pagination.total }}</span>
            evento(s) · página
            <span class="font-medium text-foreground">{{ pagination.current_page }}</span>
            de
            <span class="font-medium text-foreground">{{ pagination.last_page }}</span>
          </span>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16">
          <Icon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="audits.length === 0" class="rounded-lg border border-dashed py-14 text-center">
          <Icon name="i-lucide-inbox" class="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
          <p class="font-medium text-foreground">
            Sin resultados
          </p>
          <p class="mt-1 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            No hay eventos con los filtros actuales. Amplíe fechas o quite filtros para ver más registros.
          </p>
        </div>
        <div v-else class="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead class="whitespace-nowrap min-w-[9rem]">
                  Fecha
                </TableHead>
                <TableHead class="whitespace-nowrap w-[8.5rem]">
                  Acción
                </TableHead>
                <TableHead class="min-w-[12rem]">
                  Registro
                </TableHead>
                <TableHead class="min-w-[10rem]">
                  Usuario
                </TableHead>
                <TableHead class="min-w-[14rem]">
                  Resumen
                </TableHead>
                <TableHead class="w-12 text-right pr-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="row in audits" :key="row.id">
                <TableRow
                  class="transition-colors hover:bg-muted/40"
                  :data-state="expandedId === row.id ? 'open' : 'closed'"
                >
                  <TableCell class="align-top text-sm tabular-nums text-muted-foreground">
                    <time :title="row.created_at ?? undefined">{{ formatWhen(row.created_at) }}</time>
                  </TableCell>
                  <TableCell class="align-top">
                    <Badge :variant="eventBadgeVariant(row.event)" class="whitespace-nowrap font-normal">
                      {{ eventLabel(row.event) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="align-top text-sm">
                    <span class="font-medium text-foreground">
                      {{ row.auditable_label ?? row.auditable_type_short ?? row.auditable_type ?? '—' }}
                    </span>
                    <span v-if="row.auditable_id != null" class="text-muted-foreground">
                      · #{{ row.auditable_id }}
                    </span>
                  </TableCell>
                  <TableCell class="align-top text-sm">
                    <template v-if="row.user">
                      <span class="text-foreground">{{ row.user.name }}</span>
                      <span v-if="row.user.email" class="block text-xs text-muted-foreground truncate max-w-[14rem]">
                        {{ row.user.email }}
                      </span>
                      <span v-if="row.ip_address" class="block text-xs text-muted-foreground/80 font-mono mt-0.5">
                        {{ row.ip_address }}
                      </span>
                    </template>
                    <span v-else class="text-muted-foreground">Sistema / no resuelto</span>
                  </TableCell>
                  <TableCell class="align-top text-sm text-muted-foreground leading-snug max-w-md">
                    {{ row.description }}
                  </TableCell>
                  <TableCell class="align-top text-right pr-1 w-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 shrink-0"
                      :aria-expanded="expandedId === row.id"
                      :aria-label="expandedId === row.id ? 'Ocultar detalle' : 'Ver detalle'"
                      @click.stop="toggleRowDetail(row.id)"
                    >
                      <Icon
                        :name="expandedId === row.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        class="h-4 w-4"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow v-if="expandedId === row.id" class="hover:bg-muted/20 bg-muted/15 border-t-0">
                  <TableCell colspan="6" class="p-0">
                    <div
                      v-if="(row.old_values && Object.keys(row.old_values).length) || (row.new_values && Object.keys(row.new_values).length)"
                      class="border-t border-border/80 p-4 sm:p-5"
                      @click.stop
                    >
                      <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cambios técnicos (JSON)
                      </p>
                      <div class="grid gap-3 md:grid-cols-2">
                        <div class="rounded-lg border bg-background p-3 shadow-xs">
                          <div class="mb-2 flex items-center justify-between gap-2">
                            <span class="text-xs font-semibold text-muted-foreground">Valores anteriores</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-7 text-xs"
                              @click="copyJson('Valores anteriores', row.old_values)"
                            >
                              <Icon name="i-lucide-copy" class="mr-1 h-3 w-3" />
                              Copiar
                            </Button>
                          </div>
                          <pre class="max-h-56 overflow-auto rounded-md bg-muted/50 p-2 text-xs leading-relaxed whitespace-pre-wrap font-mono">{{ formatJsonPreview(row.old_values) }}</pre>
                        </div>
                        <div class="rounded-lg border bg-background p-3 shadow-xs">
                          <div class="mb-2 flex items-center justify-between gap-2">
                            <span class="text-xs font-semibold text-muted-foreground">Valores nuevos</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-7 text-xs"
                              @click="copyJson('Valores nuevos', row.new_values)"
                            >
                              <Icon name="i-lucide-copy" class="mr-1 h-3 w-3" />
                              Copiar
                            </Button>
                          </div>
                          <pre class="max-h-56 overflow-auto rounded-md bg-muted/50 p-2 text-xs leading-relaxed whitespace-pre-wrap font-mono">{{ formatJsonPreview(row.new_values) }}</pre>
                        </div>
                      </div>
                      <p v-if="row.url" class="mt-3 truncate text-xs text-muted-foreground">
                        <span class="font-medium">URL:</span>
                        {{ row.url }}
                      </p>
                    </div>
                    <div v-else class="border-t border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
                      No hay valores anterior / nuevo registrados para este evento.
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="!loading && pagination.last_page > 1"
          class="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="goPage(1)"
            >
              <Icon name="i-lucide-chevrons-left" class="mr-1 h-4 w-4" />
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="goPage(pagination.current_page - 1)"
            >
              <Icon name="i-lucide-chevron-left" class="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="goPage(pagination.current_page + 1)"
            >
              Siguiente
              <Icon name="i-lucide-chevron-right" class="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="goPage(pagination.last_page)"
            >
              Última
              <Icon name="i-lucide-chevrons-right" class="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
