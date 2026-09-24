<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowTaskCollaboratorRow } from '~/types/workflow'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_colaborar',
})

const router = useRouter()
const workflowApi = useWorkflowApi()

const pageSize = 6
const loading = ref(true)
const rows = ref<WorkflowTaskCollaboratorRow[]>([])
const statusFilter = ref<'all' | 'pending' | 'responded'>('all')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const page = ref(1)

let filterDebounce: ReturnType<typeof setTimeout> | null = null

const pendingCount = computed(() => rows.value.filter(row => row.status === 'pending').length)
const lastPage = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)))
const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize

  return rows.value.slice(start, start + pageSize)
})
const rangeLabel = computed(() => {
  if (rows.value.length === 0) {
    return ''
  }

  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, rows.value.length)

  return `${start}–${end} de ${rows.value.length}`
})

async function load() {
  const from = filterDateFrom.value.trim()
  const to = filterDateTo.value.trim()

  if (from && to && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final.')

    return
  }

  loading.value = true

  try {
    rows.value = await workflowApi.fetchMyCollaborations(
      statusFilter.value === 'all' ? undefined : statusFilter.value,
      {
        createdFrom: from || undefined,
        createdTo: to || undefined,
      },
    )
    if (page.value > lastPage.value) {
      page.value = lastPage.value
    }
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
    rows.value = []
    page.value = 1
  }
  finally {
    loading.value = false
  }
}

function scheduleLoad() {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
  }

  filterDebounce = setTimeout(() => {
    filterDebounce = null
    page.value = 1
    void load()
  }, 400)
}

function statusLabel(status: WorkflowTaskCollaboratorRow['status']): string {
  return status === 'responded' ? 'Respondida' : 'Pendiente'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO')
}

function openCollaboration(row: WorkflowTaskCollaboratorRow) {
  void router.push(`/workflow/colaboracion/${row.id}`)
}

watch(statusFilter, () => {
  page.value = 1
  void load()
})

watch([filterDateFrom, filterDateTo], scheduleLoad)

onMounted(() => {
  void load()
})

onUnmounted(() => {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Mis colaboraciones
        </h1>
        <p class="text-sm text-muted-foreground">
          Aportes que le solicitaron en etapas de gestión. Puede tener varias pendientes a la vez.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="load">
        Actualizar
      </Button>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">
          Estado
        </Label>
        <Select v-model="statusFilter">
          <SelectTrigger class="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas
            </SelectItem>
            <SelectItem value="pending">
              Pendientes
            </SelectItem>
            <SelectItem value="responded">
              Respondidas
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="min-w-[16rem] flex-1 space-y-1 sm:max-w-md">
        <Label class="text-xs text-muted-foreground">
          Fecha de solicitud
        </Label>
        <DateRangeStringPicker
          id="colaboraciones-fecha"
          v-model:from="filterDateFrom"
          v-model:to="filterDateTo"
          placeholder-text="Desde — Hasta"
          compact
          full-width
        />
      </div>
      <Badge
        v-if="pendingCount > 0"
        variant="secondary"
        class="mb-1 border-primary/20 bg-primary/10 text-primary"
      >
        {{ pendingCount }} pendiente(s)
      </Badge>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <template v-else>
      <div v-if="pageRows.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="row in pageRows"
          :key="row.id"
          class="flex h-full flex-col rounded-lg border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium">
              {{ row.filing?.filing_number ?? 'Radicado' }}
            </p>
            <Badge :variant="row.status === 'responded' ? 'secondary' : 'outline'">
              {{ statusLabel(row.status) }}
            </Badge>
          </div>
          <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {{ row.filing?.subject ?? '—' }}
            <span v-if="row.task?.stage?.name"> · {{ row.task.stage.name }}</span>
          </p>
          <p v-if="row.invited_by" class="mt-2 text-xs text-muted-foreground">
            Solicitado por {{ row.invited_by.name }}
          </p>
          <p v-if="row.request_note" class="mt-2 line-clamp-3 text-sm">
            {{ row.request_note }}
          </p>
          <div v-if="row.filing?.requires_response && row.filing.sla_business_days" class="mt-3">
            <VentanillaSlaProgressBar
              compact
              :sla-business-days="row.filing.sla_business_days"
              :elapsed-business-days="row.filing.sla_elapsed_business_days"
              :deadline="row.filing.response_deadline_at"
            />
          </div>
          <p v-else-if="row.filing?.requires_response && row.filing.response_deadline_at" class="mt-3 text-xs text-muted-foreground">
            Vence {{ formatDate(row.filing.response_deadline_at) }}
          </p>
          <div class="mt-auto pt-4">
            <Button class="w-full" size="sm" type="button" @click="openCollaboration(row)">
              {{ row.status === 'pending' ? 'Adjuntar aporte' : 'Ver aporte' }}
            </Button>
          </div>
        </article>
      </div>
      <p v-else class="rounded-lg border px-4 py-12 text-center text-sm text-muted-foreground">
        No tiene colaboraciones {{ statusFilter === 'pending' ? 'pendientes' : statusFilter === 'responded' ? 'respondidas' : 'asignadas' }}.
      </p>

      <div
        v-if="rows.length > pageSize"
        class="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <p class="text-muted-foreground">
          {{ rangeLabel }} · página {{ page }} de {{ lastPage }}
        </p>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="page <= 1" @click="page -= 1">
            Anterior
          </Button>
          <Button variant="outline" size="sm" :disabled="page >= lastPage" @click="page += 1">
            Siguiente
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
