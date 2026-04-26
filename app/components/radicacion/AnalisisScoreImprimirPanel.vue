<script setup lang="ts">
import type { Company } from '~/types/company'
import { emergenciaStateToSnapshotObject, type EmergenciaState } from '~/constants/analisis-score-emergencia'
import type { AnalisisScorePerfilValue } from '~/constants/analisis-score'
import type { ImprimirMeta, ImprimirVariableRow } from '~/constants/analisis-score-imprimir'
import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'
import type { ScoreMatrixOption } from '~/utils/analisis-score-matrix-options'
import { toast } from 'vue-sonner'
import { Textarea } from '~/components/ui/textarea'
import { IMPRIMIR_NIVEL_RIESGO_TABLA } from '~/constants/analisis-score-imprimir'
import {
  classifyNivelRiesgo,
  classifyPuntajeTotalIFS,
  sumImprimirPuntajesPorSeccion,
} from '~/utils/analisis-score-imprimir-totals'
import type { EmergenciaCreditoCampoValidacion } from '~/utils/analisis-emergencia-validacion'
import { validarCreditoEmergenciaCompleto } from '~/utils/analisis-emergencia-validacion'
import {
  buildVariableOptionsFromMatrix,
  EMPLEADO_IMPRIMIR_MATRIX_ALIASES,
  INDEPENDIENTE_IMPRIMIR_MATRIX_ALIASES,
  resolveMatrixVariableKey,
} from '~/utils/analisis-score-matrix-options'
import AnalisisScoreResumenIfs from './AnalisisScoreResumenIfs.vue'

const props = defineProps<{
  variant: 'independiente' | 'empleado'
  meta: ImprimirMeta
  variableRows: ImprimirVariableRow[]
  /** Líneas de la misma fuente que `/parametrizacion/plantilla-score` (GET /score-template-matrices). */
  matrixLines: ScoreMatrixLine[]
  /** ID solicitud en la URL; sin él no se puede guardar en servidor. */
  creditApplicationId?: string | null
  perfilDeudor?: AnalisisScorePerfilValue
  /** Hoja análisis EMERGENCIA (mismo guardado en snapshot) */
  emergencia?: EmergenciaState | null
  /** Empresa principal (misma fuente que Configuración → Empresa) */
  company?: Company | null
  loadingCompany?: boolean
}>()

const emit = defineEmits<{
  saved: [snapshot: Record<string, unknown> | null]
  'credit-validation-failed': [payload: {
    ok: false
    errores: string[]
    campos: EmergenciaCreditoCampoValidacion[]
  }]
}>()

const cabecera = defineModel<{ fecha: string, cedula: string, nombre: string }>('cabecera', {
  default: () => ({ fecha: '', cedula: '', nombre: '' }),
})

const observaciones = defineModel<string>('observaciones', { default: () => '' })

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

const scoreSums = computed(() => sumImprimirPuntajesPorSeccion(filasEditables.value))

const nivelIFS = computed(() => classifyPuntajeTotalIFS(scoreSums.value.total))

const nivelRiesgo = computed(() => classifyNivelRiesgo(scoreSums.value.total))

function fmtPuntajeSum(n: number): string {
  if (Number.isInteger(n)) {
    return String(n)
  }

  return (Math.round(n * 100) / 100).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function isCualitativasEncabezado(row: ImprimirVariableRow): boolean {
  return row.variable.trim() === 'CUALITATIVAS'
}

function isCuantitativasEncabezado(row: ImprimirVariableRow): boolean {
  return row.variable.trim() === 'CUANTITATIVAS'
}

function filaRequierePuntaje(row: ImprimirVariableRow): boolean {
  return !isSectionRow(row)
}

function filaPuntajeCompleta(row: ImprimirVariableRow): boolean {
  if (isSectionRow(row)) {
    return true
  }
  if (isMatrixDataRow(row)) {
    if (selectedMatrixOptionValue(row) === '__none__') {
      return false
    }

    return row.puntaje.trim() !== ''
  }
  const raw = row.puntaje.trim().replace(',', '.')
  if (raw === '') {
    return false
  }

  return Number.isFinite(Number(raw))
}

function isFilaPuntajeIncompleta(row: ImprimirVariableRow): boolean {
  return filaRequierePuntaje(row) && !filaPuntajeCompleta(row)
}

const puntajesFormularioValido = computed(() =>
  !filasEditables.value.some(row => isFilaPuntajeIncompleta(row)),
)

const nombresVariablesPendientes = computed(() =>
  filasEditables.value.filter(row => isFilaPuntajeIncompleta(row)).map(row => row.variable.trim()),
)

/** Solo tras intentar guardar con errores, o hasta que el formulario quede válido. */
const erroresValidacionVisibles = ref(false)

watch(puntajesFormularioValido, (ok) => {
  if (ok) {
    erroresValidacionVisibles.value = false
  }
})

const { hasAnyPermission } = usePermissions()
const puedeGuardarScore = computed(() =>
  hasAnyPermission(['radicacion_crear', 'radicacion_editar']),
)

const guardandoScore = ref(false)

async function guardarAnalisisScore(options?: { conceptoAnalista?: string | null }): Promise<void> {
  const id = props.creditApplicationId?.trim()
  if (!id) {
    toast.error('Abre el análisis SCORE desde el listado de radicación para vincular una solicitud.')
    return
  }
  if (!props.perfilDeudor) {
    toast.error('Selecciona el perfil del deudor en el paso 1.')
    return
  }
  if (props.emergencia == null) {
    toast.error('Faltan datos de la hoja de análisis (EMERGENCIA). Vuelva al paso 2 o recargue la solicitud.')
    return
  }
  const valCred = validarCreditoEmergenciaCompleto(props.emergencia.credito)
  if (!valCred.ok) {
    emit('credit-validation-failed', valCred)
    return
  }
  if (!puntajesFormularioValido.value) {
    erroresValidacionVisibles.value = true
    toast.error('Completa el puntaje en todas las variables antes de guardar.')
    return
  }

  guardandoScore.value = true
  erroresValidacionVisibles.value = false
  try {
    const { $api, $csrf } = useNuxtApp()
    await $csrf()
    const body: Record<string, unknown> = {
      perfil_deudor: props.perfilDeudor,
      variant: props.variant,
      cabecera: { ...cabecera.value },
      variable_rows: filasEditables.value.map(r => ({ ...r })),
      sums: { ...scoreSums.value },
      nivel_ifs: nivelIFS.value,
      nivel_riesgo: nivelRiesgo.value,
      observaciones: observaciones.value.trim() === '' ? null : observaciones.value,
        emergencia: props.emergencia != null
        ? emergenciaStateToSnapshotObject(props.emergencia)
        : null,
    }
    if (options && 'conceptoAnalista' in options) {
      const c = options.conceptoAnalista
      const t = c == null ? '' : String(c).trim()
      body.concepto_analista = t === '' ? null : t
    }
    const res = await $api<{
      data?: { analisis_score_snapshot?: Record<string, unknown> | null }
      message?: string
    }>(`/credit-applications/${id}/analisis-score`, {
      method: 'PUT',
      body,
    })
    toast.success(res?.message ?? 'Análisis y SCORE guardado correctamente.')
    emit('saved', res?.data?.analisis_score_snapshot ?? null)
  }
  catch (e: any) {
    toast.error(e?.data?.message ?? 'No se pudo guardar el análisis SCORE.')
  }
  finally {
    guardandoScore.value = false
  }
}

function arePuntajesCompletos(): boolean {
  return puntajesFormularioValido.value
}

defineExpose({
  guardarAnalisisScore,
  guardandoScore,
  puedeGuardarScore,
  arePuntajesCompletos,
})
</script>

<template>
  <div class="space-y-6">
    <AnalisisScoreResumenIfs
      :cualitativo="scoreSums.cualitativo"
      :cuantitativo="scoreSums.cuantitativo"
      :total="scoreSums.total"
    />

    <div class="rounded-lg border bg-card p-4 text-sm">
      <p class="text-center text-base font-semibold leading-snug">
        {{ meta.titulo }}
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-muted-foreground">
        <span>Código: <span class="font-mono text-foreground">{{ meta.codigoFormulario }}</span></span>
        <span>Versión: <span class="font-mono text-foreground">{{ meta.version }}</span></span>
        <span>
          NIT:
          <span class="font-mono text-foreground">
            <template v-if="props.loadingCompany">…</template>
            <template v-else>{{ (props.company && props.company.nit && props.company.nit.trim()) || '—' }}</template>
          </span>
        </span>
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

      <Alert v-if="erroresValidacionVisibles && !puntajesFormularioValido" variant="destructive">
        <Icon name="i-lucide-alert-circle" class="h-4 w-4" />
        <AlertTitle>Faltan puntajes por asignar</AlertTitle>
        <AlertDescription>
          <p class="mb-2">
            Debes elegir una opción en <span class="font-medium">Característica</span> para cada variable (el puntaje se asigna automáticamente). Revisa las filas resaltadas.
          </p>
          <p v-if="nombresVariablesPendientes.length" class="text-sm">
            Pendientes ({{ nombresVariablesPendientes.length }}):
          </p>
          <ul
            v-if="nombresVariablesPendientes.length"
            class="mt-1 max-h-32 list-inside list-disc overflow-y-auto text-sm"
          >
            <li v-for="(nombre, i) in nombresVariablesPendientes" :key="i">
              {{ nombre }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>

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
                'bg-destructive/5 ring-1 ring-destructive/40': erroresValidacionVisibles && isFilaPuntajeIncompleta(row),
              }"
            >
              <TableCell class="whitespace-pre-wrap align-top">
                {{ row.variable }}
              </TableCell>
              <TableCell class="align-top">
                <template v-if="isHeaderVariables(row)">
                  <span>{{ row.caracteristica }}</span>
                </template>
                <template v-else-if="isCualitativasEncabezado(row) || isCuantitativasEncabezado(row)" />
                <template v-else-if="!isSectionRow(row)">
                  <Select
                    v-if="isMatrixDataRow(row)"
                    :model-value="selectedMatrixOptionValue(row)"
                    @update:model-value="(v) => onMatrixOptionChange(row, v == null ? '__none__' : String(v))"
                  >
                    <SelectTrigger
                      :id="`imp-car-${idx}`"
                      :aria-invalid="erroresValidacionVisibles && isFilaPuntajeIncompleta(row)"
                      class="h-auto min-h-8 w-full whitespace-normal py-1 text-left font-mono text-sm"
                      :class="erroresValidacionVisibles && isFilaPuntajeIncompleta(row) ? 'ring-2 ring-destructive' : ''"
                    >
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
                <template v-else-if="isCualitativasEncabezado(row)">
                  <span class="inline-flex min-h-8 items-center justify-end font-mono text-base font-semibold tabular-nums text-foreground">
                    {{ fmtPuntajeSum(scoreSums.cualitativo) }}
                  </span>
                </template>
                <template v-else-if="isCuantitativasEncabezado(row)">
                  <span class="inline-flex min-h-8 items-center justify-end font-mono text-base font-semibold tabular-nums text-foreground">
                    {{ fmtPuntajeSum(scoreSums.cuantitativo) }}
                  </span>
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
                    :aria-invalid="erroresValidacionVisibles && isFilaPuntajeIncompleta(row)"
                    class="h-8 font-mono text-sm text-right"
                    :class="erroresValidacionVisibles && isFilaPuntajeIncompleta(row) ? 'ring-2 ring-destructive' : ''"
                    placeholder="—"
                  />
                </template>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <AnalisisScoreResumenIfs
        :cualitativo="scoreSums.cualitativo"
        :cuantitativo="scoreSums.cuantitativo"
        :total="scoreSums.total"
      />

      <div class="space-y-1.5">
        <Label for="imp-observaciones">Observaciones</Label>
        <Textarea
          id="imp-observaciones"
          v-model="observaciones"
          rows="4"
          class="min-h-24 w-full resize-y"
          placeholder="Escriba observaciones sobre este SCORE (opcional)…"
        />
        <p class="text-xs text-muted-foreground">
          Visible al guardar y en el PDF del análisis SCORE si hay texto.
        </p>
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
