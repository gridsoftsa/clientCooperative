<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'auditoria_ver',
})

const ALL_MODELS = '__all__'

type AuditableTypeOption = {
  type: string
  label: string
}

type AuditRow = {
  id: number
  event: string
  auditable_type: string | null
  auditable_type_short: string | null
  auditable_label?: string | null
  auditable_id: string | number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user: { id: number; name: string; email?: string | null } | null
  ip_address?: string | null
  url?: string | null
  tags?: string | null
  created_at: string | null
  description: string
}

type AuditMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const { $api } = useNuxtApp()

const audits = ref<AuditRow[]>([])
const loading = ref(false)
const loadingAuditableTypes = ref(false)
const auditableTypes = ref<AuditableTypeOption[]>([])
const pagination = ref<AuditMeta>({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAuditableType = ref<string>(ALL_MODELS)

function formatJsonPreview(obj: Record<string, unknown> | null): string {
  if (obj == null || Object.keys(obj).length === 0) {
    return '—'
  }
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function auditQueryParams(): Record<string, string | number> {
  const q: Record<string, string | number> = {
    per_page: pagination.value.per_page,
    page: pagination.value.current_page,
  }
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()
  if (from) {
    q.date_from = from
  }
  if (to) {
    q.date_to = to
  }
  if (filterAuditableType.value !== ALL_MODELS && filterAuditableType.value) {
    q.auditable_type = filterAuditableType.value
  }
  return q
}

async function fetchAuditableTypes(): Promise<void> {
  loadingAuditableTypes.value = true
  try {
    const res = await $api<{ data: AuditableTypeOption[] }>('/audit/auditable-types')
    auditableTypes.value = Array.isArray(res.data) ? res.data : []
  } catch (e: unknown) {
    console.error(e)
    auditableTypes.value = []
  } finally {
    loadingAuditableTypes.value = false
  }
}

async function fetchAudits(): Promise<void> {
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la final.')
    return
  }

  loading.value = true
  try {
    const res = await $api<{ data: AuditRow[]; meta: AuditMeta }>('/audit', {
      query: auditQueryParams(),
    })
    audits.value = res.data ?? []
    pagination.value = res.meta
  } catch (e: unknown) {
    console.error(e)
    const msg = messageFromFetchError(e, 'No se pudo cargar el registro de auditoría.')
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

function goPage(page: number): void {
  pagination.value.current_page = page
  void fetchAudits()
}

function clearFilters(): void {
  const hadRangeOrModel =
    Boolean(filterDateFrom.value.trim())
    || Boolean(filterDateTo.value.trim())
    || filterAuditableType.value !== ALL_MODELS
  const previousPage = pagination.value.current_page

  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAuditableType.value = ALL_MODELS
  pagination.value.current_page = 1

  if (!hadRangeOrModel && previousPage > 1) {
    void fetchAudits()
  }
}

watchDebounced(
  [filterDateFrom, filterDateTo, filterAuditableType],
  () => {
    const from = filterDateFrom.value.trim()
    const to = filterDateTo.value.trim()
    if (from && to && from > to) {
      toast.error('La fecha inicial no puede ser posterior a la final.')
      return
    }
    pagination.value.current_page = 1
    void fetchAudits()
  },
  { debounce: 400 },
)

onMounted(async () => {
  await fetchAuditableTypes()
  await fetchAudits()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pb-16 pt-1 sm:px-6 lg:px-8">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Auditoría
        </h1>
        <p class="text-muted-foreground text-sm">
          Registro de cambios (Laravel Auditing, tabla <code class="rounded bg-muted px-1 py-0.5 text-xs">audits</code>). Filtra por fecha del evento y por modelo.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="fetchAudits">
        <Icon name="i-lucide-refresh-cw" :class="['mr-2 h-4 w-4', loading && 'animate-spin']" />
        Actualizar
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
        <CardDescription>
          Eventos <span class="font-medium">created</span>, <span class="font-medium">updated</span>,
          <span class="font-medium">deleted</span> y <span class="font-medium">restored</span> sobre modelos auditables.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-4">
          <div class="min-w-0 flex-1 lg:max-w-md">
            <DateRangeStringPicker
              id="audit-date-range"
              label="Rango de fechas (evento)"
              v-model:from="filterDateFrom"
              v-model:to="filterDateTo"
              placeholder-text="Cualquier fecha"
              compact
            />
          </div>
          <div class="grid min-w-0 gap-1.5 sm:w-full sm:max-w-xs">
            <Label for="audit-model-filter">Modelo</Label>
            <Select v-model="filterAuditableType">
              <SelectTrigger id="audit-model-filter" class="w-full min-w-0">
                <SelectValue placeholder="Todos los modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ALL_MODELS">
                  Todos los modelos
                </SelectItem>
                <SelectItem
                  v-for="opt in auditableTypes"
                  :key="opt.type"
                  :value="opt.type"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="loadingAuditableTypes" class="text-xs text-muted-foreground">
              Cargando modelos…
            </p>
          </div>
          <Button type="button" variant="outline" class="shrink-0" @click="clearFilters">
            <Icon name="i-lucide-filter-x" class="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="audits.length === 0" class="py-10 text-center text-muted-foreground">
          No hay registros con los filtros actuales.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="row in audits"
            :key="row.id"
            class="rounded-lg border border-border p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0 flex-1 space-y-1">
                <p class="font-medium leading-snug">
                  {{ row.description }}
                </p>
                <p class="text-sm text-muted-foreground">
                  <span v-if="row.user">{{ row.user.name }} · {{ row.user.email }}</span>
                  <span v-else>Sistema / usuario no resuelto</span>
                  <span class="mx-1">·</span>
                  <span>{{ row.created_at ? new Date(row.created_at).toLocaleString('es-CO') : '' }}</span>
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ row.auditable_label ?? row.auditable_type_short ?? row.auditable_type }}
                  <template v-if="row.auditable_id != null">
                    #{{ row.auditable_id }}
                  </template>
                </p>
              </div>
              <Badge variant="outline" class="shrink-0 uppercase">
                {{ row.event }}
              </Badge>
            </div>
            <Collapsible v-if="(row.old_values && Object.keys(row.old_values).length) || (row.new_values && Object.keys(row.new_values).length)" class="mt-3">
              <CollapsibleTrigger class="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <Icon name="i-lucide-chevron-down" class="h-4 w-4" />
                Ver valores anterior / nuevo
              </CollapsibleTrigger>
              <CollapsibleContent class="mt-2 grid gap-2 sm:grid-cols-2">
                <div class="rounded-md bg-muted/40 p-3">
                  <p class="mb-1 text-xs font-semibold text-muted-foreground">
                    old_values
                  </p>
                  <pre class="max-h-48 overflow-auto text-xs whitespace-pre-wrap">{{ formatJsonPreview(row.old_values) }}</pre>
                </div>
                <div class="rounded-md bg-muted/40 p-3">
                  <p class="mb-1 text-xs font-semibold text-muted-foreground">
                    new_values
                  </p>
                  <pre class="max-h-48 overflow-auto text-xs whitespace-pre-wrap">{{ formatJsonPreview(row.new_values) }}</pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div
          v-if="!loading && pagination.last_page > 1"
          class="flex flex-wrap items-center justify-between gap-2 border-t pt-4"
        >
          <p class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }} ({{ pagination.total }} registros)
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="goPage(pagination.current_page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="goPage(pagination.current_page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
