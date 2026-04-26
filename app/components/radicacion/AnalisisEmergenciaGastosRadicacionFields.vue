<script setup lang="ts">
import { formatPesosConSimboloDesdeTexto } from '~/composables/usePesosFormat'
import type { EmergenciaCapacidadBloque } from '~/constants/analisis-score-emergencia'

const props = withDefaults(
  defineProps<{
    bloque: EmergenciaCapacidadBloque
    /** true: valores desde el paso 3 de radicación, sin edición. */
    lock: boolean
  }>(),
  { lock: true },
)

/** Mismo aspecto que Ingresos / Total ingresos en `AnalisisEmergenciaForm` (solo lectura). */
const roClass
  = 'h-8 w-full text-right font-mono cursor-default bg-muted/50 text-foreground read-only:opacity-100'

function displayPesosStored(s: string | undefined | null): string {
  return formatPesosConSimboloDesdeTexto(s)
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="lock" class="text-xs text-muted-foreground">
      Gastos (mismo criterio que el paso 3 de radicación — solo lectura)
    </p>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Gastos personales</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoPersonal)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Gastos personales</Label>
        <Input v-model="bloque.gastoPersonal" class="h-8 font-mono" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Gastos alimentación</Label>
        <Input
          :model-value="displayPesosStored(bloque.alimentacion)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Gastos alimentación</Label>
        <Input v-model="bloque.alimentacion" class="h-8 font-mono" />
      </div>

      <div class="sm:col-span-2" :class="lock ? 'space-y-1' : 'space-y-1'">
        <Label class="text-xs">Gastos servicios / arriendo</Label>
        <Input
          v-if="lock"
          :model-value="displayPesosStored(bloque.gastosServiciosArriendo)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
        <Input v-else v-model="bloque.gastosServiciosArriendo" class="h-8 font-mono" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Salud</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoSalud)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Salud</Label>
        <Input v-model="bloque.gastoSalud" class="h-8 font-mono" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Pensión</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoPension)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Pensión</Label>
        <Input v-model="bloque.gastoPension" class="h-8 font-mono" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">ARL</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoArl)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">ARL</Label>
        <Input v-model="bloque.gastoArl" class="h-8 font-mono" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Otros</Label>
        <Input
          :model-value="displayPesosStored(bloque.otrosGastos)"
          :read-only-form="true"
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Otros</Label>
        <Input v-model="bloque.otrosGastos" class="h-8 font-mono" />
      </div>
    </div>
    <div class="space-y-1">
      <Label class="text-xs">Total gastos</Label>
      <Input
        v-if="lock"
        :model-value="displayPesosStored(bloque.totalEgresos)"
        :read-only-form="true"
        :class="roClass"
        :tabindex="-1"
        title="Desde Datos financieros de la radicación. No editable."
      />
      <Input v-else v-model="bloque.totalEgresos" class="h-8 font-mono" />
    </div>
  </div>
</template>
