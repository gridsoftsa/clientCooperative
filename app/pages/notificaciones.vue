<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'
import {
  inboxNotificationEventLabel,
  inboxNotificationModuleLabel,
  inboxNotificationOpenAction,
  inboxNotificationRelativeTime,
} from '~/utils/inbox-notification-labels'

definePageMeta({
  layout: 'default',
})

const PAGE_SIZE = 10

const MODULE_OPTIONS = [
  { value: 'all', label: 'Todos los módulos' },
  { value: 'ventanilla', label: 'Ventanilla' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'comunicados', label: 'Comunicados' },
] as const

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Sin leer' },
  { value: 'read', label: 'Leídas' },
] as const

const inboxApi = useInboxNotificationsApi()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const markingAll = ref(false)
const rows = ref<InboxNotificationRow[]>([])
const unreadCount = ref(0)
const inboxTotal = ref(0)
const moduleFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const pagination = ref({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
const skipFilterWatch = ref(true)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const hasActiveFilters = computed(() =>
  moduleFilter.value !== 'all'
  || statusFilter.value !== 'all'
  || Boolean(searchQuery.value.trim())
  || Boolean(filterDateFrom.value)
  || Boolean(filterDateTo.value),
)

const rangeStart = computed(() => {
  const total = pagination.value.total
  if (total === 0) {
    return 0
  }

  return (pagination.value.current_page - 1) * pagination.value.per_page + 1
})

const rangeEnd = computed(() => {
  const total = pagination.value.total
  if (total === 0) {
    return 0
  }

  return Math.min(pagination.value.current_page * pagination.value.per_page, total)
})

const readCount = computed(() => Math.max(0, inboxTotal.value - unreadCount.value))

function applyModuleFromQuery() {
  const module = route.query.module
  if (module === 'ventanilla' || module === 'comunicados' || module === 'workflow') {
    moduleFilter.value = module
  }
}

function formatAbsoluteDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function eventLabelFor(row: InboxNotificationRow) {
  return inboxNotificationEventLabel(row.event_type)
}

function openAction(row: InboxNotificationRow) {
  return inboxNotificationOpenAction(row)
}

async function load(page = pagination.value.current_page) {
  loading.value = true
  try {
    const query: Record<string, string | number> = {
      page,
      per_page: PAGE_SIZE,
    }
    if (moduleFilter.value !== 'all') {
      query.module = moduleFilter.value
    }
    if (statusFilter.value !== 'all') {
      query.status = statusFilter.value
    }
    const q = searchQuery.value.trim()
    if (q) {
      query.q = q
    }
    if (filterDateFrom.value) {
      query.from = filterDateFrom.value
    }
    if (filterDateTo.value) {
      query.to = filterDateTo.value
    }

    const statsQuery: Record<string, string | number> = {
      page: 1,
      per_page: 1,
    }
    if (moduleFilter.value !== 'all') {
      statsQuery.module = moduleFilter.value
    }

    const [response, stats] = await Promise.all([
      inboxApi.fetchInbox(query),
      inboxApi.fetchInbox(statsQuery),
    ])
    rows.value = response.data
    pagination.value = {
      current_page: response.meta.current_page,
      last_page: response.meta.last_page,
      per_page: response.meta.per_page,
      total: response.meta.total,
    }
    inboxTotal.value = stats.meta.total
    unreadCount.value = stats.meta.unread_count
  }
  catch {
    toast.error('No se pudieron cargar las notificaciones.')
    rows.value = []
  }
  finally {
    loading.value = false
  }
}

function reloadFromFirstPage() {
  pagination.value.current_page = 1
  return load(1)
}

async function clearFilters() {
  skipFilterWatch.value = true
  moduleFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  await nextTick()
  skipFilterWatch.value = false
  await reloadFromFirstPage()
}

async function openNotification(row: InboxNotificationRow) {
  if (!row.read_at) {
    try {
      await inboxApi.markRead(row.id)
      row.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    catch {
      toast.error('No se pudo marcar como leída.')
    }
  }

  if (row.url) {
    await router.push(row.url)
    return
  }
  if (row.communication_id) {
    await router.push(`/comunicados/${row.communication_id}`)
    return
  }
  if (row.ventanilla_filing_id) {
    await router.push(`/ventanilla/${row.ventanilla_filing_id}`)
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    await inboxApi.markAllRead(moduleFilter.value === 'all' ? undefined : moduleFilter.value)
    toast.success('Notificaciones marcadas como leídas.')
    await load()
  }
  catch {
    toast.error('No se pudieron marcar las notificaciones.')
  }
  finally {
    markingAll.value = false
  }
}

watch([moduleFilter, statusFilter, filterDateFrom, filterDateTo], () => {
  if (skipFilterWatch.value) {
    return
  }
  reloadFromFirstPage()
})

watch(searchQuery, () => {
  if (skipFilterWatch.value) {
    return
  }
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }
  searchDebounce = setTimeout(() => {
    reloadFromFirstPage()
  }, 400)
})

watch(() => route.query.module, () => applyModuleFromQuery())

onMounted(async () => {
  applyModuleFromQuery()
  await load(1)
  skipFilterWatch.value = false
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 pb-8 md:px-6">
    <Card class="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/12 via-background to-background">
      <CardContent class="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div class="flex items-start gap-4">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <Icon name="i-lucide-bell" class="size-6" />
          </div>
          <div class="space-y-2">
            <div class="space-y-1">
              <h1 class="text-2xl font-semibold tracking-tight">
                Notificaciones
              </h1>
              <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Avisos de ventanilla, workflow y comunicados. Las no leídas quedan resaltadas hasta que las abra.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="markingAll || unreadCount === 0"
              @click="markAllRead"
            >
              <Icon name="i-lucide-check-check" class="mr-1.5 size-4" />
              {{ markingAll ? 'Marcando…' : 'Marcar todas leídas' }}
            </Button>
          </div>
        </div>

        <div class="grid w-full grid-cols-3 gap-3 sm:max-w-none sm:min-w-[28rem] lg:w-[32rem]">
          <div class="rounded-xl border bg-background/70 px-3 py-2.5 text-center backdrop-blur-sm">
            <p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Total
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums">
              {{ inboxTotal }}
            </p>
          </div>
          <div class="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-center">
            <p class="text-[11px] font-medium tracking-wide text-primary uppercase">
              Sin leer
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums text-primary">
              {{ unreadCount }}
            </p>
          </div>
          <div class="rounded-xl border bg-background/70 px-3 py-2.5 text-center backdrop-blur-sm">
            <p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Leídas
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums">
              {{ readCount }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="space-y-4 p-4 sm:p-5">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div class="grid w-full gap-1.5 sm:max-w-[220px]">
            <Label for="filter-module" class="text-xs text-muted-foreground">Módulo</Label>
            <Select v-model="moduleFilter">
              <SelectTrigger id="filter-module" class="w-full">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in MODULE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid w-full gap-1.5 sm:max-w-[180px]">
            <Label for="filter-status" class="text-xs text-muted-foreground">Estado</Label>
            <Select v-model="statusFilter">
              <SelectTrigger id="filter-status" class="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid w-full min-w-0 flex-1 gap-1.5 sm:max-w-sm">
            <Label for="filter-search" class="text-xs text-muted-foreground">Búsqueda</Label>
            <div class="relative">
              <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-search"
                v-model="searchQuery"
                placeholder="Título, mensaje o radicado…"
                class="pl-9"
              />
            </div>
          </div>

          <div class="w-full min-w-0 sm:max-w-md">
            <DateRangeStringPicker
              id="filter-created-range"
              v-model:from="filterDateFrom"
              v-model:to="filterDateTo"
              compact
              label="Fecha"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            :disabled="!hasActiveFilters"
            @click="clearFilters"
          >
            Limpiar filtros
          </Button>
        </div>

        <p v-if="!loading" class="text-sm text-muted-foreground">
          {{ pagination.total }} notificación{{ pagination.total === 1 ? '' : 'es' }}
          <template v-if="pagination.total > 0">
            · mostrando {{ rangeStart }}–{{ rangeEnd }}
          </template>
        </p>

        <div v-if="loading" class="flex justify-center py-16">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="rows.length === 0" class="py-14 text-center text-muted-foreground">
          <template v-if="hasActiveFilters">
            No hay notificaciones que coincidan con los filtros.
            <button type="button" class="text-primary underline underline-offset-2" @click="clearFilters">
              Limpiar filtros
            </button>
          </template>
          <template v-else>
            No hay notificaciones en la bandeja.
          </template>
        </div>

        <div v-else class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-[7rem]">Estado</TableHead>
                <TableHead class="w-[8rem]">Módulo</TableHead>
                <TableHead>Notificación</TableHead>
                <TableHead class="hidden w-[11rem] md:table-cell">Evento</TableHead>
                <TableHead class="w-[9rem]">Fecha</TableHead>
                <TableHead class="w-[11rem] text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in rows"
                :key="row.id"
                class="cursor-pointer"
                :class="row.read_at ? '' : 'bg-primary/5'"
                @click="openNotification(row)"
              >
                <TableCell>
                  <Badge :variant="row.read_at ? 'secondary' : 'default'" class="text-[10px] uppercase">
                    {{ row.read_at ? 'Leída' : 'Sin leer' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-sm">
                  {{ inboxNotificationModuleLabel(row.module) }}
                </TableCell>
                <TableCell class="max-w-[28rem]">
                  <p class="truncate text-sm" :class="row.read_at ? 'font-medium' : 'font-semibold'">
                    {{ row.title || 'Notificación' }}
                  </p>
                  <p v-if="row.message" class="mt-0.5 truncate text-xs text-muted-foreground">
                    {{ row.message }}
                  </p>
                </TableCell>
                <TableCell class="hidden text-sm text-muted-foreground md:table-cell">
                  {{ eventLabelFor(row) || '—' }}
                </TableCell>
                <TableCell class="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  <span :title="formatAbsoluteDate(row.created_at)">
                    {{ inboxNotificationRelativeTime(row.created_at) }}
                  </span>
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="openAction(row).label"
                    size="sm"
                    class="h-9 gap-1.5 px-3"
                    :title="openAction(row).title"
                    @click.stop="openNotification(row)"
                  >
                    <Icon name="i-lucide-external-link" class="size-4" />
                    {{ openAction(row).label }}
                  </Button>
                  <Button
                    v-else
                    size="icon"
                    class="size-10 shadow-sm"
                    :title="openAction(row).title"
                    @click.stop="openNotification(row)"
                  >
                    <Icon name="i-lucide-external-link" class="size-5" />
                    <span class="sr-only">{{ openAction(row).title }}</span>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div
          v-if="pagination.last_page > 1"
          class="flex items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <p>
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
            · {{ pagination.per_page }} por página
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="loading || pagination.current_page <= 1"
              @click="load(pagination.current_page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="loading || pagination.current_page >= pagination.last_page"
              @click="load(pagination.current_page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
