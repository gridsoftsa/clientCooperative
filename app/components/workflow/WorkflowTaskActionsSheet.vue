<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'

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

const canManage = computed(() => hasPermission('workflow_gestionar'))
const canReassign = computed(() => hasPermission('workflow_reasignar'))

const stageRules = computed(() => props.context?.open_task?.stage ?? null)
const returnableStages = computed(() => props.context?.returnable_stages ?? [])

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
  catch {
    toast.error('No se pudo completar la acción.')
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
    <SheetContent class="flex w-full flex-col overflow-hidden sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Gestión de tarea</SheetTitle>
        <SheetDescription v-if="task?.subject">
          {{ task.subject.filing_number }} — {{ task.stage?.name }}
        </SheetDescription>
      </SheetHeader>

      <Tabs v-model="activeTab" default-value="actions" class="mt-4 flex min-h-0 flex-1 flex-col">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="actions">
            Acciones
          </TabsTrigger>
          <TabsTrigger value="history">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" class="mt-4 space-y-4 overflow-y-auto">
          <div v-if="task" class="rounded-lg border p-3 text-sm space-y-1">
            <p><span class="text-muted-foreground">Responsable:</span> {{ task.assignee?.name ?? 'Sin asignar' }}</p>
            <p v-if="task.due_at">
              <span class="text-muted-foreground">Vence:</span>
              {{ new Date(task.due_at).toLocaleString('es-CO') }}
            </p>
            <p v-if="task.days_overdue" class="text-destructive">
              {{ task.days_overdue }} días de retraso
            </p>
          </div>

          <div class="grid gap-2">
            <Label>Nota (opcional)</Label>
            <Textarea v-model="note" rows="2" placeholder="Motivo o comentario de la acción" />
          </div>

          <Button
            v-if="canManage && stageRules?.allows_advance"
            class="w-full"
            :disabled="saving"
            @click="advance"
          >
            Avanzar etapa
          </Button>

          <div v-if="canManage && stageRules?.allows_return && returnableStages.length" class="space-y-2">
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
            <Button variant="outline" class="w-full" :disabled="saving || !returnStageId" @click="returnTask">
              Devolver
            </Button>
          </div>

          <div v-if="canReassign && stageRules?.allows_reassign" class="space-y-2">
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
            <Button variant="outline" class="w-full" :disabled="saving || !reassignUserId" @click="reassign">
              Reasignar
            </Button>
          </div>

          <div v-if="canManage" class="space-y-2 border-t pt-4">
            <Label>Comentario</Label>
            <Textarea v-model="comment" rows="2" placeholder="Agregar comentario al historial" />
            <Button variant="secondary" class="w-full" :disabled="saving || !comment.trim()" @click="submitComment">
              Registrar comentario
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" class="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div v-if="context?.events?.length" class="space-y-3">
            <div
              v-for="event in context.events"
              :key="event.id"
              class="rounded-lg border px-3 py-2 text-sm"
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
