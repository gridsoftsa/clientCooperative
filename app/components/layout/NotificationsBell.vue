<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'

const router = useRouter()
const inboxApi = useInboxNotificationsApi()

const open = ref(false)
const loading = ref(false)
const unreadCount = ref(0)
const items = ref<InboxNotificationRow[]>([])

async function refresh() {
  if (import.meta.server) {
    return
  }

  loading.value = true
  try {
    const response = await inboxApi.fetchInbox({
      per_page: 8,
      page: 1,
    })
    items.value = response.data
    unreadCount.value = response.meta.unread_count
  }
  catch {
    // Silencioso en header para no spamear toasts
  }
  finally {
    loading.value = false
  }
}

async function openItem(row: InboxNotificationRow) {
  if (!row.read_at) {
    try {
      await inboxApi.markRead(row.id)
      row.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    catch {
      toast.error('No se pudo marcar la notificación.')
    }
  }

  open.value = false

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

function formatDate(value?: string | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(open, (isOpen) => {
  if (isOpen) {
    refresh()
  }
})

onMounted(() => {
  refresh()
  const timer = window.setInterval(refresh, 60_000)
  onBeforeUnmount(() => window.clearInterval(timer))
})
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative text-header-foreground hover:bg-header-foreground/10"
        aria-label="Notificaciones"
      >
        <Icon name="i-lucide-bell" class="size-5" />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-80 p-0">
      <div class="flex items-center justify-between border-b px-3 py-2">
        <p class="text-sm font-medium">
          Notificaciones
        </p>
        <NuxtLink
          class="text-xs text-primary hover:underline"
          to="/notificaciones"
          @click="open = false"
        >
          Ver todas
        </NuxtLink>
      </div>
      <div v-if="loading && items.length === 0" class="px-3 py-8 text-center text-sm text-muted-foreground">
        Cargando...
      </div>
      <div v-else-if="items.length === 0" class="px-3 py-8 text-center text-sm text-muted-foreground">
        No hay notificaciones.
      </div>
      <div v-else class="max-h-80 overflow-y-auto">
        <button
          v-for="row in items"
          :key="row.id"
          type="button"
          class="flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50"
          :class="{ 'bg-primary/5': !row.read_at }"
          @click="openItem(row)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-medium leading-snug">
              {{ row.title || 'Notificación' }}
            </p>
            <span
              v-if="!row.read_at"
              class="mt-1 size-2 shrink-0 rounded-full bg-primary"
            />
          </div>
          <p v-if="row.message" class="line-clamp-2 text-xs text-muted-foreground">
            {{ row.message }}
          </p>
          <p class="text-[11px] text-muted-foreground">
            {{ formatDate(row.created_at) }}
          </p>
        </button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
