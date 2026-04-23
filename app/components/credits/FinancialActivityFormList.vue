<script setup lang="ts">
/**
 * Lista de plantillas de actividad económica. Permite añadir varias.
 * Los datos se guardan en debtor.financial_info.activity_templates.
 * Ofrece "Guardar plantilla" para validar y cerrar la plantilla actual.
 */
import { toast } from 'vue-sonner'
import type { ActivityTemplateData } from '~/types/credit-application'
import {
  sectorsConfig,
  validateActivityTemplate,
} from '~/constants/credits-financial-templates'

function templateOptionsFor(sector: string) {
  return sectorsConfig.find((s) => s.value === sector)?.templates ?? []
}

const props = withDefaults(
  defineProps<{
    modelValue?: ActivityTemplateData[]
    /** Modo solo lectura (sin edición) */
    readonly?: boolean
    /** Texto bajo el título (por defecto: actividades del deudor) */
    listHint?: string
  }>(),
  {
    modelValue: () => [],
    readonly: false,
    listHint: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ActivityTemplateData[]]
}>()

const templates = ref<ActivityTemplateData[]>([...(props.modelValue ?? [])])
/** Tras "Guardar plantilla", se bloquea sector y plantilla para esa fila (misma longitud que `templates`) */
const sectorTemplateLocked = ref<boolean[]>([])

function resyncSectorTemplateLockedFromPrevious(prev: boolean[]) {
  const n = templates.value.length
  sectorTemplateLocked.value = Array.from({ length: n }, (_, i) => prev[i] ?? false)
}

/** Controla qué acordeones están abiertos (activity-0, activity-1, etc.) */
const openItems = ref<string[]>([])

const deleteDialogOpen = ref(false)
const pendingDeleteIndex = ref<number | null>(null)

function openDeleteDialog(index: number) {
  pendingDeleteIndex.value = index
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
}

function confirmDeleteTemplate() {
  const i = pendingDeleteIndex.value
  if (i == null) {
    return
  }
  removeTemplate(i)
  closeDeleteDialog()
}

function addTemplate() {
  templates.value.push({
    sector: '',
    template: '',
    product: null,
    data: {},
  })
  resyncSectorTemplateLockedFromPrevious(sectorTemplateLocked.value)
  const newIdx = templates.value.length - 1
  openItems.value = [...openItems.value, `activity-${newIdx}`]
  emitUpdate()
}

/** Valida y guarda la plantilla actual; si es válida, la cierra. */
function saveTemplate(index: number) {
  const item = templates.value[index]
  if (!item) {
    return
  }
  const result = validateActivityTemplate(item)
  if (!result.valid) {
    toast.error(result.errors.join('. '))
    return
  }
  emitUpdate()
  const key = `activity-${index}`
  openItems.value = openItems.value.filter((v) => v !== key)
  {
    const prev = sectorTemplateLocked.value
    const next = Array.from(
      { length: templates.value.length },
      (_, i) => (i === index ? true : (prev[i] ?? false)),
    )
    sectorTemplateLocked.value = next
  }
  toast.success('Plantilla guardada correctamente.')
}

function removeTemplate(index: number) {
  templates.value.splice(index, 1)
  sectorTemplateLocked.value.splice(index, 1)
  openItems.value = openItems.value
    .map((v) => {
      const num = Number(v.replace('activity-', ''))
      if (num === index) return null
      return num > index ? `activity-${num - 1}` : v
    })
    .filter((v): v is string => v != null)
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

watch(deleteDialogOpen, (open) => {
  if (!open) {
    pendingDeleteIndex.value = null
  }
})

watch(
  () => props.modelValue,
  (val) => {
    const arr = val ?? []
    if (JSON.stringify(arr) !== JSON.stringify(templates.value)) {
      const prevLocks = sectorTemplateLocked.value
      templates.value = arr.length ? [...arr] : []
      resyncSectorTemplateLockedFromPrevious(prevLocks)
    }
    // Si el `if` no corrió (mismo JSON en carga inicial), `sectorTemplateLocked` seguía [] y
    // `sectorTemplateLocked[idx]` era undefined → el bloqueo nunca se aplicaba.
    resyncSectorTemplateLockedFromPrevious(sectorTemplateLocked.value)
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted-foreground">
        {{ listHint || 'Añade una o más plantillas según las actividades económicas del deudor' }}
      </p>
      <div v-if="!readonly" class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" @click="addTemplate">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Agregar plantilla
        </Button>
      </div>
    </div>

    <div v-if="templates.length === 0" class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      No hay plantillas. Haz clic en "Agregar plantilla" para comenzar.
    </div>

    <Accordion
      v-else
      v-model="openItems"
      type="multiple"
      collapsible
      class="space-y-2"
    >
      <AccordionItem
        v-for="(item, idx) in templates"
        :key="idx"
        :value="`activity-${idx}`"
        class="overflow-hidden rounded-lg border border-border px-4 data-[state=open]:border-primary/30"
      >
        <div class="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <Button
            v-if="!readonly"
            type="button"
            variant="destructive"
            size="sm"
            class="h-8 shrink-0 gap-1.5 px-2 text-xs"
            title="Eliminar plantilla"
            @click.stop="openDeleteDialog(idx)"
          >
            <Icon name="i-lucide-trash" class="h-3.5 w-3.5 shrink-0" />
            Eliminar
          </Button>
          <AccordionTrigger class="min-w-0 flex-1 py-3 pl-0 pr-0 hover:no-underline">
            <span class="min-w-0 flex-1 pr-2 text-left font-medium">
              Plantilla {{ idx + 1 }}
              <span v-if="item.sector && item.template" class="ml-2 text-muted-foreground font-bold">
                — {{ sectorsConfig?.find(s => s.value === item.sector)?.label ?? item.sector }}
                / {{ templateOptionsFor(item.sector)?.find(t => t.value === item.template)?.label ?? item.template }}
              </span>
            </span>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div class="border-t border-border pt-4 pb-2">
            <CreditsFinancialActivityForm
              :model-value="item"
              :readonly="readonly"
              :lock-sector-and-template="sectorTemplateLocked[idx] === true"
              @update:model-value="(v) => updateTemplate(idx, v)"
            />
            <div v-if="!readonly" class="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="saveTemplate(idx)"
              >
                <Icon name="i-lucide-save" class="mr-2 h-4 w-4" />
                Guardar plantilla
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent class="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="pendingDeleteIndex != null">
              Se eliminará la plantilla
              <span class="font-medium text-foreground"> {{ pendingDeleteIndex + 1 }} </span>
              y sus datos de actividad económica. Podrás agregar otra plantilla después.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="destructive"
            @click="confirmDeleteTemplate"
          >
            <Icon name="i-lucide-trash" class="mr-2 h-4 w-4" />
            Eliminar
          </Button>
          <AlertDialogCancel @click="closeDeleteDialog">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
