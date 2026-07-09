<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    currentSucursalLabel?: string | null
    sucursales: Array<{ id: number; name: string; code?: string | null }>
    currentSucursalId?: number | null
    loading?: boolean
    minLength?: number
  }>(),
  {
    title: 'Trasladar a otra sucursal',
    description: 'La solicitud quedará asociada a la sucursal de destino. Indique el motivo del traslado.',
    currentSucursalLabel: null,
    loading: false,
    minLength: 10,
  },
)

const emit = defineEmits<{
  confirm: [{ sucursalId: number; reason: string }]
}>()

const selectedSucursalId = ref<string>('')
const reason = ref('')
const reasonInputId = useId()
const sucursalSelectId = useId()

const availableSucursales = computed(() => {
  const currentId = props.currentSucursalId
  return props.sucursales.filter(s => currentId == null || s.id !== currentId)
})

const canSubmit = computed(() => {
  const id = Number(selectedSucursalId.value)
  return Number.isFinite(id)
    && id > 0
    && reason.value.trim().length >= (props.minLength ?? 10)
})

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedSucursalId.value = ''
    reason.value = ''
    return
  }
  const first = availableSucursales.value[0]
  selectedSucursalId.value = first ? String(first.id) : ''
})

function onCancel() {
  open.value = false
}

function onConfirm() {
  if (!canSubmit.value) {
    return
  }
  emit('confirm', {
    sucursalId: Number(selectedSucursalId.value),
    reason: reason.value.trim(),
  })
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

      <div class="space-y-4 py-1">
        <p
          v-if="currentSucursalLabel"
          class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        >
          Sucursal actual:
          <span class="font-medium text-foreground">{{ currentSucursalLabel }}</span>
        </p>

        <div class="space-y-2">
          <Label :for="sucursalSelectId">Sucursal de destino</Label>
          <Select
            :model-value="selectedSucursalId || null"
            :disabled="loading || availableSucursales.length === 0"
            @update:model-value="selectedSucursalId = $event != null ? String($event) : ''"
          >
            <SelectTrigger :id="sucursalSelectId">
              <SelectValue placeholder="Seleccione sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="s in availableSucursales"
                :key="s.id"
                :value="String(s.id)"
              >
                {{ s.name }}<span v-if="s.code" class="text-muted-foreground"> ({{ s.code }})</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p
            v-if="availableSucursales.length === 0"
            class="text-xs text-destructive"
          >
            No hay otras sucursales activas disponibles para el traslado.
          </p>
        </div>

        <div class="space-y-2">
          <Label :for="reasonInputId">Motivo del traslado</Label>
          <Textarea
            :id="reasonInputId"
            v-model="reason"
            placeholder="Indique el motivo con el detalle suficiente para auditoría…"
            :disabled="loading"
            rows="3"
            class="min-h-20 resize-y"
          />
          <p class="text-xs text-muted-foreground">
            Mínimo {{ minLength }} caracteres.
          </p>
        </div>
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
          Trasladar
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="loading"
          class="min-w-28"
          @click="onCancel"
        >
          Cancelar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
