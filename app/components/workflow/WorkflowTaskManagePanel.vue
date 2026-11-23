<script setup lang="ts">
import { toast } from 'vue-sonner'
import ArchivalFileWorkflowUploadPanel from '~/components/workflow/ArchivalFileWorkflowUploadPanel.vue'
import WorkflowTaskCollaboratorsPanel from '~/components/workflow/WorkflowTaskCollaboratorsPanel.vue'
import WorkflowTaskFilingAssignPanel from '~/components/workflow/WorkflowTaskFilingAssignPanel.vue'
import WorkflowTaskFilingClosePanel from '~/components/workflow/WorkflowTaskFilingClosePanel.vue'
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
const ventanillaApi = useVentanillaApi()

const activeTab = ref('actions')
const note = ref('')
const comment = ref('')
const returnStageId = ref<string>('')
const reassignUserId = ref<number | null>(null)
const saving = ref(false)
const attachmentsPanelRef = ref<InstanceType<typeof WorkflowTaskFilingAttachmentsPanel> | null>(null)
const hasPendingFilingFiles = ref(false)
const metadataFieldsRef = ref<{
  findFirstMissingRequiredField?: () => { fieldCode: string, fieldIndex: number, message: string } | null
  focusMissingField?: (fieldCode: string, fieldIndex: number) => void
} | null>(null)
const metadataValues = ref<Record<string, unknown>>({})
const savingMetadata = ref(false)
const metadataSubmitAttempted = ref(false)

const showArchivalTab = computed(() =>
  Boolean(props.context?.archival_file && props.context?.open_task),
)
const canAttachFilingFiles = computed(() =>
  props.context?.is_active !== false
  && props.context?.open_task
  && (hasPermission('ventanilla_gestionar') || hasPermission('workflow_gestionar')),
)
const canManage = computed(() => hasPermission('workflow_gestionar'))
const canReassign = computed(() => hasPermission('workflow_reasignar'))
const reassignUserOptions = computed(() =>
  props.users.map(user => ({
    value: user.id,
    label: user.name,
  })),
)
const canAssignFiling = computed(() => hasPermission('ventanilla_asignar'))
const showFilingTab = computed(() => Boolean(props.context?.filing?.id))
const collaboratorsPending = computed(() => props.context?.collaborators?.pending ?? 0)
const collaboratorsTotal = computed(() => props.context?.collaborators?.total ?? 0)
const collaboratorsCompleted = computed(() =>
  collaboratorsTotal.value > 0 && collaboratorsPending.value === 0,
)
const stageAllowsCollaborators = computed(() =>
  props.context?.open_task?.stage?.allows_collaborators === true,
)
const showCollaboratorsTab = computed(() =>
  canManage.value
  && (
    stageAllowsCollaborators.value
    || collaboratorsTotal.value > 0
  ),
)
const canInviteCollaborators = computed(() =>
  stageAllowsCollaborators.value
  && props.context?.collaborators?.can_manage === true,
)
const myPendingCollaborationId = computed(() => props.context?.collaborators?.my_pending_collaboration_id ?? null)
const showFilingAssignment = computed(() =>
  canAssignFiling.value
  && props.context?.is_active !== false
  && props.context?.open_task?.stage?.ventanilla_role === 'assignment'
  && props.context?.filing?.status === 'registered'
  && Boolean(props.context?.filing?.id),
)
const canCloseFilingFromWorkflow = computed(() =>
  hasPermission('ventanilla_gestionar')
  && props.context?.is_active !== false
  && props.context?.open_task?.stage?.ventanilla_role === 'response_close'
  && Boolean(props.context?.filing?.id)
  && props.context?.filing?.status !== 'closed'
  && props.context?.filing?.status !== 'voided',
)
const filingRequiresResponse = computed(() => props.context?.filing?.requires_response === true)

const stageRules = computed(() => props.context?.open_task?.stage ?? props.task.stage ?? null)
const returnableStages = computed(() => props.context?.returnable_stages ?? [])
const advanceGuidance = computed(() => props.context?.advance_guidance ?? null)
const viewedTaskIsCurrentOpen = computed(() =>
  Boolean(props.task?.id && props.context?.open_task?.id === props.task.id),
)
const canAdvanceTask = computed(() => {
  const status = viewedTaskIsCurrentOpen.value
    ? (props.context?.open_task?.status ?? props.task?.status)
    : props.task?.status

  return isOpenWorkflowTaskStatus(status) && props.context?.is_active !== false
})
const showInactiveTaskAlert = computed(() =>
  !advanceGuidance.value && !viewedTaskIsCurrentOpen.value && !canAdvanceTask.value,
)
const isManagementStage = computed(() =>
  viewedTaskIsCurrentOpen.value
  && props.context?.open_task?.stage?.ventanilla_role === 'management',
)
const showFilingMetadataCapture = computed(() =>
  isManagementStage.value
  && props.context?.open_task?.stage?.captures_metadata === true
  && Boolean(props.context?.filing?.id),
)
const needsFilingMetadata = computed(() =>
  showFilingMetadataCapture.value
  && props.context?.filing_metadata_complete === false
  && filingMetadataFieldCount.value > 0,
)
const stageMetadata = computed(() => props.context?.stage_metadata ?? null)
const filingMetadataSchema = computed(() => {
  if (stageMetadata.value?.source === 'stage' || stageMetadata.value?.source === 'filing')
    return stageMetadata.value.schema ?? null

  return props.context?.filing?.archival_metadata_schema ?? null
})
const filingMetadataFieldCount = computed(() =>
  (filingMetadataSchema.value?.fields ?? []).filter(field => field.is_active !== false).length,
)
const actionWarnings = computed(() =>
  (props.context?.warnings ?? []).filter(warning => warning.code !== 'filing_metadata_incomplete'),
)
const showAdvanceButton = computed(() =>
  canManage.value
  && stageRules.value?.allows_advance
  && canAdvanceTask.value
  && !advanceGuidance.value
  && !needsFilingMetadata.value,
)
const showReturnAction = computed(() =>
  canManage.value
  && Boolean(stageRules.value?.allows_return)
  && returnableStages.value.length > 0,
)
const showReassignAction = computed(() =>
  canReassign.value && Boolean(stageRules.value?.allows_reassign),
)
const showMoreActionsTab = computed(() =>
  showReturnAction.value || showReassignAction.value || canManage.value,
)
const showPrimaryStageAction = computed(() =>
  showAdvanceButton.value || showFilingAssignment.value || canCloseFilingFromWorkflow.value,
)

watch(() => [props.context?.open_task?.id, props.context?.stage_metadata?.source, props.context?.filing?.id] as const, () => {
  const stageValues = props.context?.stage_metadata?.values
  metadataValues.value = {
    ...(stageValues ?? props.context?.filing?.metadata_values ?? {}),
  }
  metadataSubmitAttempted.value = false
}, { immediate: true })

watch(() => props.task.id, () => {
  note.value = ''
  comment.value = ''
  returnStageId.value = ''
  reassignUserId.value = null
  activeTab.value = 'actions'
})

watch(
  () => [showFilingMetadataCapture.value, needsFilingMetadata.value] as const,
  ([show, needs]) => {
    if (show && needs && activeTab.value === 'actions') {
      activeTab.value = 'metadata'
    }
  },
)

async function runWorkflowAction(action: () => Promise<unknown>, success: string) {
  saving.value = true
  try {
    await action()
    toast.success(success)
    if (props.closeOnWorkflowAction) {
      emit('close')

      return
    }

    emit('changed')
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

async function attachPendingFilesIfNeeded(): Promise<boolean> {
  if (!attachmentsPanelRef.value) {
    if (hasPendingFilingFiles.value) {
      toast.error('El documento seleccionado no se envió. Vuelva a adjuntarlo antes de cerrar.')

      return false
    }

    return true
  }

  return attachmentsPanelRef.value.attachPendingFiles()
}

function goToFilingGestion(): void {
  const filingId = props.context?.filing?.id

  if (!filingId) {
    return
  }

  void navigateTo(`/ventanilla/${filingId}?section=gestion`)
}

function goToCurrentOpenTask(): void {
  const openTaskId = props.context?.open_task?.id
  if (!openTaskId) {
    return
  }

  void navigateTo(`/workflow/tareas/${openTaskId}`)
}

function onFilingClosed(): void {
  if (props.closeOnWorkflowAction) {
    emit('close')

    return
  }

  emit('changed')
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

    if (props.closeOnWorkflowAction) {
      emit('close')

      return
    }

    emit('changed')
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
  if (reassignUserId.value == null) {
    return
  }

  const userId = reassignUserId.value

  runWorkflowAction(
    () => workflowApi.reassignTask(props.task.id, userId, note.value || undefined),
    'Tarea reasignada.',
  )
}

function refreshContext() {
  emit('refreshed')
  emit('changed')
}

async function saveFilingMetadata(): Promise<void> {
  const filingId = props.context?.filing?.id
  if (!filingId || filingMetadataFieldCount.value === 0) {
    return
  }

  metadataSubmitAttempted.value = true
  const missing = metadataFieldsRef.value?.findFirstMissingRequiredField?.()
  if (missing) {
    toast.error(missing.message)
    metadataFieldsRef.value?.focusMissingField?.(missing.fieldCode, missing.fieldIndex)
    return
  }

  savingMetadata.value = true
  try {
    if (stageMetadata.value?.source === 'stage' && props.context?.open_task?.id) {
      await workflowApi.updateTaskMetadata(props.context.open_task.id, metadataValues.value)
    }
    else {
      await ventanillaApi.updateFilingMetadata(filingId, metadataValues.value)
    }
    toast.success('Metadatos guardados.')
    metadataSubmitAttempted.value = false
    refreshContext()
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    savingMetadata.value = false
  }
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
      <TabsTrigger v-if="showFilingMetadataCapture" value="metadata" class="flex-1 sm:flex-none">
        Metadatos
        <Badge v-if="needsFilingMetadata" variant="destructive" class="ml-2">
          Obligatorio
        </Badge>
      </TabsTrigger>
      <TabsTrigger v-if="showCollaboratorsTab" value="collaborators" class="flex-1 sm:flex-none">
        Colaboradores
        <Badge v-if="collaboratorsPending > 0" variant="destructive" class="ml-2">
          {{ collaboratorsPending }}
        </Badge>
        <Badge v-else-if="collaboratorsCompleted" variant="secondary" class="ml-2">
          Listo
        </Badge>
      </TabsTrigger>
      <TabsTrigger v-if="showArchivalTab" value="archival" class="flex-1 sm:flex-none">
        Expediente
      </TabsTrigger>
      <TabsTrigger v-if="showMoreActionsTab" value="more" class="flex-1 sm:flex-none">
        Más acciones
      </TabsTrigger>
      <TabsTrigger value="history" class="flex-1 sm:flex-none">
        Historial
      </TabsTrigger>
    </TabsList>

    <TabsContent value="actions" class="mt-6 space-y-5">
      <div v-if="task" class="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
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

      <div v-if="actionWarnings.length" class="space-y-2">
        <Alert
          v-for="warning in actionWarnings"
          :key="warning.code"
          variant="secondary"
        >
          <Icon name="i-lucide-triangle-alert" class="size-4" />
          <AlertDescription>{{ warning.message }}</AlertDescription>
        </Alert>
      </div>

      <Alert v-if="showFilingAssignment" class="border-primary/40 bg-primary/5">
        <Icon name="i-lucide-user-check" class="size-4" />
        <AlertTitle>Etapa de asignación</AlertTitle>
        <AlertDescription>
          Asignar al responsable es la acción de esta etapa: cierra «{{ context?.open_task?.stage?.name ?? 'Asignación' }}» y avanza el flujo.
        </AlertDescription>
      </Alert>

      <Alert v-if="advanceGuidance && !canCloseFilingFromWorkflow" class="border-primary/40 bg-primary/5">
        <Icon name="i-lucide-info" class="size-4" />
        <AlertTitle>Cerrar el radicado</AlertTitle>
        <AlertDescription class="space-y-3">
          <p>{{ advanceGuidance }}</p>
          <Button
            v-if="hasPermission('ventanilla_ver') && context?.filing?.id"
            size="sm"
            type="button"
            @click="goToFilingGestion"
          >
            Ir a Gestión del radicado
          </Button>
        </AlertDescription>
      </Alert>

      <Alert v-else-if="showInactiveTaskAlert" variant="secondary">
        <Icon name="i-lucide-circle-check" class="size-4" />
        <AlertTitle>Esta etapa ya se completó</AlertTitle>
        <AlertDescription class="space-y-3">
          <p v-if="context?.open_task?.stage?.name">
            La etapa activa ahora es «{{ context.open_task.stage.name }}».
          </p>
          <p v-else>
            Esta tarea ya no está abierta. El proceso puede haber avanzado o cerrado.
          </p>
          <Button
            v-if="context?.open_task?.id"
            size="sm"
            type="button"
            @click="goToCurrentOpenTask"
          >
            Ir a la etapa activa
          </Button>
        </AlertDescription>
      </Alert>

      <Alert v-else-if="needsFilingMetadata" class="border-primary/40 bg-primary/5">
        <Icon name="i-lucide-tags" class="size-4" />
        <AlertTitle>Metadatos pendientes</AlertTitle>
        <AlertDescription class="space-y-3">
          <p>
            Complete los metadatos obligatorios en la pestaña Metadatos para poder avanzar esta etapa.
          </p>
          <Button size="sm" type="button" variant="outline" @click="activeTab = 'metadata'">
            Ir a metadatos
          </Button>
        </AlertDescription>
      </Alert>

      <Alert v-if="myPendingCollaborationId" class="border-primary/40 bg-primary/5">
        <Icon name="i-lucide-paperclip" class="size-4" />
        <AlertTitle>Usted es colaborador de esta etapa</AlertTitle>
        <AlertDescription class="space-y-3">
          <p>
            No gestione ni avance el radicado aquí. Debe ir a <strong>Colaboración</strong> para registrar su aporte.
          </p>
          <Button size="sm" type="button" @click="navigateTo(`/workflow/colaboracion/${myPendingCollaborationId}`)">
            Adjuntar mi aporte
          </Button>
        </AlertDescription>
      </Alert>

      <Alert v-else-if="collaboratorsPending > 0" variant="destructive">
        <Icon name="i-lucide-users" class="size-4" />
        <AlertTitle>Colaboradores pendientes</AlertTitle>
        <AlertDescription>
          Hay {{ collaboratorsPending }} colaborador(es) sin respuesta. Revise la pestaña Colaboradores antes de avanzar.
        </AlertDescription>
      </Alert>

      <Alert v-else-if="collaboratorsCompleted" class="border-primary/40 bg-primary/5">
        <Icon name="i-lucide-circle-check" class="size-4" />
        <AlertTitle>Colaboración completada</AlertTitle>
        <AlertDescription class="space-y-3">
          <p>
            Lo solicitado a los colaboradores ya fue respondido. Revise los documentos en la pestaña Colaboradores
            {{ canCloseFilingFromWorkflow || advanceGuidance ? ' y luego cierre el radicado.' : ' y avance la etapa.' }}
          </p>
          <Button size="sm" type="button" variant="outline" @click="activeTab = 'collaborators'">
            Ver aportes
          </Button>
        </AlertDescription>
      </Alert>

      <section
        v-if="showPrimaryStageAction"
        class="space-y-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5"
      >
        <div class="space-y-1">
          <p class="text-base font-semibold tracking-tight">
            Acción de esta etapa
          </p>
          <p class="text-sm text-muted-foreground">
            <template v-if="showFilingAssignment">
              Asigne el responsable para completar la etapa.
            </template>
            <template v-else-if="canCloseFilingFromWorkflow">
              Cierre el radicado aquí. Si necesita documentos, adjúntelos debajo: se envían al confirmar.
            </template>
            <template v-else>
              Esta es la acción principal. Devolver, reasignar o comentar están en Más acciones.
            </template>
          </p>
        </div>

        <WorkflowTaskFilingAssignPanel
          v-if="showFilingAssignment && context?.filing"
          :filing-id="context.filing.id"
          :org-unit-id="context.filing.org_unit_responsible?.id"
          :org-unit-name="context.filing.org_unit_responsible?.name"
          :initial-assigned-user-id="context.filing.assigned_user?.id"
          :stage-name="context.open_task?.stage?.name"
          @assigned="refreshContext"
        />

        <WorkflowTaskFilingClosePanel
          v-if="canCloseFilingFromWorkflow && context?.filing"
          :filing-id="context.filing.id"
          :requires-response="filingRequiresResponse"
          :stage-name="context.open_task?.stage?.name"
          :initial-copy-emails="context.filing.response_copy_emails ?? []"
          :pending-documents="hasPendingFilingFiles"
          :before-submit="attachPendingFilesIfNeeded"
          @closed="onFilingClosed"
        />

        <template v-if="showAdvanceButton">
          <div class="grid gap-2.5">
            <Label>Nota al avanzar (opcional)</Label>
            <Textarea v-model="note" rows="2" placeholder="Motivo o comentario de la acción" />
          </div>
          <Button
            class="h-12 w-full text-base"
            size="lg"
            :disabled="saving || collaboratorsPending > 0"
            @click="advance"
          >
            {{ saving ? 'Procesando…' : 'Avanzar etapa' }}
          </Button>
        </template>
      </section>

      <WorkflowTaskFilingAttachmentsPanel
        v-if="canAttachFilingFiles && context?.filing?.id"
        ref="attachmentsPanelRef"
        :filing-id="context.filing.id"
        :disabled="saving"
        :hint="canCloseFilingFromWorkflow
          ? 'Se envían al registrar la respuesta o el cierre. Quedan en el radicado, en el historial y en la respuesta.'
          : 'Se adjuntarán al radicado al avanzar la etapa.'"
        @attached="refreshContext"
        @pending-change="hasPendingFilingFiles = $event"
      />

      <p v-if="showMoreActionsTab" class="text-xs text-muted-foreground">
        Para devolver a una etapa anterior, reasignar o dejar un comentario en el historial, use
        <button type="button" class="font-medium text-foreground underline-offset-2 hover:underline" @click="activeTab = 'more'">
          Más acciones
        </button>.
      </p>
    </TabsContent>

    <TabsContent v-if="showMoreActionsTab" value="more" class="mt-6 space-y-5">
      <p class="text-sm text-muted-foreground">
        Operaciones poco frecuentes. No sustituyen la acción de la etapa (avanzar, asignar o cerrar).
      </p>

      <div class="grid gap-2.5">
        <Label>Nota (opcional)</Label>
        <Textarea v-model="note" rows="2" placeholder="Motivo al devolver o reasignar" />
      </div>

      <div v-if="showReturnAction" class="space-y-2.5 rounded-lg border bg-muted/20 p-4">
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

      <div v-if="showReassignAction" class="space-y-2.5 rounded-lg border bg-muted/20 p-4">
        <Label>Reasignar a</Label>
        <ArchivalSingleMultiselect
          v-model="reassignUserId"
          coerce-number
          :options="reassignUserOptions"
          :disabled="saving"
          placeholder="Buscar usuario"
          no-options-text="Sin usuarios"
          no-results-text="Sin coincidencias"
        />
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
    </TabsContent>

    <TabsContent v-if="showFilingTab && context?.filing" value="filing" class="mt-6">
      <WorkflowTaskFilingSummaryPanel :filing="context.filing" />
    </TabsContent>

    <TabsContent v-if="showFilingMetadataCapture && context?.filing" value="metadata" class="mt-6">
      <div class="space-y-5 rounded-lg border bg-card p-4 sm:p-5">
        <div class="space-y-1">
          <p class="text-sm font-medium">
            Metadatos del radicado
          </p>
          <p class="text-sm text-muted-foreground">
            <template v-if="needsFilingMetadata">
              Completar estos datos es obligatorio para avanzar la etapa.
            </template>
            <template v-else-if="stageMetadata?.source === 'stage' && filingMetadataSchema">
              Metadatos propios de esta etapa: {{ filingMetadataSchema.name }}.
            </template>
            <template v-else-if="filingMetadataFieldCount > 0">
              Datos archivísticos del tipo documental del radicado.
            </template>
            <template v-else>
              Este radicado no tiene esquema de metadatos archivísticos para el tipo funcional ni el tipo documental.
              Los campos de un documento se capturan en la pestaña Expediente al adjuntarlo.
            </template>
          </p>
        </div>
        <VentanillaArchivalMetadataFields
          v-if="filingMetadataFieldCount > 0"
          ref="metadataFieldsRef"
          v-model="metadataValues"
          :schema="filingMetadataSchema"
          :doc-document-type-id="context.filing.doc_document_type?.id"
          :functional-type-key="context.filing.functional_type_key"
          :submit-attempted="metadataSubmitAttempted"
        />
        <div v-if="filingMetadataFieldCount > 0" class="flex justify-end">
          <Button
            type="button"
            class="h-10"
            :disabled="savingMetadata"
            @click="saveFilingMetadata"
          >
            {{ savingMetadata ? 'Guardando…' : 'Guardar metadatos' }}
          </Button>
        </div>
      </div>
    </TabsContent>

    <TabsContent
      v-if="showCollaboratorsTab && context?.open_task"
      value="collaborators"
      class="mt-6"
    >
      <WorkflowTaskCollaboratorsPanel
        :task-id="context.open_task.id"
        :read-only="!canInviteCollaborators"
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
      <WorkflowTaskHistoryTimeline
        :events="context?.events ?? []"
        :filing-id="context?.filing?.id ?? null"
      />
    </TabsContent>
  </Tabs>
</template>
