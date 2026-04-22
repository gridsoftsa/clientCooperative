<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    reasonLabel?: string
    reasonPlaceholder?: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
    minLength?: number
  }>(),
  {
    reasonLabel: 'Motivo',
    reasonPlaceholder: 'Describe el motivo de la acción…',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    loading: false,
    minLength: 3,
  },
)

const emit = defineEmits<{
  (e: 'confirm', reason: string): void
}>()

const reason = ref('')
const reasonInputId = useId()

const canSubmit = computed(() => {
  return reason.value.trim().length >= (props.minLength ?? 3)
})

watch(open, (v) => {
  if (v)
    reason.value = ''
})

function onCancel() {
  open.value = false
}

function onConfirm() {
  if (!canSubmit.value)
    return
  emit('confirm', reason.value.trim())
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-2 py-1">
        <Label :for="reasonInputId">{{ reasonLabel }}</Label>
        <Textarea
          :id="reasonInputId"
          v-model="reason"
          :placeholder="reasonPlaceholder"
          :disabled="loading"
          rows="3"
          class="min-h-20 resize-y"
        />
        <p class="text-xs text-muted-foreground">
          Mínimo {{ minLength }} caracteres.
        </p>
      </div>
      <div class="flex w-full flex-row flex-wrap items-center justify-center gap-2 pt-2 sm:gap-3">
        <Button
          type="button"
          :disabled="!canSubmit || loading"
          class="min-w-28 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          @click="onConfirm"
        >
          <Icon
            v-if="loading"
            name="i-lucide-loader-2"
            class="h-4 w-4 shrink-0 animate-spin"
          />
          {{ confirmText }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="loading"
          class="min-w-28"
          @click="onCancel"
        >
          {{ cancelText }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
