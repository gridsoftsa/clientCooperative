<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { NotificationDeliveryRow } from '~/composables/useNotificationDeliveriesApi'
import {
  VENTANILLA_NOTIFICATION_CHANNEL_LABELS,
  VENTANILLA_NOTIFICATION_EVENT_LABELS,
} from '~/constants/ventanilla'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'notificaciones_enviadas_ver',
})

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'internal', label: 'Interno' },
  { value: 'email', label: 'Correo' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'sent', label: 'Enviado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'skipped', label: 'No enviado' },
] as const

const RECIPIENT_ROLE_LABELS: Record<string, string> = {
  assignee: 'Responsable',
  immediate_supervisor: 'Jefe inmediato',
  sender: 'Interesado',
  response_copy: 'Copia',
}

const deliveriesApi = useNotificationDeliveriesApi()
const router = useRouter()

const loading = ref(true)
const rows = ref<NotificationDeliveryRow[]>([])
const channelFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const pagination = ref({ current_page: 1, last_page: 1, per_page: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const sentCount = ref(0)
const failedCount = ref(0)
const skippedCount = ref(0)
const skipFilterWatch = ref(true)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const hasActiveFilters = computed(() =>
  channelFilter.value !== 'all'
  || statusFilter.value !== 'all'
  || Boolean(searchQuery.value.trim())
  || Boolean(filterDateFrom.value)
  || Boolean(filterDateTo.value),
)

function channelLabel(channel: string) {
  return VENTANILLA_NOTIFICATION_CHANNEL_LABELS[channel] ?? channel
}

function eventLabel(eventType: string) {
  return VENTANILLA_NOTIFICATION_EVENT_LABELS[eventType] ?? eventType
}

function roleLabel(role: string | null) {
  if (!role) {
    return null
  }

  return RECIPIENT_ROLE_LABELS[role] ?? role
}

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'failed') {
    return 'destructive'
  }
  if (status === 'skipped') {
    return 'secondary'
  }

  return 'outline'
}

function statusLabel(status: string) {
  if (status === 'failed') {
    return 'Fallido'
  }
  if (status === 'skipped') {
    return 'No enviado'
  }

  return 'Enviado'
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function recipientLabel(row: NotificationDeliveryRow) {
  return row.recipient_user?.name
    ?? row.recipient_user?.email
    ?? row.recipient_address
    ?? 'Sin destinatario'
}

function changePerPage(size: number) {
  pagination.value.per_page = size
  void load(1)
}

async function load(page = pagination.value.current_page) {
  loading.value = true
  try {
    const query: Record<string, string | number> = {
      page,
      per_page: pagination.value.per_page,
    }
    if (channelFilter.value !== 'all') {
      query.channel = channelFilter.value
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

    const response = await deliveriesApi.fetchDeliveries(query)
    rows.value = response.data
    pagination.value = {
      current_page: response.meta.current_page,
      last_page: response.meta.last_page,
      per_page: response.meta.per_page,
      total: response.meta.total,
    }
    sentCount.value = response.meta.sent_count
    failedCount.value = response.meta.failed_count
    skippedCount.value = response.meta.skipped_count
  }
  catch {
    toast.error('No se pudieron cargar las notificaciones enviadas.')
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
  channelFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  await nextTick()
  skipFilterWatch.value = false
  await reloadFromFirstPage()
}

function openFiling(row: NotificationDeliveryRow) {
  void router.push(`/ventanilla/${row.ventanilla_filing_id}`)
}

watch([channelFilter, statusFilter, filterDateFrom, filterDateTo], () => {
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

onMounted(async () => {
  await load(1)
  skipFilterWatch.value = false
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 pb-8 md:px-6">
    <Card class="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/12 via-background to-background">
      <CardContent class="flex flex-col gap-6 p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Icon name="i-lucide-send" class="size-6" />
            </div>
            <div class="space-y-2">
              <div class="space-y-1">
                <h1 class="text-2xl font-semibold tracking-tight">
                  Notificaciones enviadas
                </h1>
                <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Registro de envíos internos, por correo y WhatsApp. Incluye fallidos y los que no se enviaron.
                </p>
              </div>
              <NotificationsInboxTabs />
            </div>
          </div>
        </div>

        <div class="grid w-full grid-cols-3 gap-3 lg:max-w-xl lg:ml-auto">
          <div class="rounded-xl border bg-background/70 px-3 py-2.5 text-center">
            <p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Enviadas
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums">
              {{ sentCount }}
            </p>
          </div>
          <div class="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-center">
            <p class="text-[11px] font-medium tracking-wide text-destructive uppercase">
              Fallidas
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums text-destructive">
              {{ failedCount }}
            </p>
          </div>
          <div class="rounded-xl border bg-background/70 px-3 py-2.5 text-center">
            <p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              No enviadas
            </p>
            <p class="mt-0.5 text-xl font-semibold tabular-nums">
              {{ skippedCount }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="space-y-4 p-4 sm:p-5">
        <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div class="grid w-full gap-1.5 sm:max-w-[200px]">
            <Label for="filter-channel" class="text-xs text-muted-foreground">Canal</Label>
            <Select v-model="channelFilter">
              <SelectTrigger id="filter-channel" class="w-full">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in CHANNEL_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid w-full gap-1.5 sm:max-w-[200px]">
            <Label for="filter-delivery-status" class="text-xs text-muted-foreground">Estado</Label>
            <Select v-model="statusFilter">
              <SelectTrigger id="filter-delivery-status" class="w-full">
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
            <Label for="filter-delivery-search" class="text-xs text-muted-foreground">Búsqueda</Label>
            <div class="relative">
              <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-delivery-search"
                v-model="searchQuery"
                placeholder="Radicado, destinatario o asunto…"
                class="pl-9"
              />
            </div>
          </div>

          <div class="w-full min-w-0 sm:max-w-md">
            <DateRangeStringPicker
              id="filter-sent-range"
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

        <div v-if="loading" class="flex justify-center py-16">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="rows.length === 0" class="py-14 text-center text-muted-foreground">
          <template v-if="hasActiveFilters">
            No hay envíos que coincidan con los filtros.
          </template>
          <template v-else>
            Aún no hay notificaciones enviadas registradas.
          </template>
        </div>

        <div v-else class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead class="hidden md:table-cell">Radicado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead class="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in rows"
                :key="row.id"
                class="cursor-pointer"
                @click="openFiling(row)"
              >
                <TableCell>
                  <Badge :variant="statusVariant(row.status)" class="text-[10px] uppercase">
                    {{ statusLabel(row.status) }}
                  </Badge>
                </TableCell>
                <TableCell class="text-sm">
                  {{ channelLabel(row.channel) }}
                </TableCell>
                <TableCell class="max-w-[16rem] whitespace-normal text-sm">
                  {{ eventLabel(row.event_type) }}
                </TableCell>
                <TableCell class="max-w-[16rem] whitespace-normal text-sm">
                  <p class="break-words">
                    {{ recipientLabel(row) }}
                  </p>
                  <p v-if="roleLabel(row.recipient_role)" class="text-xs text-muted-foreground">
                    {{ roleLabel(row.recipient_role) }}
                  </p>
                  <p
                    v-if="row.error_message"
                    class="mt-1 text-xs"
                    :class="row.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'"
                  >
                    {{ row.error_message }}
                  </p>
                </TableCell>
                <TableCell class="hidden max-w-[14rem] whitespace-normal text-sm md:table-cell">
                  <p class="font-mono text-xs">
                    {{ row.filing_number ?? '—' }}
                  </p>
                  <p v-if="row.filing_subject" class="break-words text-xs text-muted-foreground">
                    {{ row.filing_subject }}
                  </p>
                </TableCell>
                <TableCell class="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {{ formatDate(row.sent_at) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button size="sm" class="h-9 gap-1.5 px-3" @click.stop="openFiling(row)">
                    <Icon name="i-lucide-external-link" class="size-4" />
                    Abrir radicado
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <ListPaginationBar
          v-if="pagination.total > 0"
          :page="pagination.current_page"
          :last-page="pagination.last_page"
          :per-page="pagination.per_page"
          :total="pagination.total"
          item-label="envíos"
          :loading="loading"
          @update:page="load"
          @update:per-page="changePerPage"
        />
      </CardContent>
    </Card>
  </div>
</template>
