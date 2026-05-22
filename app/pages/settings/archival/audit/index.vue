<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_AUDIT_EVENT_OPTIONS,
  ARCHIVAL_AUDIT_SCOPE_OPTIONS,
  type ArchivalAuditScope,
} from '~/constants/archival-audit'
import type { ArchivalAuditRow, ArchivalAuditScopeFilter } from '~/composables/useArchivalAuditApi'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_auditoria_ver', 'auditoria_ver'],
})

const ALL_MODELS = '__all__'
const ALL_EVENTS = '__all__'

const router = useRouter()
const auditApi = useArchivalAuditApi()

const audits = ref<ArchivalAuditRow[]>([])
const loading = ref(false)
const filterScope = ref<ArchivalAuditScopeFilter>('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAuditableType = ref(ALL_MODELS)
const filterEvent = ref(ALL_EVENTS)
const expandedId = ref<number | null>(null)
const showTechnicalJson = ref(false)

const typeOptions = ref<Array<{ type: string, label: string }>>([])

const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  scope_label: '',
})

const PER_PAGE_OPTIONS = [15, 25, 50] as const

function eventLabel(event: string): string {
  const map: Record<string, string> = {
    created: 'Creación',
    updated: 'Actualización',
    deleted: 'Eliminación',
    sync: 'Sincronización',
    attach: 'Vinculación',
    detach: 'Desvinculación',
  }
  return map[event] ?? event
}

function eventBadgeVariant(event: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (event === 'deleted') {
    return 'destructive'
  }
  if (event === 'updated') {
    return 'secondary'
  }
  if (event === 'created') {
    return 'default'
  }
  return 'outline'
}

function formatJsonPreview(obj: Record<string, unknown> | null | undefined): string {
  if (obj == null || Object.keys(obj).length === 0) {
    return '—'
  }
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function auditQueryParams(): Record<string, string | number> {
  const q: Record<string, string | number> = {
    scope: filterScope.value,
    per_page: pagination.value.per_page,
    page: pagination.value.current_page,
  }
  if (filterDateFrom.value.trim()) {
    q.date_from = filterDateFrom.value.trim()
  }
  if (filterDateTo.value.trim()) {
    q.date_to = filterDateTo.value.trim()
  }
  if (filterAuditableType.value !== ALL_MODELS) {
    q.auditable_type = filterAuditableType.value
  }
  if (filterEvent.value !== ALL_EVENTS) {
    q.event = filterEvent.value
  }
  return q
}

async function loadTypeOptions() {
  try {
    const res = await auditApi.fetchAuditableTypes(filterScope.value)
    typeOptions.value = res.data.types ?? []
  } catch {
    typeOptions.value = []
  }
}

async function fetchAudits() {
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()
  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la final.')
    return
  }

  loading.value = true
  expandedId.value = null
  try {
    const res = await auditApi.fetchAudits(auditQueryParams())
    audits.value = res.data ?? []
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
      scope_label: res.meta.scope_label,
    }
  } catch (e: unknown) {
    toast.error(messageFromFetchError(e, 'No se pudo cargar la auditoría archivística.'))
  } finally {
    loading.value = false
  }
}

function goPage(page: number) {
  pagination.value.current_page = page
  void fetchAudits()
}

function toggleRowDetail(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function clearFilters() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAuditableType.value = ALL_MODELS
  filterEvent.value = ALL_EVENTS
  pagination.value.current_page = 1
  pagination.value.per_page = 15
  void fetchAudits()
}

function setScope(scope: ArchivalAuditScope) {
  filterScope.value = scope
  filterAuditableType.value = ALL_MODELS
  pagination.value.current_page = 1
}

watch(filterScope, async () => {
  await loadTypeOptions()
  pagination.value.current_page = 1
  await fetchAudits()
})

watchDebounced(
  [filterDateFrom, filterDateTo, filterAuditableType, filterEvent],
  () => {
    pagination.value.current_page = 1
    void fetchAudits()
  },
  { debounce: 400 },
)

watch(
  () => pagination.value.per_page,
  (next, prev) => {
    if (prev === undefined || next === prev) {
      return
    }
    pagination.value.current_page = 1
    void fetchAudits()
  },
)

onMounted(async () => {
  await loadTypeOptions()
  await fetchAudits()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1 max-w-3xl">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            TRD y archivo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Auditoría catálogo y TRD
          </h2>
          <p class="text-muted-foreground leading-relaxed text-sm">
            HU-TRD-18: trazabilidad de cambios en series, subseries, tipos documentales, versiones TRD,
            reglas de retención y asociaciones. Los registros son de solo lectura.
          </p>
        </div>
        <Button variant="outline" size="sm" class="shrink-0" :disabled="loading" @click="fetchAudits">
          <Icon name="i-lucide-refresh-cw" :class="['mr-2 h-4 w-4', loading && 'animate-spin']" />
          Actualizar
        </Button>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          v-for="opt in ARCHIVAL_AUDIT_SCOPE_OPTIONS"
          :key="opt.value"
          :variant="filterScope === opt.value ? 'default' : 'outline'"
          size="sm"
          @click="setScope(opt.value)"
        >
          {{ opt.label }}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Historial — {{ pagination.scope_label || 'Catálogo y TRD' }}
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Filtre por fechas, tipo de registro o acción. El ámbito «Catálogo» y «TRD» muestran conjuntos distintos de entidades auditadas.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div class="grid gap-4 lg:grid-cols-12 lg:items-end">
              <div class="lg:col-span-4">
                <DateRangeStringPicker
                  id="archival-audit-dates"
                  label="Rango de fechas"
                  v-model:from="filterDateFrom"
                  v-model:to="filterDateTo"
                  placeholder-text="Cualquier fecha"
                  compact
                />
              </div>
              <div class="grid gap-1.5 lg:col-span-3">
                <Label for="arch-audit-type">Tipo de registro</Label>
                <Select v-model="filterAuditableType">
                  <SelectTrigger id="arch-audit-type">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent class="max-h-72">
                    <SelectItem :value="ALL_MODELS">
                      Todos en este ámbito
                    </SelectItem>
                    <SelectItem v-for="opt in typeOptions" :key="opt.type" :value="opt.type">
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="grid gap-1.5 lg:col-span-3">
                <Label for="arch-audit-event">Acción</Label>
                <Select v-model="filterEvent">
                  <SelectTrigger id="arch-audit-event">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in ARCHIVAL_AUDIT_EVENT_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="grid gap-1.5 lg:col-span-2">
                <Label for="arch-audit-per-page">Por página</Label>
                <Select
                  :model-value="String(pagination.per_page)"
                  @update:model-value="(v) => { pagination.per_page = Number(v) }"
                >
                  <SelectTrigger id="arch-audit-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="n in PER_PAGE_OPTIONS" :key="n" :value="String(n)">
                      {{ n }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <Button variant="secondary" size="sm" @click="clearFilters">
                <Icon name="i-lucide-filter-x" class="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
              <label class="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <Checkbox v-model="showTechnicalJson" />
                Ver JSON técnico
              </label>
            </div>
          </div>

          <div v-if="loading" class="flex justify-center py-16">
            <Icon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="!audits.length" class="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
            Sin eventos con los filtros actuales.
          </div>
          <div v-else class="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ámbito</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead class="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-for="row in audits" :key="row.id">
                  <TableRow class="hover:bg-muted/40">
                    <TableCell class="text-sm text-muted-foreground tabular-nums">
                      {{ formatWhen(row.created_at) }}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" class="font-normal whitespace-nowrap">
                        {{ row.archival_scope_label }}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge :variant="eventBadgeVariant(row.event)" class="font-normal">
                        {{ eventLabel(row.event) }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-sm max-w-xs">
                      <span class="font-medium">{{ row.auditable_label }}</span>
                      <span v-if="row.subject_summary" class="block text-xs text-muted-foreground truncate">
                        {{ row.subject_summary }}
                      </span>
                    </TableCell>
                    <TableCell class="text-sm">
                      {{ row.user?.name ?? 'Sistema' }}
                    </TableCell>
                    <TableCell class="text-right">
                      <Button variant="ghost" size="icon" class="h-8 w-8" @click="toggleRowDetail(row.id)">
                        <Icon :name="expandedId === row.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="expandedId === row.id" class="bg-muted/15">
                    <TableCell colspan="6" class="p-4">
                      <p class="text-sm text-muted-foreground mb-3">
                        {{ row.description }}
                      </p>
                      <div class="grid gap-3 md:grid-cols-2">
                        <div class="rounded-lg border p-3 bg-background">
                          <p class="text-xs font-semibold text-muted-foreground mb-2">
                            Valores anteriores
                          </p>
                          <pre class="text-xs whitespace-pre-wrap font-mono max-h-48 overflow-auto">{{ formatJsonPreview(showTechnicalJson ? row.old_values : row.old_values_labeled) }}</pre>
                        </div>
                        <div class="rounded-lg border p-3 bg-background">
                          <p class="text-xs font-semibold text-muted-foreground mb-2">
                            Valores nuevos
                          </p>
                          <pre class="text-xs whitespace-pre-wrap font-mono max-h-48 overflow-auto">{{ formatJsonPreview(showTechnicalJson ? row.new_values : row.new_values_labeled) }}</pre>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </template>
              </TableBody>
            </Table>
          </div>

          <div
            v-if="!loading && pagination.last_page > 1"
            class="flex flex-wrap gap-2 justify-between items-center border-t pt-4"
          >
            <span class="text-sm text-muted-foreground">
              {{ pagination.total }} evento(s) · página {{ pagination.current_page }} de {{ pagination.last_page }}
            </span>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" :disabled="pagination.current_page <= 1" @click="goPage(pagination.current_page - 1)">
                Anterior
              </Button>
              <Button variant="outline" size="sm" :disabled="pagination.current_page >= pagination.last_page" @click="goPage(pagination.current_page + 1)">
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
