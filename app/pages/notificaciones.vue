<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'

definePageMeta({
  layout: 'default',
})

const inboxApi = useInboxNotificationsApi()
const router = useRouter()

const loading = ref(true)
const markingAll = ref(false)
const rows = ref<InboxNotificationRow[]>([])
const unreadCount = ref(0)
const moduleFilter = ref('all')
const pagination = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })

async function load(page = pagination.value.current_page) {
  loading.value = true
  try {
    const response = await inboxApi.fetchInbox({
      page,
      per_page: pagination.value.per_page,
      module: moduleFilter.value === 'all' ? undefined : moduleFilter.value,
    })
    rows.value = response.data
    unreadCount.value = response.meta.unread_count
    pagination.value = {
      current_page: response.meta.current_page,
      last_page: response.meta.last_page,
      per_page: response.meta.per_page,
      total: response.meta.total,
    }
  }
  catch {
    toast.error('No se pudieron cargar las notificaciones.')
    rows.value = []
  }
  finally {
    loading.value = false
  }
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

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('es-CO')
}

function moduleLabel(module?: string | null) {
  if (module === 'comunicados') {
    return 'Comunicados'
  }
  if (module === 'ventanilla') {
    return 'Ventanilla'
  }
  return 'Sistema'
}

watch(moduleFilter, () => {
  pagination.value.current_page = 1
  load(1)
})

onMounted(() => load())
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Notificaciones
        </h1>
        <p class="text-sm text-muted-foreground">
          Avisos internos de comunicados y ventanilla.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Select v-model="moduleFilter">
          <SelectTrigger class="w-44">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todos
            </SelectItem>
            <SelectItem value="comunicados">
              Comunicados
            </SelectItem>
            <SelectItem value="ventanilla">
              Ventanilla
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          :disabled="markingAll || unreadCount === 0"
          @click="markAllRead"
        >
          Marcar todas leídas
        </Button>
      </div>
    </div>

    <Badge
      v-if="unreadCount > 0"
      variant="secondary"
      class="w-fit border-primary/20 bg-primary/10 text-primary"
    >
      {{ unreadCount }} sin leer
    </Badge>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <Card v-else>
      <CardContent class="p-0">
        <ul v-if="rows.length" class="divide-y">
          <NotificationsInboxNotificationListItem
            v-for="row in rows"
            :key="row.id"
            :unread="!row.read_at"
            @click="openNotification(row)"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <p
                  class="text-sm leading-snug"
                  :class="!row.read_at ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'"
                >
                  {{ row.title || 'Notificación' }}
                </p>
                <Badge
                  v-if="!row.read_at"
                  variant="outline"
                  class="h-5 border-primary/30 bg-primary/5 px-1.5 text-[10px] text-primary uppercase"
                >
                  Nueva
                </Badge>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">{{ formatDate(row.created_at) }}</span>
            </div>
            <p
              class="mt-1 text-sm leading-relaxed"
              :class="!row.read_at ? 'text-foreground/90' : 'text-muted-foreground'"
            >
              {{ row.message }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ moduleLabel(row.module) }}
              <span v-if="row.filing_number"> · Radicado {{ row.filing_number }}</span>
            </p>
          </NotificationsInboxNotificationListItem>
        </ul>
        <p v-else class="px-4 py-12 text-center text-sm text-muted-foreground">
          No hay notificaciones.
        </p>
      </CardContent>
    </Card>

    <div v-if="pagination.last_page > 1" class="flex justify-end gap-2">
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
</template>
