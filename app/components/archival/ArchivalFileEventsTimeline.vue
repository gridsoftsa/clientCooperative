<script setup lang="ts">
import type { ArchivalFileEvent } from '~/types/archival-file'

const props = defineProps<{
  fileId: number
}>()

const archivalApi = useArchivalFileApi()
const loading = ref(true)
const events = ref<ArchivalFileEvent[]>([])

async function loadEvents() {
  loading.value = true

  try {
    events.value = (await archivalApi.fetchEvents(props.fileId)).data
  }
  catch {
    events.value = []
  }
  finally {
    loading.value = false
  }
}

watch(() => props.fileId, () => loadEvents(), { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <div v-if="loading" class="text-sm text-muted-foreground">
      Cargando auditoría…
    </div>
    <p v-else-if="events.length === 0" class="text-sm text-muted-foreground">
      Sin eventos registrados.
    </p>
    <ul v-else class="space-y-3">
      <li
        v-for="event in events"
        :key="event.id"
        class="rounded-md border px-3 py-2 text-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">{{ event.event_type }}</span>
          <span v-if="event.created_at" class="text-xs text-muted-foreground">
            {{ new Date(event.created_at).toLocaleString('es-CO') }}
          </span>
        </div>
        <p v-if="event.description" class="mt-1 text-muted-foreground">
          {{ event.description }}
        </p>
        <p v-if="event.created_by?.name" class="mt-1 text-xs text-muted-foreground">
          Por: {{ event.created_by.name }}
        </p>
      </li>
    </ul>
  </div>
</template>
