<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileStatusActionOption } from '~/utils/archival-file-status'

const props = defineProps<{
  open: boolean
  fileId: number
  action: ArchivalFileStatusActionOption | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: []
}>()

const archivalApi = useArchivalFileApi()
const saving = ref(false)
const reason = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reason.value = ''
  }
})

async function handleSubmit() {
  if (!props.action) {
    return
  }

  if (props.action.requiresReason && !reason.value.trim()) {
    toast.error('Indique el motivo de esta acción.')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.updateFileStatus(props.fileId, {
      target_status: props.action.target,
      reason: reason.value.trim() || undefined,
    })
    toast.success(res.message)
    emit('update:open', false)
    emit('updated')
  }
  catch (error: unknown) {
    const apiError = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = apiError.data?.errors
      ? Object.values(apiError.data.errors)[0]?.[0]
      : null
    toast.error(first ?? apiError.data?.message ?? 'No se pudo actualizar el estado del expediente.')
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
        <DialogTitle>{{ action?.label }}</DialogTitle>
        <DialogDescription>
          {{ action?.description }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="action?.requiresReason" class="space-y-2">
        <Label for="status-transition-reason">Motivo *</Label>
        <Textarea
          id="status-transition-reason"
          v-model="reason"
          rows="3"
          placeholder="Describa el motivo..."
        />
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button
          type="button"
          :variant="action?.variant === 'destructive' ? 'destructive' : 'default'"
          :disabled="saving"
          @click="handleSubmit"
        >
          {{ saving ? 'Guardando…' : action?.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
