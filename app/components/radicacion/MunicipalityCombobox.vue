<script setup lang="ts">
/**
 * Selector de municipio con búsqueda. Renderiza solo hasta 80 ítems para buen rendimiento.
 * - emitId: true  → v-model es number (id), para ciudad residencia.
 * - emitId: false → v-model es string (label), para lugar de expedición.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: number | string
    placeholder?: string
    /** Si true, modelValue es number (id). Si false, es string (label). */
    emitId?: boolean
    class?: string
  }>(),
  { placeholder: 'Buscar municipio...', emitId: true },
)

const emit = defineEmits<{ 'update:modelValue': [number | string] }>()

const { getById, getLabel, getFilteredOptions } = useMunicipalities()

const open = ref(false)
const search = ref('')

const displayValue = computed(() => {
  if (props.emitId && typeof props.modelValue === 'number' && props.modelValue > 0) {
    const m = getById(props.modelValue)
    return m ? getLabel(m) : ''
  }
  return typeof props.modelValue === 'string' && props.modelValue ? props.modelValue : ''
})

const filteredOptions = computed(() => getFilteredOptions(search.value, 80))

function select(opt: { id: number; label: string }) {
  if (props.emitId) {
    emit('update:modelValue', opt.id)
  } else {
    emit('update:modelValue', opt.label)
  }
  search.value = ''
  open.value = false
}

function onOpenChange(isOpen: boolean) {
  open.value = isOpen
  if (!isOpen) search.value = ''
}
</script>

<template>
  <Popover :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :class="['min-h-9 w-full justify-between font-normal', !displayValue && 'text-muted-foreground', props.class]"
      >
        <span class="min-w-0 flex-1 truncate text-left">{{ displayValue || placeholder }}</span>
        <Icon name="i-lucide-chevrons-up-down" class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="min-w-[16rem] p-0" align="start" :side-offset="4">
      <div class="flex items-center border-b px-2">
        <Icon name="i-lucide-search" class="h-4 w-4 shrink-0 opacity-50" />
        <Input
          v-model="search"
          placeholder="Escribe para filtrar..."
          class="h-9 border-0 shadow-none focus-visible:ring-0"
          @keydown.stop
        />
      </div>
      <div class="max-h-64 overflow-auto py-1">
        <button
          v-for="opt in filteredOptions"
          :key="opt.id"
          type="button"
          class="relative flex w-full cursor-default items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          @click="select(opt)"
        >
          {{ opt.label }}
        </button>
        <p v-if="filteredOptions.length === 0" class="py-6 text-center text-sm text-muted-foreground">
          No hay resultados. Escribe el nombre del municipio o departamento.
        </p>
      </div>
    </PopoverContent>
  </Popover>
</template>
