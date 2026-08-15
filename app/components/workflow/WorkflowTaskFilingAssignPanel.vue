<script setup lang="ts">
import { toast } from 'vue-sonner'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

const props = defineProps<{
  filingId: number
  orgUnitId?: number | null
  orgUnitName?: string | null
  initialAssignedUserId?: number | null
  stageName?: string | null
}>()

const emit = defineEmits<{
  assigned: []
}>()

const ventanillaApi = useVentanillaApi()
const {
  responsibleUsers,
  loadingResponsibleUsers,
  loadResponsibleUsers,
} = useVentanillaResponsibleUsers()

const selectedUserId = ref<number | null>(null)
const assignmentNote = ref('')
const saving = ref(false)

watch(
  () => [props.filingId, props.orgUnitId, props.initialAssignedUserId] as const,
  async ([, orgUnitId, initialAssignedUserId]) => {
    selectedUserId.value = initialAssignedUserId ?? null
    await loadResponsibleUsers(orgUnitId ?? null, initialAssignedUserId ?? null)
  },
  { immediate: true },
)

async function assignResponsible(): Promise<void> {
  if (!selectedUserId.value) {
    toast.error('Seleccione el responsable del radicado.')

    return
  }

  saving.value = true

  try {
    await ventanillaApi.assignFiling(props.filingId, {
      assigned_user_id: selectedUserId.value,
      note: assignmentNote.value.trim() || undefined,
    })
    toast.success('Responsable asignado. La etapa se completó y el flujo avanzó.')
    assignmentNote.value = ''
    emit('assigned')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4 border-t pt-4">
    <div>
      <p class="text-sm font-medium">
        Asignar responsable — {{ stageName ?? 'Asignación' }}
      </p>
      <p class="text-muted-foreground mt-1 text-xs">
        En esta etapa, <strong>asignar es la acción que cierra la etapa</strong> y avanza el flujo.
        No use «Avanzar etapa»; al confirmar la asignación el proceso continúa automáticamente.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label>Responsable del radicado *</Label>
        <Select
          :model-value="selectedUserId != null ? String(selectedUserId) : undefined"
          :disabled="loadingResponsibleUsers || !responsibleUsers.length || saving"
          @update:model-value="selectedUserId = $event ? Number($event) : null"
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="user in responsibleUsers"
              :key="user.id"
              :value="String(user.id)"
            >
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Nota de asignación</Label>
        <Input v-model="assignmentNote" placeholder="Opcional" :disabled="saving" />
      </div>
    </div>

    <p
      v-if="!loadingResponsibleUsers && !responsibleUsers.length"
      class="text-muted-foreground text-xs"
    >
      No hay usuarios vinculados al área {{ orgUnitName ?? 'responsable' }}.
    </p>
    <p v-else class="text-muted-foreground text-xs">
      Usuarios del área {{ orgUnitName ?? 'responsable' }} del radicado.
    </p>

    <Button
      class="h-11 w-full"
      size="lg"
      :disabled="saving || !selectedUserId"
      @click="assignResponsible"
    >
      {{ saving ? 'Asignando…' : 'Asignar y avanzar etapa' }}
    </Button>
  </div>
</template>
