<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ANALISIS_SCORE_PERFIL_OPTIONS,
  type AnalisisScorePerfilValue,
} from '~/constants/analisis-score'

withDefaults(
  defineProps<{
    /** Texto opcional bajo el selector (p. ej. en paso 2 para corregir perfil). */
    hint?: string
  }>(),
  { hint: '' },
)

const perfil = defineModel<AnalisisScorePerfilValue | undefined>({ required: true })

const open = ref(false)

const triggerLabel = computed(() => {
  if (perfil.value == null) {
    return 'Selecciona un perfil…'
  }
  return ANALISIS_SCORE_PERFIL_OPTIONS.find(o => o.value === perfil.value)?.label ?? perfil.value
})

function cerrarAlElegir(): void {
  open.value = false
}
</script>

<template>
  <div class="space-y-2">
    <Label class="text-sm font-medium">Perfil del deudor</Label>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="h-auto min-h-10 w-full max-w-md justify-between py-2 text-left font-normal"
        >
          <span class="line-clamp-2">{{ triggerLabel }}</span>
          <Icon name="i-lucide-chevrons-up-down" class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-80 p-3 sm:w-96" align="start">
        <p class="mb-3 text-xs font-medium text-muted-foreground">
          Selecciona una opción
        </p>
        <RadioGroup
          v-model="perfil"
          class="grid gap-2"
          @update:model-value="cerrarAlElegir"
        >
          <div
            v-for="opt in ANALISIS_SCORE_PERFIL_OPTIONS"
            :key="opt.value"
            class="flex items-center gap-2"
          >
            <RadioGroupItem :id="`perfil-${opt.value}`" :value="opt.value" />
            <Label
              :for="`perfil-${opt.value}`"
              class="cursor-pointer text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {{ opt.label }}
            </Label>
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
    <p v-if="hint" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
  </div>
</template>
