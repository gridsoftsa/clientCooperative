<script setup lang="ts">
// Página de auditoría protegida
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'auditoria_ver'
})

// const { t } = useI18n() // Temporalmente deshabilitado
const { $api } = useNuxtApp()
const { user } = useAuth()

const activities = ref<any[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0
})

const search = ref('')
const eventFilter = ref('')
const moduleFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const eventOptions = ref<Array<{ value: string, label: string }>>([])
const moduleOptions = ref<Array<{ value: string, label: string }>>([])

const hasFilters = computed(() =>
  search.value.trim() !== ''
  || eventFilter.value !== ''
  || moduleFilter.value !== ''
  || dateFrom.value !== ''
  || dateTo.value !== '',
)

async function fetchActivities() {
  loading.value = true
  try {
    const res = (await $api('/audit', {
      query: {
        per_page: pagination.value.per_page,
        page: pagination.value.current_page,
        q: search.value.trim() || undefined,
        event: eventFilter.value || undefined,
        subject_type: moduleFilter.value || undefined,
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
      }
    })) as unknown as {
      data: any[]
      meta: typeof pagination.value
      filters?: { events?: Array<{ value: string, label: string }>, modules?: Array<{ value: string, label: string }> }
    }
    activities.value = res.data
    pagination.value = res.meta
    eventOptions.value = res.filters?.events ?? []
    moduleOptions.value = res.filters?.modules ?? []
  } catch (error) {
    console.error('Error al cargar actividades:', error)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.value.current_page = 1
  fetchActivities()
}

function clearFilters() {
  search.value = ''
  eventFilter.value = ''
  moduleFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  applyFilters()
}

function changePage(page: number) {
  pagination.value.current_page = page
  fetchActivities()
}

function formatWhen(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function visibleChanges(activity: { changes?: Array<{ field: string, old: string | null, new: string | null }> }) {
  return activity.changes ?? []
}

onMounted(() => {
  fetchActivities()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold tracking-tight">
          Auditoría
        </h2>
        <p class="max-w-2xl text-sm text-muted-foreground">
          Cada fila dice quién hizo el cambio, a qué hora y qué quedó distinto. La contraseña nunca se muestra.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="fetchActivities">
        <Icon name="i-lucide-refresh-cw" :class="['mr-2 h-4 w-4', loading && 'animate-spin']" />
        Actualizar
      </Button>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <form class="grid gap-3 md:grid-cols-2 xl:grid-cols-6" @submit.prevent="applyFilters">
          <div class="space-y-1 xl:col-span-2">
            <label class="text-xs font-medium text-muted-foreground" for="audit-search">Buscar</label>
            <input
              id="audit-search"
              v-model="search"
              type="search"
              placeholder="Nombre, correo, radicación o texto"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="audit-event">Qué pasó</label>
            <select id="audit-event" v-model="eventFilter" class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todo</option>
              <option v-for="option in eventOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="audit-module">Módulo</label>
            <select id="audit-module" v-model="moduleFilter" class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos</option>
              <option v-for="option in moduleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="audit-from">Desde</label>
            <input id="audit-from" v-model="dateFrom" type="date" class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="audit-to">Hasta</label>
            <input id="audit-to" v-model="dateTo" type="date" class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          </div>
          <div class="flex items-end gap-2 xl:col-span-6">
            <Button type="submit" size="sm" :disabled="loading">
              Buscar
            </Button>
            <Button type="button" variant="outline" size="sm" :disabled="loading || !hasFilters" @click="clearFilters">
              Limpiar
            </Button>
          </div>
        </form>

        <div v-if="loading" class="flex items-center justify-center py-8">
          <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
        </div>
        <div v-else-if="activities.length === 0" class="py-8 text-center text-muted-foreground">
          {{ hasFilters ? 'No hay cambios con esos filtros.' : 'Todavía no hay cambios registrados.' }}
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="activity in activities"
            :key="activity.id"
            class="rounded-lg border p-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {{ activity.event_label || 'Cambio' }}
              </Badge>
              <span class="text-xs text-muted-foreground">
                {{ formatWhen(activity.created_at) }}
              </span>
            </div>
            <p class="mt-2 text-sm leading-relaxed">
              {{ activity.summary || activity.description }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ activity.causer ? `${activity.causer.name} · ${activity.causer.email}` : 'Lo hizo el sistema' }}
              <span v-if="activity.subject_label"> · {{ activity.subject_label }}<span v-if="activity.subject_id"> {{ activity.subject_id }}</span></span>
            </p>
            <p v-if="activity.password_changed" class="mt-2 text-sm">
              Se cambió la contraseña. El valor no se guarda.
            </p>
            <div v-if="visibleChanges(activity).length" class="mt-3 overflow-x-auto">
              <p class="mb-1 text-xs font-medium text-muted-foreground">
                {{ visibleChanges(activity).length }} {{ visibleChanges(activity).length === 1 ? 'dato cambió' : 'datos cambiaron' }}
              </p>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="py-1 pr-3 font-medium">Dato</th>
                    <th class="py-1 pr-3 font-medium">Antes</th>
                    <th class="py-1 font-medium">Después</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="change in visibleChanges(activity)" :key="change.field" class="border-b last:border-0">
                    <td class="py-1.5 pr-3 align-top font-medium">{{ change.label }}</td>
                    <td class="whitespace-pre-wrap py-1.5 pr-3 align-top text-muted-foreground">{{ change.old || 'Vacío' }}</td>
                    <td class="whitespace-pre-wrap py-1.5 align-top">{{ change.new || 'Vacío' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="mt-2 text-sm text-muted-foreground">
              Este registro no trae el detalle de los valores.
            </p>
          </article>
          <div v-if="pagination.last_page > 1" class="flex items-center justify-between gap-3 pt-2">
            <p class="text-sm text-muted-foreground">
              {{ pagination.total }} cambios
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="pagination.current_page === 1 || loading"
                @click="changePage(pagination.current_page - 1)"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="pagination.current_page === pagination.last_page || loading"
                @click="changePage(pagination.current_page + 1)"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  </SettingsLayout>
</template>
