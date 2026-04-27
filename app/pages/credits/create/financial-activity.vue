<script setup lang="ts">
import type { FormSchemaInput } from '~/types/credits'
import {
  sectorsForActivityTemplates,
  getTemplateSchema,
  templateHasProductSelect,
} from '~/constants/credits-financial-templates'

definePageMeta({
  layout: 'default',
})

const sectorSelected = ref<string>('')
const templateSelected = ref<string>('')
const activitySectors = sectorsForActivityTemplates()

const templateOptions = computed(() => {
  if (!sectorSelected.value) return []
  return activitySectors.find((s) => s.value === sectorSelected.value)?.templates ?? []
})

const currentSchema = computed<FormSchemaInput | null>(() => {
  if (!templateSelected.value) return null
  return getTemplateSchema(templateSelected.value)
})

const hasProductSelect = computed(() =>
  templateSelected.value ? templateHasProductSelect(templateSelected.value) : false,
)

/** Valores iniciales; el formulario construye defaults según schema */
const initialFormData = {}

const formData = ref<Record<string, unknown>>({})

function setFormData(data: Record<string, unknown>) {
  formData.value = data
}

function onSchemaChange() {
  formData.value = {}
}

watch(templateSelected, () => {
  formData.value = {}
})

const formDataPreview = computed(() => JSON.stringify(formData.value, null, 2))
</script>

<template>
  <div class="w-full space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Actividad económica
      </h2>
      <p class="text-muted-foreground">
        Plantillas agropecuarias para el análisis de crédito. Selecciona sector y plantilla según la actividad del asociado.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Selectores + formulario -->
      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-lg border border-border p-4">
          <h3 class="mb-4 text-sm font-semibold">
            Sector y plantilla
          </h3>
          <ClientOnly>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="sector" class="text-sm font-medium">Sector</Label>
                <Select
                  v-model="sectorSelected"
                  @update:model-value="templateSelected = ''"
                >
                  <SelectTrigger id="sector" class="w-full">
                    <SelectValue placeholder="Seleccionar sector" />
                  </SelectTrigger>
                  <SelectContent class="bg-popover text-popover-foreground">
                    <SelectItem
                      v-for="s in activitySectors"
                      :key="s.value"
                      :value="s.value"
                    >
                      {{ s.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label for="template" class="text-sm font-medium">Plantilla</Label>
                <Select
                  v-model="templateSelected"
                  @update:model-value="onSchemaChange"
                >
                  <SelectTrigger id="template" class="w-full">
                    <SelectValue placeholder="Seleccionar plantilla" />
                  </SelectTrigger>
                  <SelectContent class="bg-popover text-popover-foreground">
                    <SelectItem
                      v-for="t in templateOptions"
                      :key="t.value"
                      :value="t.value"
                    >
                      {{ t.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ClientOnly>
          <p
            v-if="hasProductSelect"
            class="mt-3 text-xs text-muted-foreground"
          >
            La plantilla incluye selector de producto (ej. Café, Cacao, Bananito) para adjuntar el tipo de cultivo.
          </p>
        </div>

        <div v-if="currentSchema" class="rounded-lg border border-border p-4">
          <CreditsDynamicFormRenderer
            :key="templateSelected"
            :schema="currentSchema"
            :template-key="templateSelected"
            :initial-data="initialFormData"
            @update:form-data="setFormData"
          />
        </div>
        <div v-else class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Elige un sector y una plantilla para cargar el formulario
        </div>
      </div>

      <!-- Vista previa formData -->
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <h3 class="mb-2 text-sm font-semibold">
          Vista previa (formData)
        </h3>
        <p class="mb-2 text-xs text-muted-foreground">
          Los montos se guardan como número limpio para cálculos.
        </p>
        <pre class="max-h-[60vh] overflow-auto rounded bg-background p-3 text-xs">{{ formDataPreview }}</pre>
      </div>
    </div>
  </div>
</template>
