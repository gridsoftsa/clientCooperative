<script setup lang="ts">
import type { InboxNotificationRow } from '~/composables/useInboxNotificationsApi'
import {
  inboxNotificationEventLabel,
  inboxNotificationModuleIcon,
  inboxNotificationModuleLabel,
  inboxNotificationModuleTone,
  inboxNotificationRelativeTime,
} from '~/utils/inbox-notification-labels'

const props = defineProps<{
  row: InboxNotificationRow
  unread?: boolean
}>()

const eventLabel = computed(() => inboxNotificationEventLabel(props.row.event_type))

function formatAbsoluteDate(value?: string | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <div class="flex items-start gap-3.5">
    <div
      class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
      :class="inboxNotificationModuleTone(row.module)"
    >
      <Icon :name="inboxNotificationModuleIcon(row.module)" class="size-4" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div class="flex min-w-0 items-center gap-2">
          <p
            class="truncate text-sm leading-snug"
            :class="unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'"
          >
            {{ row.title || 'Notificación' }}
          </p>
          <span
            v-if="unread"
            class="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase"
          >
            Nueva
          </span>
        </div>
        <time
          class="shrink-0 text-xs text-muted-foreground"
          :datetime="row.created_at ?? undefined"
          :title="formatAbsoluteDate(row.created_at)"
        >
          {{ inboxNotificationRelativeTime(row.created_at) }}
        </time>
      </div>

      <p
        v-if="row.message"
        class="mt-1 line-clamp-2 text-sm leading-relaxed"
        :class="unread ? 'text-foreground/85' : 'text-muted-foreground'"
      >
        {{ row.message }}
      </p>

      <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" class="h-5 px-1.5 text-[10px] font-medium">
          {{ inboxNotificationModuleLabel(row.module) }}
        </Badge>
        <Badge
          v-if="eventLabel"
          variant="outline"
          class="h-5 px-1.5 text-[10px] font-normal"
        >
          {{ eventLabel }}
        </Badge>
        <span
          v-if="row.filing_number"
          class="font-mono text-[11px] text-muted-foreground"
        >
          {{ row.filing_number }}
        </span>
      </div>
    </div>

    <Icon
      name="i-lucide-chevron-right"
      class="mt-2 hidden size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground sm:block"
    />
  </div>
</template>
