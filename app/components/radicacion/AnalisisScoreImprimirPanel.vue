<script setup lang="ts">
import type { ImprimirMeta, ImprimirVariableRow } from '~/constants/analisis-score-imprimir'
import {
  IMPRIMIR_LEYENDA_EMPLEADO,
  IMPRIMIR_LEYENDA_INDEPENDIENTE,
  IMPRIMIR_NIVEL_RIESGO_TABLA,
} from '~/constants/analisis-score-imprimir'

const props = defineProps<{
  variant: 'independiente' | 'empleado'
  meta: ImprimirMeta
  variableRows: ImprimirVariableRow[]
}>()

const leyenda = computed(() =>
  props.variant === 'empleado' ? IMPRIMIR_LEYENDA_EMPLEADO : IMPRIMIR_LEYENDA_INDEPENDIENTE,
)

const cabecera = ref({
  fecha: '',
  cedula: '',
  nombre: '',
})

const filasEditables = ref<ImprimirVariableRow[]>([])

watch(
  () => props.variableRows,
  (v) => {
    filasEditables.value = v.map(r => ({ ...r }))
  },
  { immediate: true },
)

function isSectionRow(row: ImprimirVariableRow): boolean {
  const v = row.variable.trim()
  return ['CUALITATIVAS', 'CUANTITATIVAS', 'VARIABLES'].includes(v)
}

function isHeaderVariables(row: ImprimirVariableRow): boolean {
  return row.variable === 'VARIABLES' && row.caracteristica === 'CARACTERÍSTICA'
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border bg-card p-4 text-sm">
      <p class="text-center text-base font-semibold leading-snug">
        {{ meta.titulo }}
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-muted-foreground">
        <span>Código: <span class="font-mono text-foreground">{{ meta.codigoFormulario }}</span></span>
        <span>Versión: <span class="font-mono text-foreground">{{ meta.version }}</span></span>
      </div>
      <p class="mt-3 text-center text-xs text-muted-foreground">
        {{ meta.entidadLinea }}
      </p>
      <p class="mt-1 text-center text-xs text-muted-foreground">
        Fecha actualización (según plantilla)
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-4 lg:col-span-2">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="space-y-1.5">
            <Label for="imp-fecha">FECHA</Label>
            <Input id="imp-fecha" v-model="cabecera.fecha" placeholder="DD/MM/AAAA" class="font-mono" />
          </div>
          <div class="space-y-1.5">
            <Label for="imp-cedula">CÉDULA</Label>
            <Input id="imp-cedula" v-model="cabecera.cedula" placeholder="" class="font-mono" />
          </div>
          <div class="space-y-1.5">
            <Label for="imp-nombre">NOMBRE</Label>
            <Input id="imp-nombre" v-model="cabecera.nombre" placeholder="" />
          </div>
        </div>

        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/60">
                <TableHead class="min-w-[220px]">
                  Variable
                </TableHead>
                <TableHead class="min-w-[180px]">
                  Característica
                </TableHead>
                <TableHead class="w-28 text-right">
                  Puntaje
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(row, idx) in filasEditables"
                :key="idx"
                :class="{
                  'bg-primary/10 font-semibold': isSectionRow(row) && !isHeaderVariables(row),
                  'bg-muted/50 text-xs font-medium': isHeaderVariables(row),
                }"
              >
                <TableCell class="whitespace-pre-wrap align-top">
                  {{ row.variable }}
                </TableCell>
                <TableCell class="align-top">
                  <template v-if="!isSectionRow(row) || isHeaderVariables(row)">
                    <span v-if="isHeaderVariables(row)">{{ row.caracteristica }}</span>
                    <Input
                      v-else
                      v-model="row.caracteristica"
                      class="h-8 font-mono text-sm"
                      placeholder="—"
                    />
                  </template>
                </TableCell>
                <TableCell class="align-top text-right">
                  <template v-if="!isSectionRow(row) || isHeaderVariables(row)">
                    <span v-if="isHeaderVariables(row)">{{ row.puntaje }}</span>
                    <Input
                      v-else
                      v-model="row.puntaje"
                      class="h-8 font-mono text-sm text-right"
                      placeholder="—"
                    />
                  </template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-semibold">
            Nivel de riesgo (tabla referencia)
          </p>
          <div class="max-w-md overflow-x-auto rounded-md border">
            <Table>
              <TableBody>
                <TableRow
                  v-for="(r, i) in IMPRIMIR_NIVEL_RIESGO_TABLA"
                  :key="i"
                  :class="i === 0 ? 'bg-muted/70 font-medium' : ''"
                >
                  <TableCell v-for="(cell, j) in r" :key="j" class="font-mono text-sm">
                    {{ cell }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            Firma de analista
          </p>
          <p class="mt-2 text-xs">
            Espacio reservado según plantilla impresa.
          </p>
        </div>
      </div>

      <div class="rounded-lg border bg-muted/20 p-3 lg:sticky lg:top-4 lg:self-start">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Leyenda / valores de referencia
        </p>
        <div class="max-h-[min(70vh,520px)] overflow-y-auto overscroll-y-contain pr-1">
          <ul class="space-y-1 text-xs text-muted-foreground">
            <li v-for="(item, i) in leyenda" :key="i" class="border-b border-border/40 py-1 last:border-0">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
