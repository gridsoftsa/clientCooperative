<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import AnalisisScoreImprimirPanel from '~/components/radicacion/AnalisisScoreImprimirPanel.vue'
import {
  IMPRIMIR_EMPLEADO_META,
  IMPRIMIR_EMPLEADO_VARIABLES,
  IMPRIMIR_INDEPENDIENTE_META,
  IMPRIMIR_INDEPENDIENTE_VARIABLES,
} from '~/constants/analisis-score-imprimir'
import {
  EMPLEADO_PENSIONADO_MATRIX,
  INDEPENDIENTE_MATRIX,
  type ScoreMatrixLine,
} from '~/constants/analisis-score-matrix'
import {
  ANALISIS_SCORE_PERFIL_OPTIONS,
  type AnalisisScorePerfilValue,
} from '~/constants/analisis-score'
import { isScoreMatrixLinesRenderable, normalizeScoreMatrixLines } from '~/utils/score-matrix-weights'

type ScoreMatricesApiResponse = {
  data: Record<string, { lines?: ScoreMatrixLine[] } | null>
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['radicacion_crear', 'radicacion_editar', 'radicacion_ver'],
})

const route = useRoute()
const router = useRouter()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()

const solicitudId = computed(() => {
  const q = route.query.solicitud
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
})

const scoreCabecera = ref({
  fecha: '',
  cedula: '',
  nombre: '',
})

const loadingSolicitud = ref(false)

const scoreLinesIndep = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(INDEPENDIENTE_MATRIX))
const scoreLinesEmp = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(EMPLEADO_PENSIONADO_MATRIX))

async function fetchScoreMatrices(): Promise<void> {
  try {
    const res = await $api('/score-template-matrices') as ScoreMatricesApiResponse
    const d = res.data
    if (d.independiente?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.independiente.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        scoreLinesIndep.value = normalized
      }
    }
    if (d.empleado_pensionado?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.empleado_pensionado.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        scoreLinesEmp.value = normalized
      }
    }
  } catch {
    // Se mantienen los valores normalizados por defecto (misma base que score-template).
  }
}

onMounted(() => {
  fetchScoreMatrices()
})

function formatFechaRadicacion(createdAt: unknown): string {
  if (createdAt == null || createdAt === '') {
    return new Date().toLocaleDateString('es-CO')
  }
  const d = new Date(String(createdAt))
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('es-CO')
  }
  return d.toLocaleDateString('es-CO')
}

function debtorDisplayName(debtor: Record<string, unknown>): string {
  const parts = [
    debtor.first_name,
    debtor.second_name,
    debtor.first_last_name,
    debtor.second_last_name,
  ].filter((p) => typeof p === 'string' && p.trim())
  return parts.join(' ').trim()
}

async function loadSolicitudCabecera(id: string): Promise<void> {
  loadingSolicitud.value = true
  try {
    const res = await $api<{ data?: Record<string, unknown> } & Record<string, unknown>>(`/credit-applications/${id}`)
    const data = (res?.data ?? res) as Record<string, unknown>
    const debtor = data.debtor as Record<string, unknown> | null | undefined
    if (debtor && typeof debtor === 'object') {
      const docType = typeof debtor.document_type === 'string' ? debtor.document_type.trim() : ''
      const docNum = debtor.document_number != null ? String(debtor.document_number).trim() : ''
      const cedula = [docType, docNum].filter(Boolean).join(' ').trim()
      scoreCabecera.value = {
        fecha: formatFechaRadicacion(data.created_at),
        cedula,
        nombre: debtorDisplayName(debtor),
      }
    } else {
      scoreCabecera.value = { fecha: formatFechaRadicacion(data.created_at), cedula: '', nombre: '' }
    }
  } catch (e) {
    console.error('Error cargando solicitud para SCORE:', e)
    scoreCabecera.value = { fecha: '', cedula: '', nombre: '' }
  } finally {
    loadingSolicitud.value = false
  }
}

watch(
  solicitudId,
  (id) => {
    if (!id) {
      scoreCabecera.value = { fecha: '', cedula: '', nombre: '' }
      return
    }
    loadSolicitudCabecera(id)
  },
  { immediate: true },
)

/** Un solo perfil: define qué hoja de impresión SCORE se muestra. */
const perfilDeudor = ref<AnalisisScorePerfilValue | undefined>(undefined)
const perfilPopoverOpen = ref(false)

const perfilTriggerLabel = computed(() => {
  if (perfilDeudor.value == null) {
    return 'Selecciona un perfil…'
  }
  return ANALISIS_SCORE_PERFIL_OPTIONS.find((o) => o.value === perfilDeudor.value)?.label ?? perfilDeudor.value
})

/** Vista de impresión según perfil: empleado y pensionado comparten la misma plantilla. */
const vistaImprimirScore = computed<'independiente' | 'empleado' | null>(() => {
  const p = perfilDeudor.value
  if (p == null) {
    return null
  }
  if (p === 'independiente') {
    return 'independiente'
  }
  return 'empleado'
})

function cerrarSelectorPerfil(): void {
  perfilPopoverOpen.value = false
}

</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 pb-10 pt-4 md:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <NuxtLink
            to="/radicacion"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Radicación
          </NuxtLink>
          <Icon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 opacity-60" />
          <span class="text-foreground">Análisis y SCORE</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">
          Análisis y SCORE
        </h1>
        <p class="max-w-2xl text-muted-foreground text-sm">
          Formulario alineado a la plantilla de análisis de crédito. Las matrices de configuración (INDEPENDIENTE y EMPLEADO y PENSIONADO) se gestionan en
          <NuxtLink
            v-if="hasPermission('plantillas_ver')"
            to="/settings/score-template"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Configuración → Configurar plantilla Score
          </NuxtLink>
          <span v-else class="font-medium text-foreground">Configuración → Configurar plantilla Score</span>.
          No incluye las hojas «DATOS», «CORRIENTE», «EMERGENCIA» ni «HOJA LIQU».
        </p>
        <p v-if="solicitudId" class="text-sm">
          <span class="text-muted-foreground">Solicitud vinculada:</span>
          <span class="ml-1 font-mono font-medium">#{{ solicitudId }}</span>
          <span v-if="loadingSolicitud" class="ml-2 text-muted-foreground">Cargando datos del deudor…</span>
        </p>
        <p v-else class="text-sm text-muted-foreground">
          Sin borrador vinculado. Puedes usar esta vista para pruebas o abrir SCORE desde una radicación guardada.
        </p>
      </div>
      <Button variant="outline" class="shrink-0" @click="router.push('/radicacion')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver a radicación
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">
          Perfil del deudor
        </CardTitle>
        <CardDescription>
          Elige un perfil para cargar la hoja de SCORE que corresponde (independiente, o empleado / pensionado).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Label class="text-sm font-medium">Perfil</Label>
        <Popover v-model:open="perfilPopoverOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              role="combobox"
              :aria-expanded="perfilPopoverOpen"
              class="h-auto min-h-10 w-full max-w-md justify-between py-2 text-left font-normal"
            >
              <span class="line-clamp-2">{{ perfilTriggerLabel }}</span>
              <Icon name="i-lucide-chevrons-up-down" class="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-80 p-3 sm:w-96" align="start">
            <p class="mb-3 text-xs font-medium text-muted-foreground">
              Selecciona una opción
            </p>
            <RadioGroup
              v-model="perfilDeudor"
              class="grid gap-2"
              @update:model-value="cerrarSelectorPerfil"
            >
              <div
                v-for="opt in ANALISIS_SCORE_PERFIL_OPTIONS"
                :key="opt.value"
                class="flex items-center gap-2"
              >
                <RadioGroupItem :id="`perfil-${opt.value}`" :value="opt.value" />
                <Label
                  :for="`perfil-${opt.value}`"
                  class="cursor-pointer text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {{ opt.label }}
                </Label>
              </div>
            </RadioGroup>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>

    <div v-if="vistaImprimirScore === 'independiente'" class="w-full">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            IMPRIMIR INDEPENDIENTE
          </CardTitle>
          <CardDescription>
            Hoja Excel: <span class="font-mono">IMPRIMIR INDEPENDIENTE</span>
            — Formato AIR-SARC-FO-02 con leyenda de referencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalisisScoreImprimirPanel
            v-model:cabecera="scoreCabecera"
            variant="independiente"
            :meta="IMPRIMIR_INDEPENDIENTE_META"
            :variable-rows="IMPRIMIR_INDEPENDIENTE_VARIABLES"
            :matrix-lines="scoreLinesIndep"
          />
        </CardContent>
      </Card>
    </div>

    <div v-else-if="vistaImprimirScore === 'empleado'" class="w-full">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            IMPRIMIR EMPLEADO - PENSIONADO
          </CardTitle>
          <CardDescription>
            Hoja Excel: <span class="font-mono">IMPRIMIR EMPLEADO -PENSIONADO</span>
            — Formato AIR-SARC-FO-03 con leyenda de referencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalisisScoreImprimirPanel
            v-model:cabecera="scoreCabecera"
            variant="empleado"
            :meta="IMPRIMIR_EMPLEADO_META"
            :variable-rows="IMPRIMIR_EMPLEADO_VARIABLES"
            :matrix-lines="scoreLinesEmp"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
