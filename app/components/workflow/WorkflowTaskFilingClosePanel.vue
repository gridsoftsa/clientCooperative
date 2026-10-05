<script setup lang="ts">
import { toast } from 'vue-sonner'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

const props = defineProps<{
  filingId: number
  requiresResponse: boolean
  stageName?: string | null
  initialCopyEmails?: string[]
  beforeSubmit?: () => Promise<boolean>
}>()

const emit = defineEmits<{
  closed: []
}>()

const ventanillaApi = useVentanillaApi()

const responseText = ref('')
const responseCopyEmails = ref<string[]>([])
const skipCopyPersist = ref(true)
const copyEmailsSaving = ref(false)
const closeReason = ref('')
const saving = ref(false)

watch(() => props.initialCopyEmails, (emails) => {
  skipCopyPersist.value = true
  responseCopyEmails.value = [...(emails ?? [])]
  nextTick(() => {
    skipCopyPersist.value = false
  })
}, { immediate: true, once: true })

watch(responseCopyEmails, async (emails) => {
  if (skipCopyPersist.value || !props.requiresResponse) {
    return
  }

  copyEmailsSaving.value = true
  try {
    await ventanillaApi.updateFilingResponseCopyEmails(props.filingId, emails)
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    copyEmailsSaving.value = false
  }
})

async function submit(): Promise<void> {
  if (props.requiresResponse && !responseText.value.trim()) {
    toast.error('Ingrese la respuesta dada al remitente.')

    return
  }

  saving.value = true

  try {
    if (props.beforeSubmit) {
      const ready = await props.beforeSubmit()

      if (!ready) {
        return
      }
    }

    if (props.requiresResponse) {
      const res = await ventanillaApi.respondFiling(props.filingId, responseText.value.trim(), responseCopyEmails.value)
      toast.success(res.message, { duration: 16000 })
      responseText.value = ''
    }
    else {
      await ventanillaApi.closeFiling(props.filingId, closeReason.value.trim() || undefined)
      toast.success('Radicado cerrado. El flujo quedó completado.')
      closeReason.value = ''
    }

    emit('closed')
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
  <div id="workflow-filing-close" class="space-y-4 border-t pt-4">
    <div>
      <p class="text-sm font-medium">
        Cerrar radicado — {{ stageName ?? 'Responder / cerrar' }}
      </p>
      <p class="text-muted-foreground mt-1 text-xs">
        Esta etapa no usa «Avanzar etapa».
        <template v-if="requiresResponse">
          Registre la respuesta al remitente; al confirmar se cierra el radicado y el flujo.
        </template>
        <template v-else>
          Confirme el cierre del radicado; el flujo se completa automáticamente.
        </template>
      </p>
    </div>

    <div v-if="requiresResponse" class="space-y-3">
      <div class="space-y-2">
        <Label>Respuesta *</Label>
        <Textarea
          v-model="responseText"
          rows="4"
          placeholder="Registre la respuesta dada al remitente…"
          :disabled="saving"
        />
      </div>
      <VentanillaResponseCopyEmails
        v-model="responseCopyEmails"
        :disabled="saving"
        :saving="copyEmailsSaving"
      />
    </div>
    <div v-else class="space-y-2">
      <Label>Motivo de cierre</Label>
      <Textarea
        v-model="closeReason"
        rows="3"
        placeholder="Opcional"
        :disabled="saving"
      />
    </div>

    <Button
      class="h-11 w-full"
      size="lg"
      :disabled="saving || (requiresResponse && !responseText.trim())"
      @click="submit"
    >
      {{ saving
        ? 'Cerrando…'
        : (requiresResponse ? 'Registrar respuesta y cerrar' : 'Cerrar radicado') }}
    </Button>
  </div>
</template>
