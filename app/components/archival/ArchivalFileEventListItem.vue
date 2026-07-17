<script setup lang="ts">
import type { ArchivalFileEvent } from '~/types/archival-file'
import { archivalFileEventTypeLabel } from '~/constants/archival-file-events'

defineProps<{
  event: ArchivalFileEvent
  showFile?: boolean
}>()

function eventLabel(event: ArchivalFileEvent): string {
  return event.event_type_label ?? archivalFileEventTypeLabel(event.event_type)
}
</script>

<template>
  <li class="rounded-md border px-3 py-2 text-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-medium">{{ eventLabel(event) }}</span>
      <span v-if="event.created_at" class="text-xs text-muted-foreground">
        {{ new Date(event.created_at).toLocaleString('es-CO') }}
      </span>
    </div>

    <p
      v-if="showFile && (event.file_number || event.file_title)"
      class="mt-1 text-xs text-muted-foreground"
    >
      Expediente:
      <NuxtLink
        v-if="event.archival_file_id"
        :to="`/expedientes/${event.archival_file_id}`"
        class="font-mono text-primary hover:underline"
      >
        {{ event.file_number }}
      </NuxtLink>
      <span v-if="event.file_title"> — {{ event.file_title }}</span>
    </p>

    <p v-if="event.description" class="mt-1 text-muted-foreground">
      {{ event.description }}
    </p>

    <p v-if="event.document?.title" class="mt-1 text-xs text-muted-foreground">
      Documento: {{ event.document.title }}
    </p>

    <p v-if="event.created_by?.name" class="mt-1 text-xs text-muted-foreground">
      Por: {{ event.created_by.name }}
    </p>
  </li>
</template>
