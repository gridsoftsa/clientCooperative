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

/** Mismo aspecto que Ingresos / Total ingresos; ancho acotado para montos COP. */
const roClass
  = 'h-8 w-full max-w-[15rem] min-w-0 text-right font-mono cursor-default bg-muted/50 text-foreground read-only:opacity-100'

const editableMontoClass = 'h-8 w-full max-w-[15rem] min-w-0 font-mono'

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
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Gastos personales</Label>
        <Input v-model="bloque.gastoPersonal" :class="editableMontoClass" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Gastos alimentación</Label>
        <Input
          :model-value="displayPesosStored(bloque.alimentacion)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Gastos alimentación</Label>
        <Input v-model="bloque.alimentacion" :class="editableMontoClass" />
      </div>

      <div class="sm:col-span-2" :class="lock ? 'space-y-1' : 'space-y-1'">
        <Label class="text-xs">Gastos servicios / arriendo</Label>
        <Input
          v-if="lock"
          :model-value="displayPesosStored(bloque.gastosServiciosArriendo)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
        <Input v-else v-model="bloque.gastosServiciosArriendo" :class="editableMontoClass" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Salud</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoSalud)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Salud</Label>
        <Input v-model="bloque.gastoSalud" :class="editableMontoClass" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Pensión</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoPension)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Pensión</Label>
        <Input v-model="bloque.gastoPension" :class="editableMontoClass" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">ARL</Label>
        <Input
          :model-value="displayPesosStored(bloque.gastoArl)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">ARL</Label>
        <Input v-model="bloque.gastoArl" :class="editableMontoClass" />
      </div>

      <div v-if="lock" class="space-y-1">
        <Label class="text-xs">Otros</Label>
        <Input
          :model-value="displayPesosStored(bloque.otrosGastos)"
          readonly
          :class="roClass"
          :tabindex="-1"
          title="Desde Datos financieros de la radicación. No editable."
        />
      </div>
      <div v-else class="space-y-1">
        <Label class="text-xs">Otros</Label>
        <Input v-model="bloque.otrosGastos" :class="editableMontoClass" />
      </div>
    </div>
    <div class="space-y-1">
      <Label class="text-xs">Total gastos</Label>
      <Input
        v-if="lock"
        :model-value="displayPesosStored(bloque.totalEgresos)"
        readonly
        :class="roClass"
        :tabindex="-1"
        title="Desde Datos financieros de la radicación. No editable."
      />
      <Input v-else v-model="bloque.totalEgresos" :class="editableMontoClass" />
    </div>
  </div>
</template>
