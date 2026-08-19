<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_gestionar',
})

const route = useRoute()
const router = useRouter()
const workflowApi = useWorkflowApi()
const { ensureLoaded, labelFor } = useVentanillaFunctionalTypeLabels()

const taskId = computed(() => Number(route.params.id))

const loading = ref(true)
const task = ref<WorkflowTaskCard | null>(null)
const context = ref<WorkflowFilingContext | null>(null)
const users = ref<Array<{ id: number, name: string }>>([])

const backUrl = computed(() => {
  const from = route.query.from

  if (typeof from === 'string') {
    if (from.startsWith('ventanilla/')) {
      return `/ventanilla/${from.replace('ventanilla/', '')}`
    }

    if (from === 'board') {
      return '/workflow'
    }

    if (from === 'bandeja') {
      const filingId = route.query.ventanilla_filing_id

      if (typeof filingId === 'string' && filingId !== '') {
        return `/workflow/bandeja?ventanilla_filing_id=${filingId}`
      }

      return '/workflow/bandeja'
    }
  }

  return '/workflow/bandeja'
})

const backLabel = computed(() => {
  const from = route.query.from

  if (typeof from === 'string') {
    if (from.startsWith('ventanilla/')) {
      return 'Volver al radicado'
    }

    if (from === 'board') {
      return 'Volver al tablero'
    }

    if (from === 'bandeja') {
      return 'Volver a bandeja'
    }
  }

  return 'Volver a bandeja'
})

const pageTitle = computed(() => {
  if (!task.value) {
    return 'Gestionar tarea'
  }

  const stage = task.value.stage?.name ?? context.value?.open_task?.stage?.name

  return stage ? `Gestionar · ${stage}` : 'Gestionar tarea'
})

const subjectLabel = computed(() => {
  const subject = task.value?.subject

  if (!subject) {
    return null
  }

  const typeLabel = labelFor(subject.functional_type_key, subject.functional_type_label)

  return {
    number: subject.filing_number ?? null,
    text: subject.subject ?? '—',
    type: typeLabel,
  }
})

async function loadContext() {
  const filingId = task.value?.subject?.id ?? context.value?.filing?.id

  if (!filingId) {
    context.value = null

    return
  }

  context.value = await workflowApi.fetchFilingContext(filingId)
}

async function load() {
  loading.value = true

  try {
    task.value = await workflowApi.fetchTask(taskId.value)

    if (users.value.length === 0) {
      users.value = await workflowApi.fetchAssignableUsers()
    }

    await loadContext()
  }
  catch (error) {
    task.value = null
    context.value = null
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  router.push(backUrl.value)
}

async function onChanged() {
  await load()
}

function onWorkflowCompleted() {
  goBack()
}

watch(taskId, () => {
  void load()
}, { immediate: true })

onMounted(() => {
  void ensureLoaded()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1 space-y-3">
        <Button
          variant="outline"
          size="sm"
          class="w-fit"
          @click="goBack"
        >
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          {{ backLabel }}
        </Button>
        <div class="min-w-0 space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ pageTitle }}
          </h1>
          <p v-if="subjectLabel" class="text-sm text-muted-foreground">
            <span v-if="subjectLabel.number" class="font-medium text-foreground">{{ subjectLabel.number }}</span>
            <span v-if="subjectLabel.number"> · </span>
            {{ subjectLabel.text }}
            <span v-if="subjectLabel.type"> · {{ subjectLabel.type }}</span>
          </p>
          <p v-else-if="task?.workflow?.name" class="text-sm text-muted-foreground">
            {{ task.workflow.name }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 sm:justify-end">
        <Button
          v-if="task?.subject?.id"
          variant="outline"
          size="sm"
          @click="router.push(`/ventanilla/${task.subject.id}`)"
        >
          <Icon name="i-lucide-external-link" class="mr-1 size-4" />
          Abrir radicado
        </Button>
        <Button variant="outline" size="sm" :disabled="loading" @click="load">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
          Actualizar
        </Button>
      </div>
    </div>

    <Card v-if="loading">
      <CardContent class="py-16 text-center text-sm text-muted-foreground">
        Cargando tarea…
      </CardContent>
    </Card>

    <Card v-else-if="!task">
      <CardContent class="space-y-4 py-12 text-center">
        <p class="text-sm text-muted-foreground">
          No se encontró la tarea solicitada.
        </p>
        <Button variant="outline" @click="goBack">
          Volver
        </Button>
      </CardContent>
    </Card>

    <Card v-else class="flex min-h-[70vh] flex-col">
      <CardContent class="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <WorkflowTaskManagePanel
          :task="task"
          :context="context"
          :users="users"
          close-on-workflow-action
          @changed="onChanged"
          @refreshed="loadContext"
          @close="onWorkflowCompleted"
        />
      </CardContent>
      <CardFooter class="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-4 md:px-6">
        <p class="text-muted-foreground text-xs">
          Los cambios no guardados en documentos pendientes no se adjuntarán al salir.
        </p>
        <Button variant="outline" @click="goBack">
          <Icon name="i-lucide-x" class="mr-1 size-4" />
          Cancelar
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
