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
const route = useRoute()
const { viewAttachmentInNewTab } = useCommunicationAttachmentView()
const openingAttachmentId = ref<number | null>(null)

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

const listModeOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'unread', label: 'No leídos' },
  { value: 'read', label: 'Leídos' },
] as const

const typeTabs: Array<{ value: string, label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'notice', label: 'Avisos' },
  { value: 'news', label: 'Noticias' },
  { value: 'circular', label: 'Circulares' },
  { value: 'event', label: 'Eventos' },
  { value: 'announcement', label: 'Comunicados' },
]

function typeBadgeClass(type: CommunicationTypeValue) {
  switch (type) {
    case 'notice':
      return 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
    case 'news':
      return 'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100'
    case 'circular':
      return 'border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100'
    case 'event':
      return 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
    case 'birthday':
      return 'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100'
    case 'announcement':
      return 'border-teal-300 bg-teal-100 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100'
    default:
      return 'border-border bg-muted text-foreground'
  }
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case 'scheduled':
      return 'border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100'
    case 'draft':
      return 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
    case 'expired':
      return 'border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100'
    case 'published':
      return 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
    default:
      return 'border-border bg-muted text-foreground'
  }
}

function relativeTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) {
    return `Programado: ${date.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  }
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

function cardClass(item: CommunicationItem) {
  if (item.status === 'scheduled') {
    return 'border-blue-300/60 bg-blue-500/5'
  }
  if (item.status === 'expired') {
    return 'opacity-80 border-dashed'
  }
  if (item.status === 'published' && !item.is_read) {
    return 'border-l-4 border-l-primary shadow-sm'
  }
  if (item.is_read) {
    return 'opacity-75'
  }
  return ''
}

async function openAttachment(file: CommunicationItem['attachments'][number]) {
  if (file.kind === 'link') {
    if (file.external_url) {
      window.open(file.external_url, '_blank', 'noopener,noreferrer')
    }
    return
  }

  openingAttachmentId.value = file.id
  try {
    await viewAttachmentInNewTab(file.id)
  }
  catch {
    toast.error('No se pudo abrir el adjunto.')
  }
  finally {
    openingAttachmentId.value = null
  }
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

function scrollToBirthdaysToday() {
  if (import.meta.client) {
    document.getElementById('cumpleanos-hoy')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function setListMode(mode: string) {
  sort.value = mode
  page.value = 1
  loadAll()
}

function showUnreadOnly() {
  setListMode('unread')
}

onMounted(() => {
  if (route.query.unread === '1') {
    sort.value = 'unread'
  }
  loadAll()
})

watch(() => route.query.unread, (value) => {
  if (value === '1') {
    sort.value = 'unread'
  }
  page.value = 1
  loadAll()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">
          Comunicados
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Canal interno de avisos, noticias, circulares y eventos. Los cumpleaños del día salen de la fecha de nacimiento del funcionario en estructura organizacional.
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
          <button class="mt-2 text-sm text-primary hover:underline" type="button" @click="scrollToBirthdaysToday">
            ver lista
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
          <NuxtLink class="mt-2 inline-block text-sm text-primary hover:underline" to="/comunicados?unread=1" @click.prevent="showUnreadOnly">
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
          <div class="flex flex-wrap items-center gap-2">
            <Select :model-value="sort" @update:model-value="(value) => setListMode(String(value ?? 'recent'))">
              <SelectTrigger class="w-44">
                <SelectValue placeholder="Filtrar listado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in listModeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="loading" class="py-16 text-center text-muted-foreground">
          Cargando feed...
        </div>
        <div v-else-if="feed.length === 0" class="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No hay comunicados para mostrar.
        </div>
        <div v-else class="space-y-4">
          <Card
            v-for="item in feed"
            :key="item.id"
            class="overflow-hidden transition-opacity"
            :class="cardClass(item)"
          >
            <CardContent class="space-y-4 p-5">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline" :class="typeBadgeClass(item.type)">
                  {{ item.type_label }}
                </Badge>
                <Badge
                  v-if="item.status && item.status !== 'published'"
                  variant="outline"
                  :class="statusBadgeClass(item.status)"
                >
                  {{ item.status_label || item.status }}
                </Badge>
                <Badge
                  v-else-if="item.status === 'published' && item.is_read"
                  variant="outline"
                  class="border-border bg-muted text-muted-foreground"
                >
                  Visto
                </Badge>
                <Badge
                  v-else-if="item.status === 'published' && !item.is_read"
                  variant="outline"
                  class="border-primary/40 bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary-foreground"
                >
                  Nuevo
                </Badge>
                <span v-if="item.org_unit" class="text-sm text-muted-foreground">
                  {{ item.org_unit.name }}
                </span>
                <Badge
                  v-if="item.is_featured"
                  variant="outline"
                  class="border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
                >
                  Destacado
                </Badge>
                <Badge v-if="item.requires_read_confirmation && !item.is_confirmed" variant="destructive">
                  Requiere lectura
                </Badge>
              </div>

              <div>
                <h3 class="text-lg font-semibold" :class="{ 'text-muted-foreground': item.is_read && item.status === 'published' }">
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
                <button
                  v-for="file in item.attachments"
                  :key="file.id"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50"
                  :disabled="openingAttachmentId === file.id"
                  @click="openAttachment(file)"
                >
                  <Icon :name="file.kind === 'link' ? 'i-lucide-link' : 'i-lucide-paperclip'" class="size-4" />
                  {{ file.title || file.original_name || 'Adjunto' }}
                </button>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <div class="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{{ relativeTime(item.published_at || item.scheduled_at) }}</span>
                  <span v-if="item.is_read" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Icon name="i-lucide-check-check" class="size-3.5" />
                    Leído
                  </span>
                  <span v-else-if="item.status === 'published'" class="inline-flex items-center gap-1 text-primary">
                    <Icon name="i-lucide-circle" class="size-2.5 fill-current" />
                    Sin leer
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

        <Card id="cumpleanos-hoy">
          <CardHeader>
            <CardTitle class="text-base">
              Cumpleaños de hoy
            </CardTitle>
            <CardDescription>
              Personas con fecha de nacimiento hoy en la estructura organizacional (no es un tipo de publicación).
            </CardDescription>
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
              No hay cumpleaños hoy. Registre la fecha de nacimiento del funcionario en estructura organizacional para que aparezca aquí.
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
