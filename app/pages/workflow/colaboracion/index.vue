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

const loading = ref(true)
const rows = ref<WorkflowTaskCollaboratorRow[]>([])
const statusFilter = ref<'all' | 'pending' | 'responded'>('all')

const pendingCount = computed(() => rows.value.filter(row => row.status === 'pending').length)

async function load() {
  loading.value = true

  try {
    rows.value = await workflowApi.fetchMyCollaborations(
      statusFilter.value === 'all' ? undefined : statusFilter.value,
    )
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
    rows.value = []
  }
  finally {
    loading.value = false
  }
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
  void load()
})

onMounted(() => {
  void load()
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

    <div class="flex flex-wrap items-center gap-3">
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
      <Badge
        v-if="pendingCount > 0"
        variant="secondary"
        class="border-primary/20 bg-primary/10 text-primary"
      >
        {{ pendingCount }} pendiente(s)
      </Badge>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="size-9 animate-spin text-muted-foreground" />
    </div>

    <Card v-else>
      <CardContent class="p-0">
        <ul v-if="rows.length" class="divide-y">
          <li
            v-for="row in rows"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ row.filing?.filing_number ?? 'Radicado' }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ row.filing?.subject ?? '—' }}
                <span v-if="row.task?.stage?.name"> · {{ row.task.stage.name }}</span>
              </p>
              <p v-if="row.invited_by" class="mt-1 text-xs text-muted-foreground">
                Solicitado por {{ row.invited_by.name }}
              </p>
              <p v-if="row.request_note" class="mt-1 line-clamp-2 text-sm">
                {{ row.request_note }}
              </p>
              <div v-if="row.filing?.requires_response && row.filing.sla_business_days" class="mt-2 max-w-md">
                <VentanillaSlaProgressBar
                  compact
                  :sla-business-days="row.filing.sla_business_days"
                  :elapsed-business-days="row.filing.sla_elapsed_business_days"
                  :deadline="row.filing.response_deadline_at"
                />
              </div>
              <p v-else-if="row.filing?.requires_response && row.filing.response_deadline_at" class="mt-1 text-xs text-muted-foreground">
                Vence {{ formatDate(row.filing.response_deadline_at) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge :variant="row.status === 'responded' ? 'secondary' : 'outline'">
                {{ statusLabel(row.status) }}
              </Badge>
              <Button size="sm" type="button" @click="openCollaboration(row)">
                {{ row.status === 'pending' ? 'Adjuntar aporte' : 'Ver aporte' }}
              </Button>
            </div>
          </li>
        </ul>
        <p v-else class="px-4 py-12 text-center text-sm text-muted-foreground">
          No tiene colaboraciones {{ statusFilter === 'pending' ? 'pendientes' : statusFilter === 'responded' ? 'respondidas' : 'asignadas' }}.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
