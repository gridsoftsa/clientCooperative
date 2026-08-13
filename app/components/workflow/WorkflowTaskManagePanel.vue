<script setup lang="ts">
import { toast } from 'vue-sonner'
import ArchivalFileWorkflowUploadPanel from '~/components/workflow/ArchivalFileWorkflowUploadPanel.vue'
import WorkflowTaskCollaboratorsPanel from '~/components/workflow/WorkflowTaskCollaboratorsPanel.vue'
import WorkflowTaskFilingAttachmentsPanel from '~/components/workflow/WorkflowTaskFilingAttachmentsPanel.vue'
import WorkflowTaskFilingSummaryPanel from '~/components/workflow/WorkflowTaskFilingSummaryPanel.vue'
import WorkflowTaskHistoryTimeline from '~/components/workflow/WorkflowTaskHistoryTimeline.vue'
import type { WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'
import { extractApiErrorMessage, isOpenWorkflowTaskStatus } from '~/utils/workflow-task-ui'

const props = defineProps<{
  task: WorkflowTaskCard
  context?: WorkflowFilingContext | null
  users: Array<{ id: number, name: string }>
  /** Si true, cierra el contenedor (p. ej. sheet) tras avanzar, devolver o reasignar. */
  closeOnWorkflowAction?: boolean
}>()

const emit = defineEmits<{
  changed: []
  refreshed: []
  close: []
}>()

const { hasPermission } = usePermissions()
const workflowApi = useWorkflowApi()

const activeTab = ref('actions')
const note = ref('')
const comment = ref('')
const returnStageId = ref<string>('')
const reassignUserId = ref<string>('')
const saving = ref(false)
const attachmentsPanelRef = ref<InstanceType<typeof WorkflowTaskFilingAttachmentsPanel> | null>(null)

const showArchivalTab = computed(() =>
  Boolean(props.context?.archival_file && props.context?.open_task),
)
const canAttachFilingFiles = computed(() =>
  props.context?.is_active !== false
  && props.context?.open_task
  && (hasPermission('ventanilla_gestionar') || hasPermission('workflow_gestionar')),
)
const showCollaboratorsTab = computed(() =>
  props.context?.open_task?.stage?.ventanilla_role === 'management'
  && props.context?.collaborators?.can_manage,
)
const showFilingTab = computed(() => Boolean(props.context?.filing?.id))
const collaboratorsPending = computed(() => props.context?.collaborators?.pending ?? 0)
const canManage = computed(() => hasPermission('workflow_gestionar'))
const canReassign = computed(() => hasPermission('workflow_reasignar'))

const stageRules = computed(() => props.context?.open_task?.stage ?? props.task.stage ?? null)
const returnableStages = computed(() => props.context?.returnable_stages ?? [])
const advanceGuidance = computed(() => props.context?.advance_guidance ?? null)
const canAdvanceTask = computed(() =>
  isOpenWorkflowTaskStatus(props.task?.status)
  && props.context?.is_active !== false,
)
const showAdvanceButton = computed(() =>
  canManage.value
  && stageRules.value?.allows_advance
  && canAdvanceTask.value
  && !advanceGuidance.value,
)

watch(() => props.task.id, () => {
  note.value = ''
  comment.value = ''
  returnStageId.value = ''
  reassignUserId.value = ''
  activeTab.value = 'actions'
})

async function runWorkflowAction(action: () => Promise<unknown>, success: string) {
  saving.value = true
  try {
    await action()
    toast.success(success)
    emit('changed')
    if (props.closeOnWorkflowAction) {
      emit('close')
    }
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

async function runCommentAction() {
  if (!comment.value.trim()) {
    return
  }

  saving.value = true
  try {
    await workflowApi.commentTask(props.task.id, comment.value.trim())
    toast.success('Comentario registrado.')
    comment.value = ''
    emit('changed')
    emit('refreshed')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

async function advance() {
  saving.value = true

  try {
    const hadPendingFiles = attachmentsPanelRef.value?.hasPendingFilesToAttach() ?? false

    if (attachmentsPanelRef.value) {
      const ready = await attachmentsPanelRef.value.attachPendingFiles()

      if (!ready) {
        return
      }
    }

    await workflowApi.advanceTask(props.task.id, note.value || undefined)

    toast.success(
      hadPendingFiles
        ? 'Documentos adjuntados y etapa avanzada correctamente.'
        : 'Tarea avanzada.',
    )
    emit('changed')

    if (props.closeOnWorkflowAction) {
      emit('close')
    }
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

function returnTask() {
  if (!returnStageId.value) {
    return
  }

  runWorkflowAction(
    () => workflowApi.returnTask(props.task.id, Number(returnStageId.value), note.value || undefined),
    'Tarea devuelta.',
  )
}

function reassign() {
  if (!reassignUserId.value) {
    return
  }

  runWorkflowAction(
    () => workflowApi.reassignTask(props.task.id, Number(reassignUserId.value), note.value || undefined),
    'Tarea reasignada.',
  )
}

function refreshContext() {
  emit('refreshed')
  emit('changed')
}
</script>

<template>
  <Tabs v-model="activeTab" default-value="actions" class="flex min-h-0 flex-1 flex-col">
    <TabsList class="flex h-auto w-full shrink-0 flex-wrap gap-1 p-1">
      <TabsTrigger value="actions" class="flex-1 sm:flex-none">
        Acciones
      </TabsTrigger>
      <TabsTrigger v-if="showFilingTab" value="filing" class="flex-1 sm:flex-none">
        Radicado
      </TabsTrigger>
      <TabsTrigger v-if="showCollaboratorsTab" value="collaborators" class="flex-1 sm:flex-none">
        Colaboradores
        <Badge v-if="collaboratorsPending > 0" variant="destructive" class="ml-2">
          {{ collaboratorsPending }}
        </Badge>
      </TabsTrigger>
      <TabsTrigger v-if="showArchivalTab" value="archival" class="flex-1 sm:flex-none">
        Expediente
      </TabsTrigger>
      <TabsTrigger value="history" class="flex-1 sm:flex-none">
        Historial
      </TabsTrigger>
    </TabsList>

    <TabsContent value="actions" class="mt-6 space-y-6">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div class="space-y-5">
          <div v-if="task" class="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span class="text-muted-foreground">Responsable:</span> {{ task.assignee?.name ?? 'Sin asignar' }}</p>
            <p v-if="task.due_at">
              <span class="text-muted-foreground">Vence:</span>
              {{ new Date(task.due_at).toLocaleString('es-CO') }}
            </p>
            <p v-if="task.days_overdue" class="text-destructive">
              {{ task.days_overdue }} días de retraso
            </p>
            <p v-if="context?.workflow?.name">
              <span class="text-muted-foreground">Flujo:</span> {{ context.workflow.name }}
            </p>
          </div>

          <div v-if="context?.warnings?.length" class="space-y-2">
            <Alert
              v-for="warning in context.warnings"
              :key="warning.code"
              variant="secondary"
            >
              <Icon name="i-lucide-triangle-alert" class="size-4" />
              <AlertDescription>{{ warning.message }}</AlertDescription>
            </Alert>
          </div>

          <div class="grid gap-2.5">
            <Label>Nota (opcional)</Label>
            <Textarea v-model="note" rows="3" placeholder="Motivo o comentario de la acción" />
          </div>

          <Alert v-if="advanceGuidance" class="border-primary/40 bg-primary/5">
            <Icon name="i-lucide-info" class="size-4" />
            <AlertTitle>Cierre desde ventanilla</AlertTitle>
            <AlertDescription>
              {{ advanceGuidance }}
            </AlertDescription>
          </Alert>

          <Alert v-else-if="!canAdvanceTask" variant="secondary">
            <Icon name="i-lucide-circle-check" class="size-4" />
            <AlertTitle>Tarea no activa</AlertTitle>
            <AlertDescription>
              Esta tarea ya fue completada o el proceso está cerrado. Actualice la bandeja o el radicado.
            </AlertDescription>
          </Alert>

          <Alert v-if="collaboratorsPending > 0" variant="destructive">
            <Icon name="i-lucide-users" class="size-4" />
            <AlertTitle>Colaboradores pendientes</AlertTitle>
            <AlertDescription>
              Hay {{ collaboratorsPending }} colaborador(es) sin respuesta. Revise la pestaña Colaboradores antes de avanzar.
            </AlertDescription>
          </Alert>
        </div>

        <div class="space-y-5">
          <div v-if="canManage && stageRules?.allows_return && returnableStages.length" class="space-y-2.5 rounded-lg border bg-muted/20 p-4">
            <Label>Devolver a etapa</Label>
            <Select v-model="returnStageId">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione etapa anterior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="stage in returnableStages"
                  :key="stage.id"
                  :value="String(stage.id)"
                >
                  {{ stage.sort_order }}. {{ stage.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" class="h-10 w-full" :disabled="saving || !returnStageId" @click="returnTask">
              Devolver
            </Button>
          </div>

          <div v-if="canReassign && stageRules?.allows_reassign" class="space-y-2.5 rounded-lg border bg-muted/20 p-4">
            <Label>Reasignar a</Label>
            <Select v-model="reassignUserId">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="user in users" :key="user.id" :value="String(user.id)">
                  {{ user.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" class="h-10 w-full" :disabled="saving || !reassignUserId" @click="reassign">
              Reasignar
            </Button>
          </div>

          <div v-if="canManage" class="space-y-2.5 rounded-lg border bg-muted/20 p-4">
            <Label>Comentario al historial</Label>
            <Textarea v-model="comment" rows="3" placeholder="Agregar comentario al historial" />
            <Button variant="secondary" class="h-10 w-full" :disabled="saving || !comment.trim()" @click="runCommentAction">
              Registrar comentario
            </Button>
          </div>
        </div>
      </div>

      <WorkflowTaskFilingAttachmentsPanel
        v-if="canAttachFilingFiles && context?.filing?.id"
        ref="attachmentsPanelRef"
        :filing-id="context.filing.id"
        :disabled="saving"
        @attached="refreshContext"
      />

      <Button
        v-if="showAdvanceButton"
        class="h-11 w-full"
        :disabled="saving || collaboratorsPending > 0"
        @click="advance"
      >
        {{ saving ? 'Procesando…' : 'Avanzar etapa' }}
      </Button>
    </TabsContent>

    <TabsContent v-if="showFilingTab && context?.filing" value="filing" class="mt-6">
      <WorkflowTaskFilingSummaryPanel :filing="context.filing" />
    </TabsContent>

    <TabsContent
      v-if="showCollaboratorsTab && context?.open_task"
      value="collaborators"
      class="mt-6"
    >
      <WorkflowTaskCollaboratorsPanel
        :task-id="context.open_task.id"
        @changed="refreshContext"
      />
    </TabsContent>

    <TabsContent v-if="showArchivalTab && context?.archival_file" value="archival" class="mt-6">
      <ArchivalFileWorkflowUploadPanel
        :archival-context="context.archival_file"
        @uploaded="emit('changed')"
      />
    </TabsContent>

    <TabsContent value="history" class="mt-6">
      <WorkflowTaskHistoryTimeline :events="context?.events ?? []" />
    </TabsContent>
  </Tabs>
</template>
