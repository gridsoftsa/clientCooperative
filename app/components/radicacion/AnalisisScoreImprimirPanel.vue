<script setup lang="ts">
import type { ImprimirMeta, ImprimirVariableRow } from '~/constants/analisis-score-imprimir'
import { IMPRIMIR_NIVEL_RIESGO_TABLA } from '~/constants/analisis-score-imprimir'
import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'
import type { ScoreMatrixOption } from '~/utils/analisis-score-matrix-options'
import {
  buildVariableOptionsFromMatrix,
  EMPLEADO_IMPRIMIR_MATRIX_ALIASES,
  INDEPENDIENTE_IMPRIMIR_MATRIX_ALIASES,
  resolveMatrixVariableKey,
} from '~/utils/analisis-score-matrix-options'

const props = defineProps<{
  variant: 'independiente' | 'empleado'
  meta: ImprimirMeta
  variableRows: ImprimirVariableRow[]
  /** Líneas de la misma fuente que `/parametrizacion/plantilla-score` (GET /score-template-matrices). */
  matrixLines: ScoreMatrixLine[]
}>()

const cabecera = defineModel<{ fecha: string; cedula: string; nombre: string }>('cabecera', {
  default: () => ({ fecha: '', cedula: '', nombre: '' }),
})

const optionsMap = computed(() => buildVariableOptionsFromMatrix(props.matrixLines))

const imprimirAliases = computed(() =>
  props.variant === 'empleado' ? EMPLEADO_IMPRIMIR_MATRIX_ALIASES : INDEPENDIENTE_IMPRIMIR_MATRIX_ALIASES,
)

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

function matrixOptionsForRow(row: ImprimirVariableRow): ScoreMatrixOption[] {
  const key = resolveMatrixVariableKey(row.variable, optionsMap.value, imprimirAliases.value)
  if (!key) {
    return []
  }
  return optionsMap.value.get(key) ?? []
}

function isMatrixDataRow(row: ImprimirVariableRow): boolean {
  if (isHeaderVariables(row) || isSectionRow(row)) {
    return false
  }
  return matrixOptionsForRow(row).length > 0
}

function selectedMatrixOptionValue(row: ImprimirVariableRow): string {
  const opts = matrixOptionsForRow(row)
  const c = row.caracteristica.trim()
  const p = row.puntaje.trim()
  const exact = opts.findIndex(o => o.label === c && o.pt === p)
  if (exact >= 0) {
    return String(exact)
  }
  const byLabel = opts.findIndex(o => o.label === c)
  if (byLabel >= 0) {
    return String(byLabel)
  }
  return '__none__'
}

function onMatrixOptionChange(row: ImprimirVariableRow, value: string): void {
  if (value === '__none__') {
    row.caracteristica = ''
    row.puntaje = ''
    return
  }
  const opts = matrixOptionsForRow(row)
  const opt = opts[Number(value)]
  if (opt) {
    row.caracteristica = opt.label
    row.puntaje = opt.pt
  }
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

    <div class="space-y-4">
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
                  <template v-if="isHeaderVariables(row)">
                    <span>{{ row.caracteristica }}</span>
                  </template>
                  <template v-else-if="!isSectionRow(row)">
                    <Select
                      v-if="isMatrixDataRow(row)"
                      :model-value="selectedMatrixOptionValue(row)"
                      @update:model-value="(v) => onMatrixOptionChange(row, v ?? '__none__')"
                    >
                      <SelectTrigger :id="`imp-car-${idx}`" class="h-auto min-h-8 w-full whitespace-normal py-1 text-left font-mono text-sm">
                        <SelectValue placeholder="Seleccionar…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Seleccionar…
                        </SelectItem>
                        <SelectItem
                          v-for="(opt, oi) in matrixOptionsForRow(row)"
                          :key="oi"
                          :value="String(oi)"
                          class="whitespace-normal font-mono text-sm"
                        >
                          {{ opt.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      v-else
                      v-model="row.caracteristica"
                      class="h-8 font-mono text-sm"
                      placeholder="—"
                    />
                  </template>
                </TableCell>
                <TableCell class="align-top text-right">
                  <template v-if="isHeaderVariables(row)">
                    <span>{{ row.puntaje }}</span>
                  </template>
                  <template v-else-if="!isSectionRow(row)">
                    <Input
                      v-if="isMatrixDataRow(row)"
                      v-model="row.puntaje"
                      readonly
                      tabindex="-1"
                      class="h-8 cursor-default border-transparent bg-muted/40 font-mono text-sm text-right shadow-none focus-visible:ring-0"
                      placeholder="—"
                    />
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
  </div>
</template>
