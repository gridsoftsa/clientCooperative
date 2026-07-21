<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { CommunicationItem, CommunicationTypeValue } from '~/types/communications'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'comunicados_ver',
})

const communicationsApi = useCommunicationsApi()
const { hasPermission } = usePermissions()
const { user } = useAuth()

const loading = ref(false)
const search = ref('')
const selectedType = ref('')
const sort = ref('recent')
const page = ref(1)

const feed = ref<CommunicationItem[]>([])
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })
const dashboard = ref<{
  stats: { birthdays_today: number, events_today: number, unread: number }
  birthdays_today: Array<{ id: number, name: string, org_unit?: string | null }>
  upcoming_events: CommunicationItem[]
  important: CommunicationItem[]
} | null>(null)

const canCreate = computed(() => hasPermission('comunicados_crear'))
const userName = computed(() => user.value?.name?.split(' ')[0] ?? 'colaborador')

const typeTabs: Array<{ value: string, label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'notice', label: 'Avisos' },
  { value: 'news', label: 'Noticias' },
  { value: 'circular', label: 'Circulares' },
  { value: 'event', label: 'Eventos' },
  { value: 'birthday', label: 'Cumpleaños' },
]

function typeBadgeClass(type: CommunicationTypeValue) {
  switch (type) {
    case 'notice': return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'news': return 'bg-sky-50 text-sky-800 border-sky-200'
    case 'circular': return 'bg-violet-50 text-violet-800 border-violet-200'
    case 'event': return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'birthday': return 'bg-rose-50 text-rose-800 border-rose-200'
    default: return ''
  }
}

function relativeTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Hace unos minutos'
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function formatEventDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadAll() {
  loading.value = true
  try {
    const [dash, list] = await Promise.all([
      communicationsApi.fetchDashboard(),
      communicationsApi.fetchFeed({
        search: search.value || undefined,
        type: selectedType.value || undefined,
        sort: sort.value,
        page: page.value,
        per_page: 10,
      }),
    ])
    dashboard.value = dash
    feed.value = list.data ?? []
    pagination.value = {
      current_page: list.current_page,
      last_page: list.last_page,
      total: list.total,
    }
  }
  catch {
    toast.error('No se pudo cargar el feed de comunicados.')
  }
  finally {
    loading.value = false
  }
}

function selectType(type: string) {
  selectedType.value = type
  page.value = 1
  loadAll()
}

onMounted(loadAll)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">
          Comunicados
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Canal interno de avisos, noticias, circulares y eventos.
        </p>
      </div>
      <div class="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
        <div class="relative flex-1">
          <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            class="pl-10"
            placeholder="Buscar comunicados, noticias, eventos..."
            @keyup.enter="page = 1; loadAll()"
          />
        </div>
        <Button v-if="canCreate" as-child>
          <NuxtLink to="/comunicados/nuevo">
            <Icon name="i-lucide-megaphone" class="mr-2 size-4" />
            Nueva publicación
          </NuxtLink>
        </Button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_repeat(3,minmax(0,1fr))]">
      <Card class="border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-background">
        <CardContent class="flex h-full flex-col justify-between gap-4 p-5">
          <div>
            <p class="text-sm text-muted-foreground">
              Bienvenida/o
            </p>
            <h2 class="text-2xl font-semibold">
              {{ userName }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Mantente al día con la información institucional.
            </p>
          </div>
          <Button variant="secondary" size="sm" type="button" @click="selectType(''); sort = 'priority'; loadAll()">
            Ver destacados
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-5">
          <div class="text-sm text-muted-foreground">
            Cumpleaños hoy
          </div>
          <div class="mt-2 text-3xl font-semibold">
            {{ dashboard?.stats.birthdays_today ?? 0 }}
          </div>
          <button class="mt-2 text-sm text-primary hover:underline" type="button" @click="selectType('birthday')">
            ver más
          </button>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-5">
          <div class="text-sm text-muted-foreground">
            Eventos hoy
          </div>
          <div class="mt-2 text-3xl font-semibold">
            {{ dashboard?.stats.events_today ?? 0 }}
          </div>
          <button class="mt-2 text-sm text-primary hover:underline" type="button" @click="selectType('event')">
            ver más
          </button>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-5">
          <div class="text-sm text-muted-foreground">
            Comunicados sin leer
          </div>
          <div class="mt-2 text-3xl font-semibold">
            {{ dashboard?.stats.unread ?? 0 }}
          </div>
          <NuxtLink class="mt-2 inline-block text-sm text-primary hover:underline" to="/comunicados?unread=1">
            ver más
          </NuxtLink>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="tab in typeTabs"
              :key="tab.value || 'all'"
              size="sm"
              :variant="selectedType === tab.value ? 'default' : 'outline'"
              type="button"
              @click="selectType(tab.value)"
            >
              {{ tab.label }}
            </Button>
          </div>
          <Select v-model="sort" @update:model-value="page = 1; loadAll()">
            <SelectTrigger class="w-44">
              <SelectValue placeholder="Orden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                Más recientes
              </SelectItem>
              <SelectItem value="priority">
                Prioridad
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="loading" class="py-16 text-center text-muted-foreground">
          Cargando feed...
        </div>
        <div v-else-if="feed.length === 0" class="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No hay comunicados para mostrar.
        </div>
        <div v-else class="space-y-4">
          <Card v-for="item in feed" :key="item.id" class="overflow-hidden">
            <CardContent class="space-y-4 p-5">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline" :class="typeBadgeClass(item.type)">
                  {{ item.type_label }}
                </Badge>
                <span v-if="item.org_unit" class="text-sm text-muted-foreground">
                  {{ item.org_unit.name }}
                </span>
                <Badge v-if="item.is_featured" class="bg-emerald-50 text-emerald-700">
                  Destacado
                </Badge>
                <Badge v-if="item.requires_read_confirmation && !item.is_confirmed" variant="destructive">
                  Requiere lectura
                </Badge>
              </div>

              <div>
                <h3 class="text-lg font-semibold">
                  {{ item.title }}
                </h3>
                <p v-if="item.summary" class="mt-1 text-sm text-muted-foreground">
                  {{ item.summary }}
                </p>
              </div>

              <div v-if="item.type === 'event'" class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div><span class="text-muted-foreground">Cuándo:</span> {{ formatEventDate(item.event_starts_at) }}</div>
                <div v-if="item.event_location">
                  <span class="text-muted-foreground">Dónde:</span> {{ item.event_location }}
                </div>
              </div>

              <div v-if="item.attachments?.length" class="flex flex-wrap gap-2">
                <a
                  v-for="file in item.attachments"
                  :key="file.id"
                  :href="file.kind === 'link' ? (file.external_url ?? '#') : (file.download_url ?? '#')"
                  :target="file.kind === 'link' ? '_blank' : undefined"
                  class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
                  rel="noopener noreferrer"
                >
                  <Icon :name="file.kind === 'link' ? 'i-lucide-link' : 'i-lucide-paperclip'" class="size-4" />
                  {{ file.title || file.original_name || 'Adjunto' }}
                </a>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <div class="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{{ relativeTime(item.published_at) }}</span>
                  <span v-if="item.is_read" class="inline-flex items-center gap-1 text-emerald-600">
                    <Icon name="i-lucide-check" class="size-3.5" />
                    Leído
                  </span>
                  <span v-else-if="item.confirmed_reads_count">
                    Leído por {{ item.confirmed_reads_count }} personas
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button as-child size="sm" variant="outline">
                    <NuxtLink :to="`/comunicados/${item.id}`">
                      Ver más
                    </NuxtLink>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div v-if="pagination.last_page > 1" class="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" :disabled="page <= 1 || loading" @click="page--; loadAll()">
            Anterior
          </Button>
          <span class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </span>
          <Button variant="outline" size="sm" :disabled="page >= pagination.last_page || loading" @click="page++; loadAll()">
            Siguiente
          </Button>
        </div>
      </div>

      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Próximos eventos
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <NuxtLink
              v-for="event in dashboard?.upcoming_events ?? []"
              :key="`ev-${event.id}`"
              :to="`/comunicados/${event.id}`"
              class="block rounded-md px-2 py-2 hover:bg-muted/60"
            >
              <div class="text-sm font-medium line-clamp-2">
                {{ event.title }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ formatEventDate(event.event_starts_at) }}
                <span v-if="event.event_location"> · {{ event.event_location }}</span>
              </div>
            </NuxtLink>
            <p v-if="!(dashboard?.upcoming_events?.length)" class="text-sm text-muted-foreground">
              Sin eventos próximos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Cumpleaños de hoy
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="person in dashboard?.birthdays_today ?? []"
              :key="`bd-${person.id}`"
              class="flex items-center gap-3"
            >
              <div class="flex size-9 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
                {{ person.name.slice(0, 1) }}
              </div>
              <div>
                <div class="text-sm font-medium">
                  {{ person.name }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ person.org_unit || 'Sin área' }}
                </div>
              </div>
            </div>
            <p v-if="!(dashboard?.birthdays_today?.length)" class="text-sm text-muted-foreground">
              No hay cumpleaños hoy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Comunicados importantes
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <NuxtLink
              v-for="item in dashboard?.important ?? []"
              :key="`imp-${item.id}`"
              :to="`/comunicados/${item.id}`"
              class="block rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/60"
            >
              {{ item.title }}
            </NuxtLink>
            <p v-if="!(dashboard?.important?.length)" class="text-sm text-muted-foreground">
              Sin comunicados marcados como importantes.
            </p>
          </CardContent>
        </Card>

        <Card v-if="canCreate" class="border-dashed">
          <CardContent class="space-y-3 p-5 text-center">
            <p class="text-sm font-medium">
              ¿Tienes algo que comunicar?
            </p>
            <Button as-child class="w-full">
              <NuxtLink to="/comunicados/nuevo">
                + Nueva publicación
              </NuxtLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <Button
      v-if="canCreate"
      as-child
      class="fixed right-6 bottom-6 z-40 hidden size-14 rounded-full shadow-lg md:inline-flex"
      size="icon"
    >
      <NuxtLink to="/comunicados/nuevo" title="Publicar">
        <Icon name="i-lucide-megaphone" class="size-5" />
      </NuxtLink>
    </Button>
  </div>
</template>
