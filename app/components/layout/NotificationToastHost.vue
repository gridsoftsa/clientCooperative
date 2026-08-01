<script setup lang="ts">
const {
  visibleToasts,
  dismissToast,
  openToast,
  startPolling,
} = useNotificationToasts()

let stopPolling: (() => void) | undefined

onMounted(() => {
  stopPolling = startPolling()
})

onBeforeUnmount(() => {
  stopPolling?.()
})

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
</script>

<template>
  <div
    class="pointer-events-none fixed top-[calc(var(--header-height)+0.75rem)] right-4 z-[120] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
    aria-live="polite"
    aria-relevant="additions"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-4 opacity-0"
      move-class="transition duration-200"
    >
      <article
        v-for="toast in visibleToasts"
        :key="toast.key"
        class="pointer-events-auto overflow-hidden rounded-xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85"
        :class="toast.important ? 'border-amber-500/60 ring-1 ring-amber-500/20' : 'border-border'"
      >
        <div class="flex items-start gap-3 p-4">
          <div
            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
            :class="toast.important ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-primary/10 text-primary'"
          >
            <Icon :name="toast.important ? 'i-lucide-triangle-alert' : 'i-lucide-bell'" class="size-4" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold leading-snug text-foreground">
                {{ toast.title }}
              </p>
              <button
                type="button"
                class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar notificación"
                @click="dismissToast(toast.key)"
              >
                <Icon name="i-lucide-x" class="size-4" />
              </button>
            </div>

            <p v-if="toast.message" class="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {{ toast.message }}
            </p>

            <p v-if="toast.createdAt" class="mt-2 text-[11px] text-muted-foreground">
              {{ formatDate(toast.createdAt) }}
            </p>

            <div class="mt-3 flex items-center gap-2">
              <Button size="sm" class="h-8" @click="openToast(toast)">
                Ver detalle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="h-8"
                @click="dismissToast(toast.key)"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>
  </div>
</template>
