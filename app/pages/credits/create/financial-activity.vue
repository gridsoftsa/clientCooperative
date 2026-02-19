<script setup lang="ts">
import type { FormSchemaInput } from '~/types/credits'

definePageMeta({
  layout: 'default',
})

const sectors = [
  { value: 'agro', label: 'Agro' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'comercio', label: 'Comercio' },
]

const templatesBySector: Record<string, Array<{ value: string; label: string }>> = {
  agro: [
    { value: 'cafe', label: 'Café' },
    { value: 'ganaderia', label: 'Ganadería' },
    { value: 'platano', label: 'Plátano' },
  ],
  transporte: [
    { value: 'carga', label: 'Transporte Carga' },
    { value: 'pasajeros', label: 'Transporte Pasajeros' },
  ],
  comercio: [
    { value: 'independiente', label: 'Independiente / Establecimiento Comercial' },
  ],
}

const sectorSelected = ref<string>('')
const templateSelected = ref<string>('')

const templateOptions = computed(() => {
  if (!sectorSelected.value) return []
  return templatesBySector[sectorSelected.value] ?? []
})

/** Schema de prueba con campos money (decimales), number, text, date, select */
const mockSchema: FormSchemaInput = {
  sections: [
    {
      key: 'ingresos',
      title: 'Ingresos',
      fields: [
        { key: 'ingresos_mensuales', label: 'Ingresos mensuales', type: 'money', required: true, cols: 1 },
        { key: 'otros_ingresos', label: 'Otros ingresos', type: 'money', cols: 1 },
      ],
    },
    {
      key: 'costos',
      title: 'Costos y gastos',
      fields: [
        { key: 'costo_mercancia', label: 'Costo de mercancía', type: 'money', cols: 1 },
        { key: 'gastos_operacion', label: 'Gastos de operación', type: 'money', cols: 1 },
        { key: 'numero_ciclos_ano', label: 'Número de ciclos al año', type: 'number', meta: 'Int', cols: 1 },
        { key: 'fecha_inicio', label: 'Fecha inicio actividad', type: 'date', cols: 1 },
      ],
    },
    {
      key: 'detalle',
      title: 'Detalle',
      fields: [
        {
          key: 'tipo_actividad',
          label: 'Tipo',
          type: 'select',
          options: [
            { value: 'principal', label: 'Principal' },
            { value: 'secundaria', label: 'Secundaria' },
          ],
          cols: 1,
        },
        { key: 'observaciones', label: 'Observaciones', type: 'text', cols: 2 },
      ],
    },
  ],
}

/** Valores iniciales con decimales para probar que se guardan como número limpio */
const initialFormData = {
  ingresos_mensuales: 1500000.5,
  otros_ingresos: 250000.75,
  costo_mercancia: 800000,
  gastos_operacion: 120000.25,
  numero_ciclos_ano: 2,
  fecha_inicio: '2024-01-15',
  tipo_actividad: 'principal',
  observaciones: '',
}

const currentSchema = ref<FormSchemaInput>(mockSchema)
const formData = ref<Record<string, unknown>>({})

function setFormData(data: Record<string, unknown>) {
  formData.value = data
}

function onSchemaChange() {
  formData.value = {}
}

const formDataPreview = computed(() => JSON.stringify(formData.value, null, 2))
</script>

<template>
  <div class="w-full space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Actividad económica
      </h2>
      <p class="text-muted-foreground">
        Selector de sector y plantilla, formulario dinámico y vista previa de datos
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Selectores + formulario -->
      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-lg border border-border p-4">
          <h3 class="mb-4 text-sm font-semibold">
            Selectores
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="sector" class="text-sm font-medium">Sector</Label>
              <select
                id="sector"
                v-model="sectorSelected"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @change="templateSelected = ''"
              >
                <option value="">
                  Seleccionar sector
                </option>
                <option v-for="s in sectors" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </div>
            <div class="grid gap-2">
              <Label for="template" class="text-sm font-medium">Plantilla</Label>
              <select
                id="template"
                v-model="templateSelected"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @change="onSchemaChange"
              >
                <option value="">
                  Seleccionar plantilla
                </option>
                <option v-for="t in templateOptions" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="templateSelected" class="rounded-lg border border-border p-4">
          <CreditsDynamicFormRenderer
            :schema="currentSchema"
            :initial-data="initialFormData"
            @update:form-data="setFormData"
          />
        </div>
        <div v-else class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Elige un sector y una plantilla para cargar el formulario
        </div>
      </div>

      <!-- Reactive preview: JSON formData en tiempo real -->
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <h3 class="mb-2 text-sm font-semibold">
          Vista previa (formData)
        </h3>
        <p class="mb-2 text-xs text-muted-foreground">
          Los montos deben verse como número limpio (ej: 1500000.5), no formateado.
        </p>
        <pre class="max-h-[60vh] overflow-auto rounded bg-background p-3 text-xs">{{ formDataPreview }}</pre>
      </div>
    </div>
  </div>
</template>
