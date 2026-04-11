<script setup lang="ts">
import { toast } from 'vue-sonner'
import { cn } from '@/lib/utils'
import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'
import {
  normalizeScoreMatrixLines,
  percentInputToWeightDecimal,
  validateSectionPeakPointsSumVsCap,
  validateSectionVariableWeightsNotOver100,
  weightDecimalToPercentInput,
} from '~/utils/score-matrix-weights'

const props = withDefaults(
  defineProps<{
    sheetTitle: string
    totalPuntos: string
    lines: ScoreMatrixLine[]
    /** Permite editar pesos (columna y cabeceras de sección) y puntajes */
    editable?: boolean
  }>(),
  {
    editable: false,
  },
)

const emit = defineEmits<{
  'update:lines': [lines: ScoreMatrixLine[]]
}>()

const localLines = ref<ScoreMatrixLine[]>([])

watch(
  () => props.lines,
  (v) => {
    localLines.value = normalizeScoreMatrixLines(v)
  },
  { immediate: true },
)

function scoreMatrixValidationError(): string | null {
  return (
    validateSectionVariableWeightsNotOver100(localLines.value)
    ?? validateSectionPeakPointsSumVsCap(localLines.value)
  )
}

function emitLines(): void {
  const err = scoreMatrixValidationError()
  if (err) {
    toast.error(err)
    return
  }
  emit('update:lines', normalizeScoreMatrixLines(localLines.value))
}

function setSectionField(lineIndex: number, field: 'peso' | 'max', value: string): void {
  const line = localLines.value[lineIndex]
  if (!line || matrixLineKind(line) !== 's') {
    return
  }
  const previousPeso = line.peso
  const previousMax = line.max
  if (field === 'peso') {
    line.peso = percentInputToWeightDecimal(value)
  } else {
    line.max = value
  }
  const err = scoreMatrixValidationError()
  if (err) {
    line.peso = previousPeso
    line.max = previousMax
    toast.error(err)
    return
  }
  emit('update:lines', normalizeScoreMatrixLines(localLines.value))
}

function setVariablePeso(firstLineIndex: number, value: string): void {
  const line = localLines.value[firstLineIndex]
  if (!line || matrixLineKind(line) !== 'r') {
    return
  }
  const previousP = line.p
  line.p = percentInputToWeightDecimal(value)
  const err = scoreMatrixValidationError()
  if (err) {
    line.p = previousP
    toast.error(err)
    return
  }
  emit('update:lines', normalizeScoreMatrixLines(localLines.value))
}

function setRowPt(lineIndex: number, value: string): void {
  const line = localLines.value[lineIndex]
  if (!line || matrixLineKind(line) !== 'r') {
    return
  }
  const previousPt = line.pt
  line.pt = value
  const err = scoreMatrixValidationError()
  if (err) {
    line.pt = previousPt
    toast.error(err)
    return
  }
  emit('update:lines', normalizeScoreMatrixLines(localLines.value))
}

type MatrixSectionBlock = { type: 'section'; line: Extract<ScoreMatrixLine, { k: 's' }>; lineIndex: number }
type MatrixVariableBlock = {
  type: 'variable'
  variable: string
  peso: string
  rows: Array<{ d: string; h: string; pt: string }>
  mergeDesdeHasta: boolean
  firstLineIndex: number
  rowLineIndices: number[]
}

type MatrixBlock = MatrixSectionBlock | MatrixVariableBlock

type ScoreMatrixSection = {
  header: Extract<ScoreMatrixLine, { k: 's' }>
  lineIndex: number
  variableBlocks: MatrixVariableBlock[]
}

function matrixLineKind(line: ScoreMatrixLine | undefined): 's' | 'r' | null {
  if (!line) {
    return null
  }
  const k = String(line.k ?? '')
    .trim()
    .toLowerCase()
  if (k === 's') {
    return 's'
  }
  if (k === 'r') {
    return 'r'
  }
  return null
}

const groupedMatrix = computed((): MatrixBlock[] => {
  const lines = localLines.value
  const out: MatrixBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line) {
      break
    }
    const kind = matrixLineKind(line)
    if (kind === 's') {
      out.push({ type: 'section', line: line as Extract<ScoreMatrixLine, { k: 's' }>, lineIndex: i })
      i++
      continue
    }
    if (kind !== 'r') {
      i++
      continue
    }
    const variable = line.v
    const peso = line.p
    const firstLineIndex = i
    const rowLineIndices: number[] = [i]
    const rows = [{ d: line.d, h: line.h, pt: line.pt }]
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (!next || matrixLineKind(next) === 's') {
        break
      }
      if (matrixLineKind(next) === 'r' && next.v === '' && next.p === '') {
        rowLineIndices.push(i)
        rows.push({ d: next.d, h: next.h, pt: next.pt })
        i++
      } else {
        break
      }
    }
    const mergeDesdeHasta = rows.every((r) => !String(r.h ?? '').trim())
    out.push({ type: 'variable', variable, peso, rows, mergeDesdeHasta, firstLineIndex, rowLineIndices })
  }
  return out
})

const scoreMatrixSections = computed((): ScoreMatrixSection[] => {
  const blocks = groupedMatrix.value
  const sections: ScoreMatrixSection[] = []
  let idx = 0
  while (idx < blocks.length) {
    const b = blocks[idx]
    if (b.type !== 'section') {
      idx++
      continue
    }
    const header = b.line
    const lineIndex = b.lineIndex
    idx++
    const variableBlocks: MatrixVariableBlock[] = []
    while (idx < blocks.length && blocks[idx].type === 'variable') {
      variableBlocks.push(blocks[idx] as MatrixVariableBlock)
      idx++
    }
    sections.push({ header, lineIndex, variableBlocks })
  }
  return sections
})

function scoreSectionUi(label: string | undefined | null) {
  const n = String(label ?? '').trim().toUpperCase()
  if (n.includes('CUANTITAT')) {
    return {
      root: 'border-amber-500/45 bg-amber-500/[0.07] dark:border-amber-400/40 dark:bg-amber-950/35',
      trigger:
        'bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border-l-[6px] border-l-amber-600 dark:border-l-amber-400',
      content: 'border-t border-amber-500/25 bg-amber-500/[0.04] dark:border-amber-400/20 dark:bg-amber-950/25',
      chevron: 'text-amber-800 dark:text-amber-200',
    }
  }
  if (n.includes('CUALITAT')) {
    return {
      root: 'border-sky-500/45 bg-sky-500/[0.07] dark:border-sky-400/40 dark:bg-sky-950/35',
      trigger:
        'bg-sky-500/15 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 border-l-[6px] border-l-sky-600 dark:border-l-sky-400',
      content: 'border-t border-sky-500/25 bg-sky-500/[0.04] dark:border-sky-400/20 dark:bg-sky-950/25',
      chevron: 'text-sky-800 dark:text-sky-200',
    }
  }
  return {
    root: 'border-border bg-muted/20',
    trigger: 'bg-muted/50 hover:bg-muted/70 border-l-[6px] border-l-muted-foreground/50',
    content: 'border-t border-border bg-muted/10',
    chevron: 'text-muted-foreground',
  }
}

const scoreMatrixSectionsWithUi = computed(() =>
  scoreMatrixSections.value.map(sec => ({
    ...sec,
    ui: scoreSectionUi(sec.header.label),
  })),
)

const VARIABLE_BLOCK_TONES = [
  {
    row: 'bg-violet-500/[0.08] dark:bg-violet-950/30 hover:bg-violet-500/[0.14] dark:hover:bg-violet-950/45',
    divide: 'border-t-2 border-violet-500/35 dark:border-violet-400/45',
  },
  {
    row: 'bg-cyan-500/[0.08] dark:bg-cyan-950/30 hover:bg-cyan-500/[0.14] dark:hover:bg-cyan-950/45',
    divide: 'border-t-2 border-cyan-500/35 dark:border-cyan-400/45',
  },
  {
    row: 'bg-emerald-500/[0.08] dark:bg-emerald-950/30 hover:bg-emerald-500/[0.14] dark:hover:bg-emerald-950/45',
    divide: 'border-t-2 border-emerald-500/35 dark:border-emerald-400/45',
  },
  {
    row: 'bg-amber-500/[0.08] dark:bg-amber-950/30 hover:bg-amber-500/[0.14] dark:hover:bg-amber-950/45',
    divide: 'border-t-2 border-amber-500/35 dark:border-amber-400/45',
  },
  {
    row: 'bg-rose-500/[0.08] dark:bg-rose-950/30 hover:bg-rose-500/[0.14] dark:hover:bg-rose-950/45',
    divide: 'border-t-2 border-rose-500/35 dark:border-rose-400/45',
  },
  {
    row: 'bg-indigo-500/[0.08] dark:bg-indigo-950/30 hover:bg-indigo-500/[0.14] dark:hover:bg-indigo-950/45',
    divide: 'border-t-2 border-indigo-500/35 dark:border-indigo-400/45',
  },
  {
    row: 'bg-orange-500/[0.08] dark:bg-orange-950/30 hover:bg-orange-500/[0.14] dark:hover:bg-orange-950/45',
    divide: 'border-t-2 border-orange-500/35 dark:border-orange-400/45',
  },
  {
    row: 'bg-teal-500/[0.08] dark:bg-teal-950/30 hover:bg-teal-500/[0.14] dark:hover:bg-teal-950/45',
    divide: 'border-t-2 border-teal-500/35 dark:border-teal-400/45',
  },
] as const

function variableBlockTone(bIdx: number) {
  return VARIABLE_BLOCK_TONES[bIdx % VARIABLE_BLOCK_TONES.length]
}

function variableBlockRowClass(bIdx: number, rIdx: number): string {
  const tone = variableBlockTone(bIdx)
  return cn(
    tone.row,
    bIdx > 0 && rIdx === 0 ? tone.divide : '',
  )
}

function formatPeso(p: string | undefined | null): string {
  const t = String(p ?? '').trim()
  if (!t) {
    return '—'
  }
  const n2 = Number(t.replace(',', '.'))
  if (!Number.isNaN(n2) && n2 >= 0 && n2 <= 1) {
    return `${Math.round(n2 * 100)}%`
  }
  return t
}

const inputCellClass =
  'h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'

function casilla(extra?: string): string {
  return cn(
    'flex min-h-10 w-full items-center rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm shadow-sm',
    extra,
  )
}

function casillaRowspan(extra?: string): string {
  return cn(
    'w-full rounded-md border border-border bg-muted/30 px-1.5 py-1.5 text-xs leading-snug shadow-sm',
    extra,
  )
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
      <h3 class="text-lg font-semibold tracking-tight">
        {{ sheetTitle }}
      </h3>
      <div class="text-right">
        <p class="text-sm text-muted-foreground">
          Puntaje total referencia: <span class="font-mono font-medium text-foreground">{{ totalPuntos }}</span>
        </p>
        <p v-if="editable" class="mt-1 max-w-xl text-xs text-muted-foreground">
          Columna <span class="font-medium text-foreground">Peso</span>: porcentaje 0–100 (ej. 20 = 20 %); por sección la suma de pesos no puede superar el 100 %.
          Columna <span class="font-medium text-foreground">Puntaje</span>: por variable se toma el máximo entre sus filas; la suma de esos máximos en cada sección no puede superar el tope <span class="font-medium text-foreground">Máx</span> de la cabecera (p. ej. 300 / 700 sobre 1000 puntos).
        </p>
      </div>
    </div>
    <div class="space-y-3">
      <Collapsible
        v-for="(sec, sIdx) in scoreMatrixSectionsWithUi"
        :key="sIdx"
        :default-open="true"
        :class="cn('group/scoreMat overflow-hidden rounded-md border-2', sec.ui.root)"
      >
        <CollapsibleTrigger as-child>
          <button
            type="button"
            :class="cn(
              'flex w-full items-stretch gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              sec.ui.trigger,
            )"
          >
            <span class="flex shrink-0 items-center px-2 py-2" aria-hidden="true">
              <Icon
                name="i-lucide-chevron-down"
                :class="cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/scoreMat:rotate-180',
                  sec.ui.chevron,
                )"
              />
            </span>
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-2 pr-3">
              <span class="font-semibold text-foreground">
                {{ sec.header.label }}
              </span>
              <template v-if="editable">
                <span class="flex items-center gap-1 text-muted-foreground text-xs">
                  <span class="opacity-80">Peso (%)</span>
                  <input
                    :value="weightDecimalToPercentInput(sec.header.peso)"
                    type="text"
                    inputmode="decimal"
                    :class="cn(inputCellClass, 'w-14')"
                    @input="setSectionField(sec.lineIndex, 'peso', ($event.target as HTMLInputElement).value)"
                  >
                </span>
                <span class="flex items-center gap-1 text-muted-foreground text-xs">
                  <span class="opacity-80">Máx.</span>
                  <input
                    :value="sec.header.max"
                    type="text"
                    :class="cn(inputCellClass, 'w-14')"
                    @input="setSectionField(sec.lineIndex, 'max', ($event.target as HTMLInputElement).value)"
                  >
                </span>
              </template>
              <template v-else>
                <span class="text-muted-foreground text-xs font-mono sm:text-sm">
                  <span class="opacity-80">Peso</span>
                  {{ formatPeso(sec.header.peso) }}
                </span>
                <span class="text-muted-foreground text-xs font-mono sm:text-sm">
                  <span class="opacity-80">Máx.</span>
                  {{ sec.header.max }}
                </span>
              </template>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div :class="cn('overflow-x-auto', sec.ui.content)">
            <Table class="table-fixed border-0 bg-background/80 dark:bg-background/50">
              <colgroup>
                <col class="w-[6.25rem] sm:w-[7rem]" />
                <col class="w-11 sm:w-12" />
                <col class="w-[4rem] sm:w-[4.25rem]" />
                <col class="w-[4rem] sm:w-[4.25rem]" />
                <col class="w-[3.75rem] sm:w-16" />
              </colgroup>
              <TableHeader>
                <TableRow class="bg-muted/60 hover:bg-muted/60">
                  <TableHead class="px-1.5 py-2 text-center text-xs font-medium whitespace-normal">
                    Variable
                  </TableHead>
                  <TableHead class="px-1 py-2 text-center text-xs whitespace-normal">
                    Peso<span v-if="editable" class="block font-normal opacity-80">(%)</span>
                  </TableHead>
                  <TableHead class="px-1 py-2 text-center text-xs font-medium whitespace-normal">
                    Desde
                  </TableHead>
                  <TableHead class="px-1 py-2 text-center text-xs font-medium whitespace-normal">
                    Hasta
                  </TableHead>
                  <TableHead class="px-2 py-2 text-right text-xs">
                    Puntaje
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-for="(block, bIdx) in sec.variableBlocks" :key="`${sIdx}-${bIdx}`">
                  <TableRow
                    v-for="(sub, rIdx) in block.rows"
                    :key="`${sIdx}-${bIdx}-${rIdx}`"
                    :class="variableBlockRowClass(bIdx, rIdx)"
                  >
                    <TableCell
                      v-if="rIdx === 0"
                      :rowspan="block.rows.length"
                      class="min-w-0 max-w-[6.25rem] p-1 align-middle sm:max-w-[7rem]"
                    >
                      <div
                        :class="casillaRowspan('break-words text-center font-medium text-foreground hyphens-auto [overflow-wrap:anywhere]')"
                      >
                        {{ (block.variable ?? '').trim() || '—' }}
                      </div>
                    </TableCell>
                    <TableCell
                      v-if="rIdx === 0"
                      :rowspan="block.rows.length"
                      class="p-1.5 align-middle"
                    >
                      <input
                        v-if="editable"
                        :value="weightDecimalToPercentInput(block.peso)"
                        type="text"
                        inputmode="decimal"
                        :class="cn(inputCellClass, 'min-h-[2.25rem]')"
                        @input="setVariablePeso(block.firstLineIndex, ($event.target as HTMLInputElement).value)"
                      >
                      <div v-else :class="casillaRowspan('text-center font-mono text-sm font-medium')">
                        {{ formatPeso(block.peso) }}
                      </div>
                    </TableCell>
                    <template v-if="block.mergeDesdeHasta">
                      <TableCell
                        :key="`opc-${sIdx}-${bIdx}-${rIdx}`"
                        colspan="2"
                        class="p-1.5 align-top"
                      >
                        <div
                          class="flex min-h-10 w-full items-center justify-center rounded-md border border-border bg-muted/30 px-3 py-2 text-center text-sm shadow-sm whitespace-pre-wrap"
                        >
                          <span :class="sub.d ? 'font-medium text-foreground' : 'text-muted-foreground'">
                            {{ sub.d || '—' }}
                          </span>
                        </div>
                      </TableCell>
                    </template>
                    <template v-else>
                      <TableCell :key="`d-${sIdx}-${bIdx}-${rIdx}`" class="p-1 align-top">
                        <div :class="casilla('min-h-10 justify-center px-1 text-center text-xs ' + (sub.d ? '' : 'text-muted-foreground'))">
                          {{ sub.d || '—' }}
                        </div>
                      </TableCell>
                      <TableCell :key="`h-${sIdx}-${bIdx}-${rIdx}`" class="p-1 align-top">
                        <div :class="casilla('min-h-10 justify-center px-1 text-center text-xs ' + (sub.h ? '' : 'text-muted-foreground'))">
                          {{ sub.h || '—' }}
                        </div>
                      </TableCell>
                    </template>
                    <TableCell :key="`pt-${sIdx}-${bIdx}-${rIdx}`" class="p-1.5 align-top">
                      <input
                        v-if="editable"
                        :value="sub.pt"
                        type="text"
                        :class="cn(inputCellClass, 'min-h-10 text-right')"
                        @input="setRowPt(block.rowLineIndices[rIdx]!, ($event.target as HTMLInputElement).value)"
                      >
                      <div v-else :class="casilla('min-h-10 justify-end font-mono text-sm text-foreground')">
                        {{ sub.pt }}
                      </div>
                    </TableCell>
                  </TableRow>
                </template>
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </div>
</template>