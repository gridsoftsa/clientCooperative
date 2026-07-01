<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'
import { extractApiErrorMessage, isOpenWorkflowTaskStatus } from '~/utils/workflow-task-ui'

const props = defineProps<{
  open: boolean
  task: WorkflowTaskCard | null
  context?: WorkflowFilingContext | null
  users: Array<{ id: number, name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  changed: []
}>()

const { hasPermission } = usePermissions()
const workflowApi = useWorkflowApi()

const activeTab = ref('actions')
const note = ref('')
const comment = ref('')
const returnStageId = ref<string>('')
const reassignUserId = ref<string>('')
const saving = ref(false)

const canUploadArchival = computed(() =>
  hasPermission('expedientes_documentos_adjuntar') || hasPermission('expedientes_editar'),
)
const showArchivalTab = computed(() =>
  Boolean(props.context?.archival_file?.can_upload && canUploadArchival.value && props.context?.open_task),
)
const canManage = computed(() => hasPermission('workflow_gestionar'))
const canReassign = computed(() => hasPermission('workflow_reasignar'))

const stageRules = computed(() => props.context?.open_task?.stage ?? null)
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

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    note.value = ''
    comment.value = ''
    returnStageId.value = ''
    reassignUserId.value = ''
    activeTab.value = 'actions'
  }
})

async function runAction(action: () => Promise<unknown>, success: string) {
  saving.value = true
  try {
    await action()
    toast.success(success)
    emit('update:open', false)
    emit('changed')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

function advance() {
  if (!props.task)
    return
  runAction(() => workflowApi.advanceTask(props.task!.id, note.value || undefined), 'Tarea avanzada.')
}

function returnTask() {
  if (!props.task || !returnStageId.value)
    return
  runAction(
    () => workflowApi.returnTask(props.task!.id, Number(returnStageId.value), note.value || undefined),
    'Tarea devuelta.',
  )
}

function reassign() {
  if (!props.task || !reassignUserId.value)
    return
  runAction(
    () => workflowApi.reassignTask(props.task!.id, Number(reassignUserId.value), note.value || undefined),
    'Tarea reasignada.',
  )
}

function submitComment() {
  if (!props.task || !comment.value.trim())
    return
  runAction(() => workflowApi.commentTask(props.task!.id, comment.value.trim()), 'Comentario registrado.')
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    instance_started: 'Inicio',
    task_created: 'Tarea creada',
    advanced: 'Avance',
    returned: 'Devolución',
    reassigned: 'Reasignación',
    comment: 'Comentario',
    completed: 'Cierre',
    cancelled: 'Cancelación',
  }

  return labels[type] ?? type
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="flex w-full flex-col gap-0 overflow-hidden px-8 py-8 sm:max-w-lg">
      <SheetHeader class="shrink-0 space-y-1.5 p-0 pr-10">
        <SheetTitle>Gestión de tarea</SheetTitle>
        <SheetDescription v-if="task?.subject">
          {{ task.subject.filing_number }} — {{ task.stage?.name }}
        </SheetDescription>
      </SheetHeader>

      <Tabs v-model="activeTab" default-value="actions" class="mt-6 flex min-h-0 flex-1 flex-col">
        <TabsList class="grid h-10 w-full shrink-0 p-1" :class="showArchivalTab ? 'grid-cols-3' : 'grid-cols-2'">
          <TabsTrigger value="actions">
            Acciones
          </TabsTrigger>
          <TabsTrigger v-if="showArchivalTab" value="archival">
            Expediente
          </TabsTrigger>
          <TabsTrigger value="history">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" class="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
          <div v-if="task" class="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
            <p><span class="text-muted-foreground">Responsable:</span> {{ task.assignee?.name ?? 'Sin asignar' }}</p>
            <p v-if="task.due_at">
              <span class="text-muted-foreground">Vence:</span>
              {{ new Date(task.due_at).toLocaleString('es-CO') }}
            </p>
            <p v-if="task.days_overdue" class="text-destructive">
              {{ task.days_overdue }} días de retraso
            </p>
          </div>

          <div class="grid gap-2.5">
            <Label>Nota (opcional)</Label>
            <Textarea v-model="note" rows="2" placeholder="Motivo o comentario de la acción" />
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

          <Button
            v-if="showAdvanceButton"
            class="h-10 w-full"
            :disabled="saving"
            @click="advance"
          >
            Avanzar etapa
          </Button>

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

          <div v-if="canManage" class="space-y-2.5 border-t pt-5">
            <Label>Comentario</Label>
            <Textarea v-model="comment" rows="2" placeholder="Agregar comentario al historial" />
            <Button variant="secondary" class="h-10 w-full" :disabled="saving || !comment.trim()" @click="submitComment">
              Registrar comentario
            </Button>
          </div>
        </TabsContent>

        <TabsContent v-if="showArchivalTab && context?.archival_file" value="archival" class="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
          <ArchivalFileWorkflowUploadPanel
            :archival-context="context.archival_file"
            @uploaded="emit('changed')"
          />
        </TabsContent>

        <TabsContent value="history" class="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
          <div v-if="context?.events?.length" class="space-y-3">
            <div
              v-for="event in context.events"
              :key="event.id"
              class="rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            >
              <div class="flex items-center justify-between gap-2">
                <Badge variant="outline">
                  {{ eventLabel(event.event_type) }}
                </Badge>
                <span class="text-xs text-muted-foreground">
                  {{ event.created_at ? new Date(event.created_at).toLocaleString('es-CO') : '' }}
                </span>
              </div>
              <p v-if="event.description" class="mt-1">
                {{ event.description }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ event.created_by?.name ?? 'Sistema' }}
                <span v-if="event.stage"> · {{ event.stage.name }}</span>
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Sin eventos registrados.
          </p>
        </TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>
</template>
