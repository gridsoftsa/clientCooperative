<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileAlertType, ArchivalPhaseTarget } from '~/types/archival-file'
import { ARCHIVAL_PHASE_TARGET_LABELS } from '~/types/archival-file'
import { messageFromFetchError } from '~/utils/http-error-message'

const props = defineProps<{
  open: boolean
  fileId: number
  eligibleNextPhase?: ArchivalPhaseTarget | null
  canTransferToNextPhase?: boolean
  transferBlockedReason?: string | null
  suggestedPhase?: ArchivalPhaseTarget | null
  alertType?: ArchivalFileAlertType | string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  transferred: []
}>()

const archivalApi = useArchivalFileApi()

const saving = ref(false)
const targetPhase = ref<ArchivalPhaseTarget>('central')
const reason = ref('')

const phaseOptions = computed(() => {
  const phase = props.eligibleNextPhase
  if (!phase) {
    return []
  }

  return [{
    value: phase,
    label: ARCHIVAL_PHASE_TARGET_LABELS[phase],
  }]
})

const isSubmitDisabled = computed(() =>
  saving.value
  || !props.eligibleNextPhase
  || props.canTransferToNextPhase === false,
)

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }

  targetPhase.value = props.eligibleNextPhase
    ?? props.suggestedPhase
    ?? inferPhaseFromAlert(props.alertType)
    ?? 'central'
  reason.value = defaultReason(props.alertType)
})

function inferPhaseFromAlert(alertType?: ArchivalFileAlertType | string | null): ArchivalPhaseTarget | null {
  switch (alertType) {
    case 'retention_management_overdue':
    case 'retention_management_upcoming':
      return 'central'
    case 'retention_central_overdue':
    case 'retention_central_upcoming':
      return 'historical'
    case 'retention_historical_overdue':
    case 'retention_historical_upcoming':
      return 'disposed'
    default:
      return null
  }
}

function defaultReason(alertType?: ArchivalFileAlertType | string | null): string {
  switch (alertType) {
    case 'retention_management_overdue':
      return 'Transferencia por vencimiento de retención en archivo de gestión.'
    case 'retention_central_overdue':
      return 'Transferencia por vencimiento de retención en archivo central.'
    case 'retention_historical_overdue':
      return 'Disposición final por vencimiento de retención histórica.'
    default:
      return ''
  }
}

async function handleSubmit() {
  saving.value = true

  try {
    const res = await archivalApi.transferFile(props.fileId, {
      target_phase: targetPhase.value,
      reason: reason.value.trim() || null,
    })
    toast.success(res.message)
    emit('update:open', false)
    emit('transferred')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo transferir el expediente.'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Transferir expediente</DialogTitle>
        <DialogDescription>
          Mueva el expediente cerrado a la siguiente fase archivística permitida según la TRD.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div
          v-if="transferBlockedReason"
          class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
        >
          {{ transferBlockedReason }}
        </div>

        <div
          v-else-if="!eligibleNextPhase"
          class="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        >
          Este expediente no admite más transferencias archivísticas.
        </div>

        <div v-else class="space-y-2">
          <Label for="transfer-phase">Fase destino</Label>
          <Select v-model="targetPhase">
            <SelectTrigger id="transfer-phase">
              <SelectValue placeholder="Seleccione fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in phaseOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Solo se muestra la fase siguiente válida para este expediente.
          </p>
        </div>

        <div class="space-y-2">
          <Label for="transfer-reason">Motivo (opcional)</Label>
          <Textarea
            id="transfer-reason"
            v-model="reason"
            rows="3"
            placeholder="Motivo de la transferencia"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button type="button" :disabled="isSubmitDisabled" @click="handleSubmit">
          {{ saving ? 'Transfiriendo…' : 'Transferir' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
