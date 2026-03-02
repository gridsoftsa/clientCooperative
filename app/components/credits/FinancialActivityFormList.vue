<script setup lang="ts">
/**
 * Lista de plantillas de actividad económica. Permite añadir varias.
 * Los datos se guardan en debtor.financial_info.activity_templates.
 */
import type { ActivityTemplateData } from '~/types/credit-application'
import { sectorsConfig } from '~/constants/credits-financial-templates'

function templateOptionsFor(sector: string) {
  return sectorsConfig.find((s) => s.value === sector)?.templates ?? []
}

const props = withDefaults(
  defineProps<{
    modelValue?: ActivityTemplateData[]
  }>(),
  {
    modelValue: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ActivityTemplateData[]]
}>()

const templates = ref<ActivityTemplateData[]>([...(props.modelValue ?? [])])

function addTemplate() {
  templates.value.push({
    sector: '',
    template: '',
    product: null,
    data: {},
  })
  emitUpdate()
}

function removeTemplate(index: number) {
  templates.value.splice(index, 1)
  emitUpdate()
}

function updateTemplate(index: number, val: ActivityTemplateData | null) {
  if (val) {
    templates.value[index] = val
  } else {
    // Mantener slot vacío; el usuario elimina con el botón de papelera
    templates.value[index] = { sector: '', template: '', product: null, data: {} }
  }
  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', [...templates.value])
}

watch(
  () => props.modelValue,
  (val) => {
    const arr = val ?? []
    if (JSON.stringify(arr) !== JSON.stringify(templates.value)) {
      templates.value = arr.length ? [...arr] : []
    }
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Añade una o más plantillas según las actividades económicas del deudor
      </p>
      <Button type="button" variant="outline" size="sm" @click="addTemplate">
        <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
        Agregar plantilla
      </Button>
    </div>

    <div v-if="templates.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      No hay plantillas. Haz clic en "Agregar plantilla" para comenzar.
    </div>

    <Accordion v-else type="multiple" collapsible class="space-y-2">
      <AccordionItem
        v-for="(item, idx) in templates"
        :key="idx"
        :value="`activity-${idx}`"
        class="relative rounded-lg border border-border px-4 pr-12 data-[state=open]:border-primary/30"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="absolute right-2 top-3 h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Eliminar plantilla"
          @click="removeTemplate(idx)"
        >
          <Icon name="i-lucide-trash" class="h-4 w-4" />
        </Button>
        <AccordionTrigger class="py-3 pr-8 hover:no-underline">
          <span class="font-medium">
            Plantilla {{ idx + 1 }}
            <span v-if="item.sector && item.template" class="ml-2 text-muted-foreground font-normal">
              — {{ sectorsConfig?.find(s => s.value === item.sector)?.label ?? item.sector }}
              / {{ templateOptionsFor(item.sector)?.find(t => t.value === item.template)?.label ?? item.template }}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div class="border-t border-border px-4 pt-4 pb-2">
            <CreditsFinancialActivityForm
              :model-value="item"
              @update:model-value="(v) => updateTemplate(idx, v)"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>
