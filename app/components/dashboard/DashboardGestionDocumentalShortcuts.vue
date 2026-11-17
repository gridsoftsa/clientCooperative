<script setup lang="ts">
import type { CommunicationDashboard } from '~/types/communications'
import type { VentanillaHomeDashboardData } from '~/types/ventanilla'

type BadgeKey = 'ventanilla' | 'classification' | 'communications' | 'collaborations'
type ShortcutRole = 'arrive' | 'order' | 'notice' | 'store'

interface Shortcut {
  title: string
  hint: string
  kicker: string
  to: string
  icon: string
  gradient: string
  role: ShortcutRole
  permission?: string
  anyPermission?: string[]
  badgeKey?: BadgeKey
}

const { hasModule, hasPermission, hasAnyPermission } = usePermissions()
const { $api } = useNuxtApp()
const communicationsApi = useCommunicationsApi()
const workflowApi = useWorkflowApi()

const badges = ref<Partial<Record<BadgeKey, number>>>({})
const badgesReady = ref(false)

const shortcuts: Shortcut[] = [
  {
    title: 'Ventanilla única',
    hint: 'Radicados que ya vencieron. Entra y respóndelos.',
    kicker: '1 · Llega',
    to: '/ventanilla',
    icon: 'i-lucide-inbox',
    gradient: 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-700',
    role: 'arrive',
    permission: 'ventanilla_ver',
    badgeKey: 'ventanilla',
  },
  {
    title: 'Clasificación',
    hint: 'Llegaron y todavía no tienen serie ni tipo.',
    kicker: '2 · Se ordena',
    to: '/ventanilla/bandeja',
    icon: 'i-lucide-tags',
    gradient: 'bg-gradient-to-br from-amber-300 via-orange-500 to-orange-700',
    role: 'order',
    permission: 'ventanilla_clasificar',
    badgeKey: 'classification',
  },
  {
    title: 'Comunicados',
    hint: 'Avisos que aún no abriste.',
    kicker: 'Sin leer',
    to: '/comunicados',
    icon: 'i-lucide-megaphone',
    gradient: 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700',
    role: 'notice',
    permission: 'comunicados_ver',
    badgeKey: 'communications',
  },
  {
    title: 'Colaboraciones',
    hint: 'Alguien espera tu respuesta.',
    kicker: 'Por responder',
    to: '/workflow/colaboracion',
    icon: 'i-lucide-users',
    gradient: 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-700',
    role: 'notice',
    permission: 'workflow_colaborar',
    badgeKey: 'collaborations',
  },
  {
    title: 'Biblioteca',
    hint: 'Lo que lee toda la entidad',
    kicker: 'Institucional',
    to: '/biblioteca',
    icon: 'i-lucide-library',
    gradient: 'bg-gradient-to-br from-fuchsia-400 via-violet-500 to-violet-800',
    role: 'store',
    permission: 'expedientes_biblioteca_ver',
  },
  {
    title: 'Repositorio',
    hint: 'El archivo de cada área',
    kicker: 'Por área',
    to: '/expedientes/area',
    icon: 'i-lucide-building-2',
    gradient: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-800',
    role: 'store',
    permission: 'expedientes_area_ver',
  },
  {
    title: 'Expedientes',
    hint: 'Un caso, una carpeta',
    kicker: 'Casos',
    to: '/expedientes',
    icon: 'i-lucide-archive',
    gradient: 'bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800',
    role: 'store',
    permission: 'expedientes_ver',
  },
  {
    title: 'Flujo de trabajo',
    hint: 'Tareas que te asignaron en un trámite',
    kicker: 'Tablero',
    to: '/workflow',
    icon: 'i-lucide-kanban-square',
    gradient: 'bg-gradient-to-br from-orange-400 via-orange-500 to-red-700',
    role: 'store',
    permission: 'workflow_ver',
  },
  {
    title: 'TRD vigente',
    hint: 'Dónde debe ir cada documento',
    kicker: 'Cuadro',
    to: '/settings/archival/trd/consult',
    icon: 'i-lucide-table-2',
    gradient: 'bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-900',
    role: 'store',
    permission: 'trd_tablas_ver',
  },
  {
    title: 'Maestros',
    hint: 'Documentos del titular',
    kicker: 'Asociado',
    to: '/expedientes/maestros',
    icon: 'i-lucide-files',
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-sky-800',
    role: 'store',
    permission: 'expedientes_ver',
  },
]

const visibleShortcuts = computed(() => {
  if (!hasModule('gestion_documental')) {
    return []
  }

  return shortcuts.filter((shortcut) => {
    if (shortcut.anyPermission?.length) {
      return hasAnyPermission(shortcut.anyPermission)
    }

    if (shortcut.permission) {
      return hasPermission(shortcut.permission)
    }

    return false
  })
})

const arriveShortcut = computed(() => visibleShortcuts.value.find(shortcut => shortcut.role === 'arrive'))
const orderShortcut = computed(() => visibleShortcuts.value.find(shortcut => shortcut.role === 'order'))
const noticeShortcuts = computed(() => visibleShortcuts.value.filter(shortcut => shortcut.role === 'notice'))
const storeShortcuts = computed(() => visibleShortcuts.value.filter(shortcut => shortcut.role === 'store'))
const showActionLane = computed(() => Boolean(arriveShortcut.value || orderShortcut.value || noticeShortcuts.value.length))
const heroCount = computed(() => Number(Boolean(arriveShortcut.value)) + Number(Boolean(orderShortcut.value)))
const hasNotices = computed(() => noticeShortcuts.value.length > 0)

const actionGridClass = computed(() => {
  if (heroCount.value > 0 && hasNotices.value) {
    return '@min-[30rem]/board:grid-cols-2 @min-[64rem]/board:grid-cols-12'
  }

  if (heroCount.value === 2 || hasNotices.value) {
    return '@min-[30rem]/board:grid-cols-2'
  }

  return 'grid-cols-1'
})

const arriveSpanClass = computed(() => {
  if (hasNotices.value && orderShortcut.value) {
    return '@min-[64rem]/board:col-span-5'
  }

  if (hasNotices.value) {
    return '@min-[30rem]/board:col-span-2 @min-[64rem]/board:col-span-8'
  }

  return ''
})

const orderSpanClass = computed(() => {
  if (hasNotices.value && arriveShortcut.value) {
    return '@min-[64rem]/board:col-span-4'
  }

  if (hasNotices.value) {
    return '@min-[30rem]/board:col-span-2 @min-[64rem]/board:col-span-8'
  }

  return ''
})

const noticeWrapClass = computed(() => {
  if (heroCount.value === 2) {
    return '@min-[30rem]/board:col-span-2 @min-[64rem]/board:col-span-3'
  }

  if (heroCount.value === 1) {
    return '@min-[30rem]/board:col-span-2 @min-[64rem]/board:col-span-4'
  }

  return '@min-[30rem]/board:col-span-2'
})

const noticeGridClass = computed(() => {
  if (heroCount.value > 0) {
    return '@min-[30rem]/board:grid-cols-2 @min-[64rem]/board:grid-cols-1'
  }

  return '@min-[30rem]/board:grid-cols-2'
})

function badgeCount(key: BadgeKey | undefined): number {
  if (!key) {
    return 0
  }

  return badges.value[key] ?? 0
}

function badgeLabel(count: number): string {
  return count > 99 ? '99+' : count.toLocaleString('es-CO')
}

function statusLine(shortcut: Shortcut): string {
  const count = badgeCount(shortcut.badgeKey)

  if (!badgesReady.value) {
    return 'Revisando pendientes…'
  }

  if (count > 0) {
    return count === 1 ? '1 pendiente de atender' : `${badgeLabel(count)} pendientes de atender`
  }

  return 'Al día. Nada pendiente.'
}

async function loadBadges(): Promise<void> {
  const next: Partial<Record<BadgeKey, number>> = {}
  const jobs: Array<Promise<void>> = []

  if (hasPermission('ventanilla_ver') || hasPermission('ventanilla_clasificar') || hasPermission('ventanilla_dashboard_ver')) {
    jobs.push($api<{ data: VentanillaHomeDashboardData }>('/dashboard/ventanilla-summary').then((response) => {
      next.ventanilla = response.data.sla?.red ?? 0
      next.classification = response.data.pending_classification ?? 0
    }).catch(() => undefined))
  }

  if (hasPermission('comunicados_ver')) {
    jobs.push(communicationsApi.fetchDashboard().then((dashboard: CommunicationDashboard) => {
      next.communications = dashboard.stats.unread ?? 0
    }).catch(() => undefined))
  }

  if (hasPermission('workflow_colaborar')) {
    jobs.push(workflowApi.fetchMyPendingCollaborations().then((rows) => {
      next.collaborations = rows.length
    }).catch(() => undefined))
  }

  await Promise.all(jobs)
  badges.value = next
  badgesReady.value = true
}

onMounted(() => {
  if (visibleShortcuts.value.length > 0) {
    void loadBadges()
  }
})
</script>

<template>
  <section v-if="visibleShortcuts.length" class="@container/board w-full max-w-full">
    <div
      class="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.28),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(251,191,36,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.7),transparent)] p-3 @min-[40rem]/board:rounded-[28px] @min-[40rem]/board:p-5 dark:border-sky-900/60 dark:bg-[radial-gradient(circle_at_0%_0%,rgba(14,116,144,0.45),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(180,83,9,0.28),transparent_36%)]"
    >
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 max-w-2xl">
        <p class="text-[11px] font-semibold tracking-[0.14em] text-sky-800 uppercase @min-[40rem]/board:tracking-[0.22em] dark:text-sky-200">
          Gestión documental
        </p>
        <h2 class="mt-1 text-balance text-xl font-semibold tracking-tight @min-[40rem]/board:text-2xl @min-[64rem]/board:text-3xl">
          El documento entra, se ordena y se guarda
        </h2>
        <p class="mt-1 text-sm text-pretty text-muted-foreground">
          El círculo rojo es lo que alguien dejó pendiente. Empieza por ahí.
        </p>
      </div>
      <div class="flex max-w-full items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        <span class="size-2.5 shrink-0 rounded-full bg-destructive ring-2 ring-destructive/30" />
        <span>El punto rojo es un pendiente</span>
      </div>
    </div>

    <div v-if="showActionLane" class="grid grid-cols-1 gap-3" :class="actionGridClass">
      <NuxtLink
        v-if="arriveShortcut"
        :to="arriveShortcut.to"
        class="group relative isolate flex min-h-48 min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg transition duration-200 @min-[40rem]/board:min-h-56 @min-[40rem]/board:rounded-[26px] @min-[40rem]/board:p-5 hover:-translate-y-1 hover:shadow-2xl"
        :class="[arriveShortcut.gradient, arriveSpanClass]"
      >
        <span class="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-white/15 @min-[40rem]/board:size-40" />
        <span class="pointer-events-none absolute -bottom-16 -left-10 size-36 rounded-full bg-black/10 @min-[40rem]/board:size-48" />
        <Icon :name="arriveShortcut.icon" class="pointer-events-none absolute right-3 bottom-2 size-16 text-white/20 transition duration-300 @min-[40rem]/board:size-28 group-hover:scale-110 group-hover:text-white/30" />
        <div class="relative flex items-start justify-between gap-3">
          <span class="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur">
            {{ arriveShortcut.kicker }}
          </span>
          <span
            v-if="badgeCount(arriveShortcut.badgeKey) > 0"
            class="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-destructive px-2 text-xs font-semibold text-white ring-2 ring-white"
            :aria-label="`${badgeCount(arriveShortcut.badgeKey)} pendientes`"
          >
            {{ badgeLabel(badgeCount(arriveShortcut.badgeKey)) }}
          </span>
        </div>
        <div class="relative mt-4 min-w-0 pr-12 @min-[40rem]/board:mt-6 @min-[40rem]/board:pr-16">
          <p class="text-4xl font-semibold tracking-tight tabular-nums @min-[40rem]/board:text-5xl">
            {{ badgesReady ? badgeLabel(badgeCount(arriveShortcut.badgeKey)) : '—' }}
          </p>
          <p class="mt-1 text-sm text-white/85">
            {{ statusLine(arriveShortcut) }}
          </p>
          <h3 class="mt-3 text-xl font-semibold text-balance @min-[40rem]/board:mt-4 @min-[40rem]/board:text-2xl">
            {{ arriveShortcut.title }}
          </h3>
          <p class="mt-1 max-w-sm text-sm text-pretty text-white/85">
            {{ arriveShortcut.hint }}
          </p>
        </div>
      </NuxtLink>

      <NuxtLink
        v-if="orderShortcut"
        :to="orderShortcut.to"
        class="group relative isolate flex min-h-48 min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg transition duration-200 @min-[40rem]/board:min-h-56 @min-[40rem]/board:rounded-[26px] @min-[40rem]/board:p-5 hover:-translate-y-1 hover:shadow-2xl"
        :class="[orderShortcut.gradient, orderSpanClass]"
      >
        <span class="pointer-events-none absolute -top-8 -left-8 size-28 rounded-full bg-white/20 @min-[40rem]/board:size-32" />
        <Icon :name="orderShortcut.icon" class="pointer-events-none absolute right-3 bottom-2 size-16 text-white/20 transition duration-300 @min-[40rem]/board:size-24 group-hover:scale-110" />
        <div class="relative flex items-start justify-between gap-3">
          <span class="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold tracking-wide">
            {{ orderShortcut.kicker }}
          </span>
          <span
            v-if="badgeCount(orderShortcut.badgeKey) > 0"
            class="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-destructive px-2 text-xs font-semibold text-white ring-2 ring-white"
            :aria-label="`${badgeCount(orderShortcut.badgeKey)} pendientes`"
          >
            {{ badgeLabel(badgeCount(orderShortcut.badgeKey)) }}
          </span>
        </div>
        <div class="relative mt-4 min-w-0 pr-12 @min-[40rem]/board:mt-6 @min-[40rem]/board:pr-16">
          <p class="text-4xl font-semibold tracking-tight tabular-nums @min-[40rem]/board:text-5xl">
            {{ badgesReady ? badgeLabel(badgeCount(orderShortcut.badgeKey)) : '—' }}
          </p>
          <p class="mt-1 text-sm text-white/90">
            {{ statusLine(orderShortcut) }}
          </p>
          <h3 class="mt-3 text-xl font-semibold text-balance @min-[40rem]/board:mt-4 @min-[40rem]/board:text-2xl">
            {{ orderShortcut.title }}
          </h3>
          <p class="mt-1 text-sm text-pretty text-white/90">
            {{ orderShortcut.hint }}
          </p>
        </div>
      </NuxtLink>

      <div v-if="noticeShortcuts.length" class="grid h-full min-w-0 grid-cols-1 gap-3" :class="[noticeWrapClass, noticeGridClass]">
        <NuxtLink
          v-for="shortcut in noticeShortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="group relative isolate flex min-h-28 min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg transition duration-200 @min-[40rem]/board:rounded-[26px] hover:-translate-y-1 hover:shadow-2xl"
          :class="shortcut.gradient"
        >
          <Icon :name="shortcut.icon" class="pointer-events-none absolute right-2 bottom-1 size-14 text-white/20 transition @min-[40rem]/board:size-16 group-hover:scale-110" />
          <div class="relative flex items-start justify-between gap-2">
            <span class="text-xs font-semibold tracking-wide text-white/90">
              {{ shortcut.kicker }}
            </span>
            <span
              v-if="badgeCount(shortcut.badgeKey) > 0"
              class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white ring-2 ring-white"
              :aria-label="`${badgeCount(shortcut.badgeKey)} pendientes`"
            >
              {{ badgeLabel(badgeCount(shortcut.badgeKey)) }}
            </span>
          </div>
          <div class="relative min-w-0 pr-10">
            <p class="text-3xl font-semibold tabular-nums">
              {{ badgesReady ? badgeLabel(badgeCount(shortcut.badgeKey)) : '—' }}
            </p>
            <h3 class="text-base font-semibold text-balance">
              {{ shortcut.title }}
            </h3>
            <p class="text-xs text-pretty text-white/85">
              {{ shortcut.hint }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="storeShortcuts.length" class="mt-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
          3
        </span>
        <p class="text-sm font-medium">
          Se guarda aquí
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2.5 @min-[40rem]/board:grid-cols-3 @min-[40rem]/board:gap-3 @min-[64rem]/board:grid-cols-4 @min-[80rem]/board:grid-cols-6">
        <NuxtLink
          v-for="shortcut in storeShortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="group relative flex min-h-32 min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-3 text-white shadow-md transition duration-200 @min-[40rem]/board:min-h-36 @min-[40rem]/board:rounded-[22px] @min-[40rem]/board:p-4 hover:-translate-y-1 hover:shadow-xl"
          :class="shortcut.gradient"
        >
          <span class="pointer-events-none absolute -right-4 -bottom-6 size-16 rounded-full bg-white/15 @min-[40rem]/board:size-20" />
          <Icon :name="shortcut.icon" class="size-7 text-white drop-shadow-sm transition duration-300 @min-[40rem]/board:size-8 group-hover:scale-110" />
          <span class="min-w-0">
            <span class="block text-[11px] font-medium tracking-wide text-white/75">
              {{ shortcut.kicker }}
            </span>
            <span class="mt-0.5 block text-sm font-semibold leading-snug text-balance">
              {{ shortcut.title }}
            </span>
            <span class="mt-1 line-clamp-3 block text-xs leading-snug text-pretty text-white/80">
              {{ shortcut.hint }}
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>
    </div>
  </section>
</template>
