<script setup lang="ts">
import type { ArchivalFileEvent } from '~/types/archival-file'

const props = defineProps<{
  fileId: number
}>()

const archivalApi = useArchivalFileApi()
const loading = ref(true)
const events = ref<ArchivalFileEvent[]>([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

async function loadEvents(page = 1) {
  loading.value = true

  try {
    const response = await archivalApi.fetchEvents(props.fileId, page)
    events.value = response.data
    meta.value = {
      current_page: response.meta.current_page,
      last_page: response.meta.last_page,
      total: response.meta.total,
    }
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
    <template v-else>
      <ul class="space-y-3">
        <ArchivalFileEventListItem
          v-for="event in events"
          :key="event.id"
          :event="event"
        />
      </ul>

      <div
        v-if="meta.last_page > 1"
        class="flex items-center justify-between text-xs text-muted-foreground"
      >
        <span>{{ meta.total }} evento(s)</span>
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="meta.current_page <= 1 || loading"
            @click="loadEvents(meta.current_page - 1)"
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="meta.current_page >= meta.last_page || loading"
            @click="loadEvents(meta.current_page + 1)"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
