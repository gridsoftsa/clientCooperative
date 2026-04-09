<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'

const props = defineProps<{
  sheetTitle: string
  totalPuntos: string
  lines: ScoreMatrixLine[]
}>()

type MatrixSectionBlock = { type: 'section'; line: Extract<ScoreMatrixLine, { k: 's' }> }
type MatrixVariableBlock = {
  type: 'variable'
  variable: string
  peso: string
  rows: Array<{ d: string; h: string; pt: string }>
  /** Si todas las filas tienen «Hasta» vacío (solo opciones discretas), se unen Desde+Hasta en una columna centrada. */
  mergeDesdeHasta: boolean
}

type MatrixBlock = MatrixSectionBlock | MatrixVariableBlock

type ScoreMatrixSection = {
  header: Extract<ScoreMatrixLine, { k: 's' }>
  variableBlocks: MatrixVariableBlock[]
}

/**
 * Agrupa filas `r` como en el Excel: la primera fila trae variable + peso; las siguientes con v/p vacíos
 * son rangos de la misma variable (rowspan en Variable y Peso).
 */
const groupedMatrix = computed((): MatrixBlock[] => {
  const lines = props.lines
  const out: MatrixBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.k === 's') {
      out.push({ type: 'section', line })
      i++
      continue
    }
    const variable = line.v
    const peso = line.p
    const rows = [{ d: line.d, h: line.h, pt: line.pt }]
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (next.k === 's') {
        break
      }
      if (next.k === 'r' && next.v === '' && next.p === '') {
        rows.push({ d: next.d, h: next.h, pt: next.pt })
        i++
      } else {
        break
      }
    }
    const mergeDesdeHasta = rows.every((r) => !String(r.h ?? '').trim())
    out.push({ type: 'variable', variable, peso, rows, mergeDesdeHasta })
  }
  return out
})

/** CUALITATIVAS / CUANTITATIVAS con sus bloques de variables (para desplegables). */
const scoreMatrixSections = computed((): ScoreMatrixSection[] => {
  const blocks = groupedMatrix.value
  const sections: ScoreMatrixSection[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.type !== 'section') {
      i++
      continue
    }
    const header = b.line
    i++
    const variableBlocks: MatrixVariableBlock[] = []
    while (i < blocks.length && blocks[i].type === 'variable') {
      variableBlocks.push(blocks[i] as MatrixVariableBlock)
      i++
    }
    sections.push({ header, variableBlocks })
  }
  return sections
})

/** Colores por tipo de sección para que el asesor distinga CUALITATIVAS vs CUANTITATIVAS. */
function scoreSectionUi(label: string) {
  const n = label.trim().toUpperCase()
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

/** Tono por bloque de variable (cada criterio rota color dentro de la sección). */
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

/** Muestra peso como porcentaje cuando es decimal 0–1 (p. ej. 0.2 → 20%). */
function formatPeso(p: string): string {
  const t = p.trim()
  if (!t) {
    return '—'
  }
  const n = Number(t.replace(',', '.'))
  if (!Number.isNaN(n) && n >= 0 && n <= 1) {
    return `${Math.round(n * 100)}%`
  }
  return t
}

/** Casilla estándar (filas de rango / puntaje). */
function casilla(extra?: string): string {
  return cn(
    'flex min-h-10 w-full items-center rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm shadow-sm',
    extra,
  )
}

/** Casilla en celdas con rowspan (variable / peso); el td usa align-middle para centrar en el alto del bloque. */
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
      <p class="text-sm text-muted-foreground">
        Puntaje total referencia: <span class="font-mono font-medium text-foreground">{{ totalPuntos }}</span>
      </p>
    </div>
    <div class="space-y-3">
      <Collapsible
        v-for="(sec, sIdx) in scoreMatrixSectionsWithUi"
        :key="sIdx"
        :default-open="false"
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
              <span class="text-muted-foreground text-xs font-mono sm:text-sm">
                <span class="opacity-80">Peso</span>
                {{ formatPeso(sec.header.peso) }}
              </span>
              <span class="text-muted-foreground text-xs font-mono sm:text-sm">
                <span class="opacity-80">Máx.</span>
                {{ sec.header.max }}
              </span>
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
                  <TableHead class="px-1 py-2 text-center text-xs">
                    Peso
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
                        {{ block.variable.trim() || '—' }}
                      </div>
                    </TableCell>
                    <TableCell
                      v-if="rIdx === 0"
                      :rowspan="block.rows.length"
                      class="p-1.5 align-middle"
                    >
                      <div :class="casillaRowspan('text-center font-mono text-sm font-medium')">
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
                      <div :class="casilla('min-h-10 justify-end font-mono text-sm text-foreground')">
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
