<script setup lang="ts">
import { toast } from 'vue-sonner'
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
import type { AnalisisScorePerfilValue } from '~/constants/analisis-score'
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

/** Un solo perfil: define qué hoja de impresión SCORE se muestra (solo en paso 2). */
const perfilDeudor = ref<AnalisisScorePerfilValue | undefined>(undefined)

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

const currentStep = ref(1)
const maxStep = 2

const stepsScore = [
  { num: 1, title: 'Perfil del deudor' },
  { num: 2, title: 'Hoja SCORE' },
] as const

const activeStepMeta = computed(() => {
  if (currentStep.value === 1) {
    return {
      title: 'Perfil del deudor',
      description:
        'Elige el perfil del deudor (independiente, empleado o pensionado). La hoja SCORE se abre en el siguiente paso. Para corregir el perfil, pulsa Anterior. Las matrices se configuran en Configuración → Plantilla Score.',
    }
  }
  if (vistaImprimirScore.value === 'independiente') {
    return {
      title: 'IMPRIMIR INDEPENDIENTE',
      description:
        'Hoja Excel IMPRIMIR INDEPENDIENTE — Formato AIR-SARC-FO-02.',
    }
  }
  if (vistaImprimirScore.value === 'empleado') {
    return {
      title: 'IMPRIMIR EMPLEADO - PENSIONADO',
      description:
        'Hoja Excel IMPRIMIR EMPLEADO -PENSIONADO — Formato AIR-SARC-FO-03.',
    }
  }
  return {
    title: 'Hoja SCORE',
    description: 'Selecciona un perfil en el paso 1 para ver el formulario de puntajes.',
  }
})

function goToStep(num: number): void {
  if (num === 2 && perfilDeudor.value == null) {
    toast.error('Primero elige un perfil del deudor en el paso 1.')
    return
  }
  currentStep.value = num
}

function nextStep(): void {
  if (currentStep.value === 1) {
    if (perfilDeudor.value == null) {
      toast.error('Selecciona un perfil del deudor para continuar.')
      return
    }
    currentStep.value = 2
    return
  }
}

function prevStep(): void {
  if (currentStep.value > 1) {
    currentStep.value = 1
  }
}

watch(perfilDeudor, (p) => {
  if (p == null && currentStep.value === 2) {
    currentStep.value = 1
  }
})

</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-0 pb-10 pt-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <NuxtLink
            to="/radicacion"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Radicación
          </NuxtLink>
          <Icon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 opacity-60" />
          <span class="text-foreground">Análisis y SCORE</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight">
          Análisis y SCORE
        </h2>
        <p class="text-muted-foreground">
          Radicación — Análisis de riesgo
        </p>
      </div>
      <Button variant="outline" class="shrink-0" @click="router.push('/radicacion')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <div
      v-if="solicitudId"
      class="rounded-xl border bg-card p-4"
    >
      <p class="text-sm">
        <span class="text-muted-foreground">Solicitud vinculada:</span>
        <span class="ml-1 font-mono font-medium text-foreground">#{{ solicitudId }}</span>
        <span v-if="loadingSolicitud" class="ml-2 text-muted-foreground">Cargando datos del deudor…</span>
      </p>
    </div>
    <div
      v-else
      class="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 p-4 text-sm text-muted-foreground"
    >
      Sin solicitud vinculada en la URL. Puedes usar esta vista en modo prueba o abrir SCORE desde el listado de radicación.
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <template v-for="(step, idx) in stepsScore" :key="step.num">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="[
            currentStep === step.num
              ? 'cursor-default bg-primary text-primary-foreground'
              : 'cursor-pointer hover:bg-muted',
          ]"
          :aria-current="currentStep === step.num ? 'step' : undefined"
          @click="goToStep(step.num)"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
            :class="currentStep === step.num
              ? 'bg-primary text-primary-foreground ring-primary'
              : currentStep > step.num
                ? 'bg-primary/30 text-primary ring-primary/30'
                : 'bg-background text-foreground ring-muted-foreground/40'"
          >
            {{ step.num }}
          </div>
          <span
            class="hidden text-sm font-semibold sm:inline"
            :class="currentStep === step.num ? 'text-primary-foreground' : 'text-foreground'"
          >
            {{ step.title }}
          </span>
        </button>
        <Icon
          v-if="idx < stepsScore.length - 1"
          name="i-lucide-chevron-right"
          class="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </template>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ activeStepMeta.title }}
        </CardTitle>
        <CardDescription class="max-w-3xl space-y-2">
          <span>{{ activeStepMeta.description }}</span>
          <span
            v-if="currentStep === 1"
            class="mt-2 block text-muted-foreground"
          >
            <NuxtLink
              v-if="hasPermission('plantillas_ver')"
              to="/parametrizacion/plantilla-score"
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              Plantilla Score
            </NuxtLink>
            <template v-else>
              <span class="font-medium text-foreground">Plantilla Score</span> (requiere permiso).
            </template>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div v-if="currentStep === 1" class="space-y-4">
          <RadicacionAnalisisScorePerfilPicker v-model="perfilDeudor" />
        </div>

        <div v-else-if="currentStep === 2" class="space-y-4">
          <AnalisisScoreImprimirPanel
            v-if="vistaImprimirScore === 'independiente'"
            v-model:cabecera="scoreCabecera"
            variant="independiente"
            :meta="IMPRIMIR_INDEPENDIENTE_META"
            :variable-rows="IMPRIMIR_INDEPENDIENTE_VARIABLES"
            :matrix-lines="scoreLinesIndep"
          />
          <AnalisisScoreImprimirPanel
            v-else-if="vistaImprimirScore === 'empleado'"
            v-model:cabecera="scoreCabecera"
            variant="empleado"
            :meta="IMPRIMIR_EMPLEADO_META"
            :variable-rows="IMPRIMIR_EMPLEADO_VARIABLES"
            :matrix-lines="scoreLinesEmp"
          />
          <p v-else class="text-sm text-muted-foreground">
            Selecciona un perfil en el paso 1 para cargar la hoja de score.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="currentStep > 1"
              type="button"
              variant="outline"
              @click="prevStep"
            >
              Anterior
            </Button>
            <Button
              v-if="currentStep < maxStep"
              type="button"
              @click="nextStep"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
