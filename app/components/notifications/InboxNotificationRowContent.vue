<script setup lang="ts">
import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'
import {
  inboxNotificationEventLabel,
  inboxNotificationModuleLabel,
} from '~/utils/inbox-notification-labels'

defineProps<{
  row: InboxNotificationRow
  unread?: boolean
}>()

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('es-CO')
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <p
        class="text-sm leading-snug"
        :class="unread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'"
      >
        {{ row.title || 'Notificación' }}
      </p>
      <Badge
        v-if="unread"
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
    :class="unread ? 'text-foreground/90' : 'text-muted-foreground'"
  >
    {{ row.message }}
  </p>

  <div class="mt-2 flex flex-wrap items-center gap-2">
    <Badge variant="secondary" class="text-[10px] font-normal">
      {{ inboxNotificationModuleLabel(row.module) }}
    </Badge>
    <Badge
      v-if="inboxNotificationEventLabel(row.event_type)"
      variant="outline"
      class="text-[10px] font-normal"
    >
      {{ inboxNotificationEventLabel(row.event_type) }}
    </Badge>
    <span v-if="row.filing_number" class="text-xs text-muted-foreground">
      Radicado {{ row.filing_number }}
    </span>
  </div>
</template>
