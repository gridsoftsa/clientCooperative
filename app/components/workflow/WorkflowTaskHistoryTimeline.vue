<script setup lang="ts">
import type { WorkflowFilingContext } from '~/types/workflow'

type WorkflowHistoryEvent = WorkflowFilingContext['events'][number]

const props = defineProps<{
  events: WorkflowHistoryEvent[]
}>()

const INITIAL_VISIBLE = 5
const LOAD_MORE_STEP = 5
const SCROLL_THRESHOLD = 4

const visibleCount = ref(INITIAL_VISIBLE)

interface EventPresentation {
  label: string
  icon: string
  nodeClass: string
  badgeClass: string
  accentClass: string
}

const EVENT_PRESENTATION: Record<string, EventPresentation> = {
  instance_started: {
    label: 'Inicio del proceso',
    icon: 'i-lucide-play-circle',
    nodeClass: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200',
    accentClass: 'border-l-violet-500',
  },
  task_created: {
    label: 'Tarea creada',
    icon: 'i-lucide-clipboard-plus',
    nodeClass: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
    accentClass: 'border-l-sky-500',
  },
  advanced: {
    label: 'Avance de etapa',
    icon: 'i-lucide-arrow-right-circle',
    nodeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    accentClass: 'border-l-emerald-500',
  },
  returned: {
    label: 'Devolución',
    icon: 'i-lucide-undo-2',
    nodeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    accentClass: 'border-l-amber-500',
  },
  reassigned: {
    label: 'Reasignación',
    icon: 'i-lucide-user-round-cog',
    nodeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
    accentClass: 'border-l-blue-500',
  },
  comment: {
    label: 'Comentario',
    icon: 'i-lucide-message-square-text',
    nodeClass: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200',
    accentClass: 'border-l-slate-500',
  },
  completed: {
    label: 'Proceso cerrado',
    icon: 'i-lucide-circle-check-big',
    nodeClass: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    badgeClass: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200',
    accentClass: 'border-l-green-500',
  },
  cancelled: {
    label: 'Cancelación',
    icon: 'i-lucide-circle-x',
    nodeClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
    badgeClass: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    accentClass: 'border-l-red-500',
  },
  escalated: {
    label: 'Escalamiento SLA',
    icon: 'i-lucide-triangle-alert',
    nodeClass: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300',
    badgeClass: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
    accentClass: 'border-l-orange-500',
  },
}

const DEFAULT_PRESENTATION: EventPresentation = {
  label: 'Evento',
  icon: 'i-lucide-activity',
  nodeClass: 'border-border bg-muted text-muted-foreground',
  badgeClass: 'border-border bg-muted text-foreground',
  accentClass: 'border-l-muted-foreground/40',
}

const orderedEvents = computed(() => props.events)
const visibleEvents = computed(() => orderedEvents.value.slice(0, visibleCount.value))
const hiddenCount = computed(() => Math.max(0, orderedEvents.value.length - visibleCount.value))
const usesScrollArea = computed(() => visibleEvents.value.length > SCROLL_THRESHOLD)
const compactCards = computed(() => orderedEvents.value.length > 8)

watch(() => props.events, () => {
  visibleCount.value = INITIAL_VISIBLE
}, { deep: true })

function presentationFor(type: string): EventPresentation {
  return EVENT_PRESENTATION[type] ?? {
    ...DEFAULT_PRESENTATION,
    label: type,
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }

  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function actorLabel(event: WorkflowHistoryEvent): string {
  return event.created_by?.name ?? 'Sistema'
}

function showMore() {
  visibleCount.value = Math.min(visibleCount.value + LOAD_MORE_STEP, orderedEvents.value.length)
}

function showAll() {
  visibleCount.value = orderedEvents.value.length
}

function showLess() {
  visibleCount.value = INITIAL_VISIBLE
}
</script>

<template>
  <div v-if="orderedEvents.length" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-gradient-to-r from-muted/50 to-background px-4 py-3 shadow-sm">
      <div>
        <p class="text-sm font-medium">
          Línea de tiempo del proceso
        </p>
        <p class="text-muted-foreground text-xs">
          Mostrando {{ visibleEvents.length }} de {{ orderedEvents.length }} evento(s), del más reciente al más antiguo.
        </p>
      </div>
      <Badge variant="secondary" class="shrink-0">
        {{ orderedEvents.length }} en total
      </Badge>
    </div>

    <div
      class="relative rounded-xl border bg-card/40"
      :class="usesScrollArea ? 'max-h-[min(28rem,55vh)] overflow-y-auto overscroll-contain pr-1' : ''"
    >
      <div
        v-if="usesScrollArea"
        class="pointer-events-none sticky top-0 z-10 h-4 bg-gradient-to-b from-card to-transparent"
        aria-hidden="true"
      />
      <div
        v-if="usesScrollArea"
        class="pointer-events-none sticky bottom-0 z-10 h-6 bg-gradient-to-t from-card to-transparent"
        aria-hidden="true"
      />

      <ol class="relative space-y-0 p-3 sm:p-4">
        <li
          v-for="(event, index) in visibleEvents"
          :key="event.id"
          class="relative flex gap-3 sm:gap-4"
          :class="compactCards ? 'pb-5 last:pb-0' : 'pb-7 last:pb-0'"
        >
          <div
            v-if="index < visibleEvents.length - 1"
            class="absolute left-4 top-9 bottom-0 w-px bg-gradient-to-b from-border via-border/70 to-transparent sm:left-5"
            aria-hidden="true"
          />

          <div class="relative z-10 flex shrink-0 flex-col items-center">
            <div
              class="flex items-center justify-center rounded-full border-2 shadow-sm ring-4 ring-background"
              :class="[
                presentationFor(event.event_type).nodeClass,
                compactCards ? 'size-8' : 'size-10',
              ]"
            >
              <Icon :name="presentationFor(event.event_type).icon" class="size-3.5 sm:size-4" />
            </div>
          </div>

          <article
            class="min-w-0 flex-1 rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md"
            :class="[
              presentationFor(event.event_type).accentClass,
              compactCards ? 'px-3 py-2.5' : 'px-4 py-3.5',
            ]"
          >
            <div class="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div class="space-y-0.5">
                <Badge
                  variant="outline"
                  class="font-medium"
                  :class="presentationFor(event.event_type).badgeClass"
                >
                  {{ presentationFor(event.event_type).label }}
                </Badge>
                <p
                  v-if="!compactCards && formatDateLabel(event.created_at)"
                  class="text-muted-foreground text-xs capitalize"
                >
                  {{ formatDateLabel(event.created_at) }}
                </p>
              </div>
              <time
                class="text-muted-foreground shrink-0 text-xs font-medium tabular-nums"
                :datetime="event.created_at ?? undefined"
              >
                {{ formatDateTime(event.created_at) }}
              </time>
            </div>

            <p
              v-if="event.description"
              class="text-sm leading-relaxed text-foreground"
              :class="compactCards ? 'mt-2 line-clamp-2' : 'mt-3'"
              :title="compactCards && event.description.length > 120 ? event.description : undefined"
            >
              {{ event.description }}
            </p>
            <p v-else class="text-muted-foreground text-sm italic" :class="compactCards ? 'mt-2' : 'mt-3'">
              Sin detalle adicional.
            </p>

            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span class="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-muted-foreground">
                <Icon name="i-lucide-user-round" class="size-3" />
                {{ actorLabel(event) }}
              </span>
              <span
                v-if="event.stage"
                class="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-muted-foreground"
              >
                <Icon name="i-lucide-git-branch" class="size-3" />
                {{ event.stage.name }}
              </span>
            </div>
          </article>
        </li>
      </ol>
    </div>

    <div
      v-if="hiddenCount > 0 || visibleCount > INITIAL_VISIBLE"
      class="flex flex-wrap items-center justify-center gap-2 border-t pt-3"
    >
      <Button
        v-if="hiddenCount > 0"
        type="button"
        variant="outline"
        size="sm"
        @click="showMore"
      >
        <Icon name="i-lucide-chevron-down" class="mr-1 size-4" />
        Ver {{ Math.min(hiddenCount, LOAD_MORE_STEP) }} más
      </Button>
      <Button
        v-if="hiddenCount > LOAD_MORE_STEP"
        type="button"
        variant="secondary"
        size="sm"
        @click="showAll"
      >
        Ver todo ({{ orderedEvents.length }})
      </Button>
      <Button
        v-if="visibleCount > INITIAL_VISIBLE"
        type="button"
        variant="ghost"
        size="sm"
        @click="showLess"
      >
        <Icon name="i-lucide-chevron-up" class="mr-1 size-4" />
        Ver menos
      </Button>
    </div>
  </div>

  <div
    v-else
    class="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center"
  >
    <div class="mb-3 flex size-12 items-center justify-center rounded-full border bg-background shadow-sm">
      <Icon name="i-lucide-history" class="text-muted-foreground size-5" />
    </div>
    <p class="text-sm font-medium">
      Sin eventos registrados
    </p>
    <p class="text-muted-foreground mt-1 max-w-sm text-xs">
      Las acciones sobre esta tarea y el radicado aparecerán aquí en orden cronológico.
    </p>
  </div>
</template>
