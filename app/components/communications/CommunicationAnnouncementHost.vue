<script setup lang="ts">
const router = useRouter()
const {
  current,
  canCheck,
  dismissCurrent,
} = useCommunicationAnnouncements()
const { refreshAll } = useNotificationToasts()

const open = computed({
  get: () => current.value !== null,
  set: (value: boolean) => {
    if (!value && current.value) {
      void dismissCurrent(false)
    }
  },
})

function formatEventDate(value?: string | null) {
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

function typeBadgeClass(type?: string) {
  switch (type) {
    case 'birthday':
      return 'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100'
    case 'event':
      return 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
    case 'notice':
      return 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
    default:
      return 'border-border bg-muted text-foreground'
  }
}

async function viewDetail() {
  const item = current.value
  if (!item) {
    return
  }

  await dismissCurrent(false)
  await router.push(item.url)
}

onMounted(() => {
  if (canCheck.value) {
    void refreshAll()
  }
})
</script>

<template>
  <Dialog v-if="canCheck" v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <div class="flex flex-wrap items-center gap-2">
          <Badge
            v-if="current"
            variant="outline"
            :class="typeBadgeClass(current.type)"
          >
            {{ current.type_label }}
          </Badge>
          <Badge v-if="current?.is_important" variant="destructive">
            Importante
          </Badge>
        </div>
        <DialogTitle class="text-left pt-2">
          {{ current?.title }}
        </DialogTitle>
        <DialogDescription v-if="current?.summary" class="text-left text-sm text-foreground/90">
          {{ current.summary }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="current?.body" class="max-h-48 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap">
        {{ current.body }}
      </div>

      <div
        v-if="current?.type === 'event' && (current.event_starts_at || current.event_location)"
        class="rounded-md border bg-muted/40 p-3 text-sm"
      >
        <p v-if="current.event_starts_at">
          <span class="font-medium text-foreground">Cuándo:</span>
          {{ formatEventDate(current.event_starts_at) }}
        </p>
        <p v-if="current.event_location" class="mt-1">
          <span class="font-medium text-foreground">Dónde:</span>
          {{ current.event_location }}
        </p>
      </div>

      <DialogFooter class="gap-3 sm:justify-end">
        <Button variant="outline" @click="open = false">
          Cerrar
        </Button>
        <Button @click="viewDetail">
          Ver completo
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
