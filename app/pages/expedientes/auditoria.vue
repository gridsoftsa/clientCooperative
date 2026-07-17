<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileEvent, ArchivalFileEventType } from '~/types/archival-file'
import { ARCHIVAL_FILE_EVENT_TYPE_LABELS } from '~/constants/archival-file-events'
import { defaultCurrentMonthDateRange } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_ver',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()

const defaultDateRange = defaultCurrentMonthDateRange()
const PER_PAGE_OPTIONS = [10, 15, 25, 50] as const

const loading = ref(true)
const events = ref<ArchivalFileEvent[]>([])
const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 15 })

const search = ref('')
const eventTypeFilter = ref<ArchivalFileEventType | 'all'>('all')
const createdFrom = ref(defaultDateRange.from)
const createdTo = ref(defaultDateRange.to)

const eventTypeOptions = computed(() =>
  Object.entries(ARCHIVAL_FILE_EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
)

type EventGroup = {
  archival_file_id: number
  file_number: string | null
  file_title: string | null
  events: ArchivalFileEvent[]
}

const groupedEvents = computed<EventGroup[]>(() => {
  const groups = new Map<number, EventGroup>()

  for (const event of events.value) {
    const fileId = event.archival_file_id
    const existing = groups.get(fileId)

    if (existing) {
      existing.events.push(event)
      continue
    }

    groups.set(fileId, {
      archival_file_id: fileId,
      file_number: event.file_number ?? null,
      file_title: event.file_title ?? null,
      events: [event],
    })
  }

  return [...groups.values()]
})

const showPagination = computed(() => meta.value.total > 0 && meta.value.last_page > 1)

async function loadEvents(page = 1) {
  if (createdFrom.value && createdTo.value && createdFrom.value > createdTo.value) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
    return
  }

  loading.value = true

  try {
    const query: Record<string, string | number> = {
      page,
      per_page: meta.value.per_page,
    }

    if (search.value.trim()) {
      query.search = search.value.trim()
    }

    if (eventTypeFilter.value !== 'all') {
      query.event_type = eventTypeFilter.value
    }

    if (createdFrom.value) {
      query.created_from = createdFrom.value
    }

    if (createdTo.value) {
      query.created_to = createdTo.value
    }

    const response = await archivalApi.fetchGlobalEvents(query)
    events.value = response.data
    meta.value = {
      current_page: response.meta.current_page,
      last_page: response.meta.last_page,
      total: response.meta.total,
      per_page: response.meta.per_page,
    }
  }
  catch {
    toast.error('No se pudo cargar la auditoría de expedientes.')
    events.value = []
  }
  finally {
    loading.value = false
  }
}

function applyFilters() {
  void loadEvents(1)
}

function onPerPageChange(value: unknown) {
  meta.value.per_page = Number(value)
  void loadEvents(1)
}

onMounted(() => loadEvents())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Auditoría de expedientes
        </h1>
        <p class="text-sm text-muted-foreground">
          Registro global de creación, consultas, descargas, cierre, consolidación y transferencias.
          Solo lectura; no editable.
        </p>
      </div>
      <Button variant="outline" @click="router.push('/expedientes')">
        Volver al listado
      </Button>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-lg">
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg border bg-muted/30 p-4 sm:p-5">
          <div class="grid gap-4 lg:grid-cols-12 lg:items-end">
            <div class="grid min-w-0 gap-1.5 lg:col-span-3">
              <Label for="audit_search" class="leading-snug">Buscar</Label>
              <Input
                id="audit_search"
                v-model="search"
                class="h-9"
                placeholder="Expediente, documento o descripción"
                @keyup.enter="applyFilters"
              />
            </div>
            <div class="grid min-w-0 gap-1.5 lg:col-span-2">
              <Label class="leading-snug">Tipo de evento</Label>
              <Select v-model="eventTypeFilter">
                <SelectTrigger class="h-9 w-full min-w-0">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos
                  </SelectItem>
                  <SelectItem
                    v-for="option in eventTypeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="min-w-0 lg:col-span-5">
              <DateRangeStringPicker
                id="audit-date-range"
                label="Rango de fechas"
                v-model:from="createdFrom"
                v-model:to="createdTo"
                placeholder-text="Elegir rango de fechas"
                compact
              />
            </div>
            <div class="flex lg:col-span-2 lg:justify-end">
              <Button class="h-9 w-full lg:w-auto" :disabled="loading" @click="applyFilters">
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Eventos registrados</CardTitle>
          <CardDescription>
            {{ meta.total }} evento(s) en {{ groupedEvents.length }} expediente(s) según los filtros.
          </CardDescription>
        </div>
        <div class="grid w-full gap-1.5 sm:w-40">
          <Label for="audit-per-page" class="text-xs">Por página</Label>
          <Select
            :model-value="String(meta.per_page)"
            :disabled="loading"
            @update:model-value="onPerPageChange"
          >
            <SelectTrigger id="audit-per-page" class="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in PER_PAGE_OPTIONS"
                :key="option"
                :value="String(option)"
              >
                {{ option }} eventos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando auditoría…
        </div>
        <p v-else-if="events.length === 0" class="py-10 text-center text-sm text-muted-foreground">
          No hay eventos para los filtros seleccionados.
        </p>
        <div v-else class="space-y-3">
          <Collapsible
            v-for="group in groupedEvents"
            :key="group.archival_file_id"
            :default-open="groupedEvents.length <= 8"
            class="rounded-md border"
          >
            <CollapsibleTrigger
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              <div class="min-w-0">
                <p class="truncate font-medium">
                  <NuxtLink
                    :to="`/expedientes/${group.archival_file_id}`"
                    class="font-mono text-primary hover:underline"
                    @click.stop
                  >
                    {{ group.file_number ?? `Expediente #${group.archival_file_id}` }}
                  </NuxtLink>
                  <span v-if="group.file_title" class="text-muted-foreground"> — {{ group.file_title }}</span>
                </p>
              </div>
              <Badge variant="secondary" class="shrink-0">
                {{ group.events.length }} evento(s)
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent class="border-t px-3 py-2">
              <ul class="space-y-2">
                <ArchivalFileEventListItem
                  v-for="event in group.events"
                  :key="event.id"
                  :event="event"
                />
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div
          v-if="showPagination"
          class="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <span>
            Página {{ meta.current_page }} de {{ meta.last_page }} · {{ meta.total }} evento(s)
          </span>
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
      </CardContent>
    </Card>
  </div>
</template>
