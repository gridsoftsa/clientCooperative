<script setup lang="ts">
import type { EmergenciaPersonaActivo, EmergenciaTablaActivos } from '~/constants/analisis-score-emergencia'
import {
  sumaValorFilasActivos,
} from '~/utils/radicacion-financial-activos'
import { formatMontoCopVista, parseMontoCop } from '~/utils/analisis-emergencia-cuota'
import {
  filterPesosChars,
  formatPesos,
  onKeydownPesosOnly,
  parsePesosInput,
} from '~/composables/usePesosFormat'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'

const campoStack = 'min-w-0 space-y-1'

const persona = defineModel<EmergenciaPersonaActivo>({ required: true })

withDefaults(
  defineProps<{
    title: string
    subline?: string | null
  }>(),
  { subline: null },
)

/** Bienes raíces: abierto por defecto; Otros: colapsado para ahorrar scroll inicial. */
const openBienesGarantia = ref(true)
const openOtrosBienes = ref(false)

const thClass
  = 'border-b-2 border-border bg-muted/70 px-2 py-2 text-left text-sm font-bold text-foreground'
const thValorClass
  = 'border-b-2 border-border bg-muted/70 px-2 py-2 text-left text-sm font-bold text-foreground min-w-[12rem] w-[1%] whitespace-nowrap'
const cellClass = 'border-b border-border/80 px-2 py-1.5 align-top'
const cellNombreClass = `${cellClass} min-w-0 sm:min-w-[10rem]`
const cellValorClass = `${cellClass} w-[1%] min-w-[12rem] align-middle`

function totalVista(filas: { valor: string }[]) {
  const s = sumaValorFilasActivos(filas)
  if (!Number.isFinite(s) || s === 0) {
    return '—'
  }
  return formatMontoCopVista(s)
}

function onValorFilaUpdate(tab: EmergenciaTablaActivos, idx: number, v: string) {
  const raw = filterPesosChars(String(v))
  if (!raw.trim()) {
    tab.filas[idx]!.valor = ''
    return
  }
  const n = parsePesosInput(raw)
  tab.filas[idx]!.valor = n === undefined ? raw : formatPesos(n)
}

function onBlurNormaliza(tab: EmergenciaTablaActivos, idx: number) {
  const t = tab.filas[idx]?.valor
  if (t == null || !String(t).trim()) {
    return
  }
  const m = parseMontoCop(t)
  if (m != null) {
    tab.filas[idx]!.valor = formatMontoCopVista(m)
  }
}
</script>

<template>
  <div class="space-y-4 rounded-md border border-border/80 bg-card/30 p-3">
    <div class="border-b-2 border-primary/35 pb-3">
      <p class="text-base font-bold tracking-tight text-foreground">
        {{ title }}
      </p>
      <p
        v-if="subline"
        class="mt-1.5 text-sm text-muted-foreground"
      >
        {{ subline }}
      </p>
    </div>

    <Collapsible
      v-model:open="openBienesGarantia"
      class="group/bienes overflow-hidden rounded-lg border-2 border-primary/30 bg-primary/[0.04] shadow-sm dark:border-primary/40 dark:bg-primary/[0.08]"
    >
      <div
        class="flex flex-col gap-2 border-b-2 border-primary/25 bg-primary/[0.08] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:bg-primary/[0.12]"
      >
        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
              Bienes raíces
            </h4>
            <span
              v-if="persona.bienesGarantia.filas.length"
              class="inline-flex items-center rounded-md border border-primary/40 bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground"
            >
              {{ persona.bienesGarantia.filas.length }} fila(s)
            </span>
          </div>
          <p class="text-xs leading-snug text-muted-foreground sm:text-sm">
            Activos del paso 3 con «Garantía» (importados; puedes editar los campos).
          </p>
        </div>
        <CollapsibleTrigger as-child>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            class="h-9 shrink-0 gap-2 border border-primary/25 font-semibold"
          >
            <Icon
              name="i-lucide-chevron-down"
              class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/bienes:rotate-180"
            />
            <span>{{ openBienesGarantia ? 'Contraer' : 'Expandir' }}</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div class="space-y-3 p-3 pt-3">
          <div class="overflow-x-auto rounded-md border border-border/70 bg-background/50">
            <table class="w-full min-w-[42rem] table-auto border-collapse text-sm">
              <thead>
                <tr>
                  <th :class="thClass">
                    Nombre del activo
                  </th>
                  <th :class="thValorClass">
                    Valor
                  </th>
                  <th :class="[thClass, 'min-w-[8rem]']">
                    Matrícula inmobiliaria
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(fila, idx) in persona.bienesGarantia.filas" :key="`bg-${idx}`">
                  <td :class="cellNombreClass">
                    <Input
                      v-model="fila.nombre"
                      class="h-9 w-full min-w-0"
                      placeholder="—"
                    />
                  </td>
                  <td :class="cellValorClass">
                    <Input
                      :model-value="fila.valor"
                      type="text"
                      inputmode="decimal"
                      class="h-9 w-full min-w-[12rem] text-right text-sm font-mono tabular-nums"
                      placeholder="0"
                      @keydown="onKeydownPesosOnly"
                      @update:model-value="onValorFilaUpdate(persona.bienesGarantia, idx, $event != null ? String($event) : '')"
                      @blur="onBlurNormaliza(persona.bienesGarantia, idx)"
                    />
                  </td>
                  <td :class="cellClass">
                    <Input
                      v-model="fila.matricula"
                      class="h-9 w-full min-w-0 font-mono text-sm"
                      placeholder="—"
                    />
                  </td>
                </tr>
                <tr v-if="!persona.bienesGarantia.filas.length">
                  <td colspan="3" class="border-b border-border/60 px-2 py-3 text-center text-muted-foreground">
                    No hay filas. Regístralos en el paso 3 (Datos financieros) o pulsa «Actualizar desde radicación» en la sección Activos.
                  </td>
                </tr>
                <tr>
                  <td :class="[cellClass, 'bg-muted/40 font-bold text-foreground']">
                    Total
                  </td>
                  <td
                    :colspan="2"
                    :class="[cellClass, 'bg-muted/40 text-right text-sm font-bold font-mono tabular-nums']"
                  >
                    {{ totalVista(persona.bienesGarantia.filas) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div :class="[campoStack, 'pt-1']">
            <Label class="text-xs font-semibold">Observaciones (Bienes raíces)</Label>
            <Textarea
              v-model="persona.bienesGarantia.observaciones"
              class="min-h-[4rem] resize-y text-sm"
              placeholder="Observaciones sobre bienes en garantía…"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <Collapsible
      v-model:open="openOtrosBienes"
      class="group/otros overflow-hidden rounded-lg border-2 border-amber-600/40 bg-amber-50/40 shadow-sm dark:border-amber-500/45 dark:bg-amber-950/25"
    >
      <div
        class="flex flex-col gap-2 border-b-2 border-amber-600/30 bg-amber-100/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:bg-amber-950/45"
      >
        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
              Otros bienes (detalle)
            </h4>
            <span
              v-if="persona.otrosBienes.filas.length"
              class="inline-flex items-center rounded-md border border-amber-700/40 bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground dark:border-amber-400/45"
            >
              {{ persona.otrosBienes.filas.length }} fila(s)
            </span>
          </div>
          <p class="text-xs leading-snug text-muted-foreground sm:text-sm">
            Activos reportados sin Garantía (importados desde el paso 3).
          </p>
        </div>
        <CollapsibleTrigger as-child>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            class="h-9 shrink-0 gap-2 border border-amber-600/30 font-semibold dark:border-amber-500/40"
          >
            <Icon
              name="i-lucide-chevron-down"
              class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/otros:rotate-180"
            />
            <span>{{ openOtrosBienes ? 'Contraer' : 'Expandir' }}</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div class="space-y-3 p-3 pt-3">
          <div class="overflow-x-auto rounded-md border border-border/70 bg-background/50">
            <table class="w-full min-w-[42rem] table-auto border-collapse text-sm">
              <thead>
                <tr>
                  <th :class="thClass">
                    Nombre del activo
                  </th>
                  <th :class="thValorClass">
                    Valor
                  </th>
                  <th :class="[thClass, 'min-w-[8rem]']">
                    Matrícula inmobiliaria
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(fila, idx) in persona.otrosBienes.filas" :key="`ob-${idx}`">
                  <td :class="cellNombreClass">
                    <Input
                      v-model="fila.nombre"
                      class="h-9 w-full min-w-0"
                      placeholder="—"
                    />
                  </td>
                  <td :class="cellValorClass">
                    <Input
                      :model-value="fila.valor"
                      type="text"
                      inputmode="decimal"
                      class="h-9 w-full min-w-[12rem] text-right text-sm font-mono tabular-nums"
                      placeholder="0"
                      @keydown="onKeydownPesosOnly"
                      @update:model-value="onValorFilaUpdate(persona.otrosBienes, idx, $event != null ? String($event) : '')"
                      @blur="onBlurNormaliza(persona.otrosBienes, idx)"
                    />
                  </td>
                  <td :class="cellClass">
                    <Input
                      v-model="fila.matricula"
                      class="h-9 w-full min-w-0 font-mono text-sm"
                      placeholder="—"
                    />
                  </td>
                </tr>
                <tr v-if="!persona.otrosBienes.filas.length">
                  <td colspan="3" class="border-b border-border/60 px-2 py-3 text-center text-muted-foreground">
                    No hay filas. Regístralos en el paso 3 (Datos financieros) o pulsa «Actualizar desde radicación» en la sección Activos.
                  </td>
                </tr>
                <tr>
                  <td :class="[cellClass, 'bg-muted/40 font-bold text-foreground']">
                    Total
                  </td>
                  <td
                    :colspan="2"
                    :class="[cellClass, 'bg-muted/40 text-right text-sm font-bold font-mono tabular-nums']"
                  >
                    {{ totalVista(persona.otrosBienes.filas) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div :class="[campoStack, 'pt-1']">
            <Label class="text-xs font-semibold">Observaciones (Otros bienes)</Label>
            <Textarea
              v-model="persona.otrosBienes.observaciones"
              class="min-h-[4rem] resize-y text-sm"
              placeholder="Observaciones sobre otros bienes…"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
