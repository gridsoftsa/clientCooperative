<script setup lang="ts">
import { toRaw } from 'vue'
import { toast } from 'vue-sonner'
import AnalisisScoreMatrixTable from '~/components/radicacion/AnalisisScoreMatrixTable.vue'
import {
  EMPLEADO_PENSIONADO_MATRIX,
  INDEPENDIENTE_MATRIX,
} from '~/constants/analisis-score-matrix'
import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'
import { SCORE_TEMPLATE_MATRIX_TABS } from '~/constants/analisis-score'
import { isScoreMatrixLinesRenderable, normalizeScoreMatrixLines } from '~/utils/score-matrix-weights'

/** Respuesta GET /score-template-matrices (sin genérico en $api para evitar conflicto del compilador Vue con `<`) */
type ScoreMatricesApiResponse = {
  data: Record<string, { lines?: ScoreMatrixLine[] } | null>
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver',
})

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const router = useRouter()

const defaultTab = SCORE_TEMPLATE_MATRIX_TABS[0]?.value ?? 'independiente'

const loading = ref(true)
const linesIndep = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(INDEPENDIENTE_MATRIX))
const linesEmp = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(EMPLEADO_PENSIONADO_MATRIX))

const canEdit = computed(() => hasPermission('plantillas_editar'))

const isEditingIndep = ref(false)
const isEditingEmp = ref(false)
const savingIndep = ref(false)
const savingEmp = ref(false)
/** Copia al entrar en edición; al cancelar se restaura. */
const snapshotIndep = ref<ScoreMatrixLine[] | null>(null)
const snapshotEmp = ref<ScoreMatrixLine[] | null>(null)

/** Copia profunda sin proxies reactivos (`structuredClone` falla con refs de Vue). */
function cloneLines(lines: ScoreMatrixLine[]): ScoreMatrixLine[] {
  return JSON.parse(JSON.stringify(toRaw(lines))) as ScoreMatrixLine[]
}

async function fetchMatrices() {
  loading.value = true
  try {
    const res = await $api('/score-template-matrices') as ScoreMatricesApiResponse
    const d = res.data
    if (d.independiente?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.independiente.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        linesIndep.value = normalized
      } else {
        linesIndep.value = normalizeScoreMatrixLines(INDEPENDIENTE_MATRIX)
        toast.warning(
          'La matriz INDEPENDIENTE en el servidor no tenía datos válidos; se mostraron los valores por defecto. Use «Editar plantilla» y «Guardar cambios» para volver a persistirla, o ejecute el seeder en el API.',
        )
      }
    }
    if (d.empleado_pensionado?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.empleado_pensionado.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        linesEmp.value = normalized
      } else {
        linesEmp.value = normalizeScoreMatrixLines(EMPLEADO_PENSIONADO_MATRIX)
        toast.warning(
          'La matriz EMPLEADO Y PENSIONADO en el servidor no tenía datos válidos; se mostraron los valores por defecto.',
        )
      }
    }
    isEditingIndep.value = false
    isEditingEmp.value = false
    snapshotIndep.value = null
    snapshotEmp.value = null
  } catch {
    toast.error('No se pudieron cargar las matrices SCORE. Se muestran valores por defecto.')
  } finally {
    loading.value = false
  }
}

async function saveSheet(sheetKey: 'independiente' | 'empleado_pensionado', lines: ScoreMatrixLine[]): Promise<boolean> {
  if (!canEdit.value) {
    return false
  }
  try {
    await $api(`/score-template-matrices/${sheetKey}`, {
      method: 'PUT',
      body: { lines },
    })
    toast.success('Plantilla guardada')
    return true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const msg = err?.data?.message
      ?? (err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null)
      ?? 'Error al guardar'
    toast.error(msg)
    return false
  }
}

function onUpdateIndep(updated: ScoreMatrixLine[]) {
  linesIndep.value = updated
}

function onUpdateEmp(updated: ScoreMatrixLine[]) {
  linesEmp.value = updated
}

function startEditIndep() {
  if (!canEdit.value) {
    return
  }
  snapshotIndep.value = cloneLines(linesIndep.value)
  isEditingIndep.value = true
}

function startEditEmp() {
  if (!canEdit.value) {
    return
  }
  snapshotEmp.value = cloneLines(linesEmp.value)
  isEditingEmp.value = true
}

function cancelEditIndep() {
  if (snapshotIndep.value) {
    linesIndep.value = cloneLines(snapshotIndep.value)
  }
  snapshotIndep.value = null
  isEditingIndep.value = false
}

function cancelEditEmp() {
  if (snapshotEmp.value) {
    linesEmp.value = cloneLines(snapshotEmp.value)
  }
  snapshotEmp.value = null
  isEditingEmp.value = false
}

async function commitEditIndep() {
  if (!canEdit.value || savingIndep.value) {
    return
  }
  savingIndep.value = true
  try {
    const ok = await saveSheet('independiente', linesIndep.value)
    if (ok) {
      snapshotIndep.value = null
      isEditingIndep.value = false
    }
  } finally {
    savingIndep.value = false
  }
}

async function commitEditEmp() {
  if (!canEdit.value || savingEmp.value) {
    return
  }
  savingEmp.value = true
  try {
    const ok = await saveSheet('empleado_pensionado', linesEmp.value)
    if (ok) {
      snapshotEmp.value = null
      isEditingEmp.value = false
    }
  } finally {
    savingEmp.value = false
  }
}

onMounted(() => {
  fetchMatrices()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Parametrización</span>
          <Icon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 opacity-60" />
          <span class="text-foreground">Plantilla Score</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight">
          Plantilla Score
        </h2>
        <p class="max-w-3xl text-muted-foreground text-sm">
          Matrices de pesos, rangos y puntajes (total referencia 1000) alineadas al Excel de análisis.
          Los valores iniciales provienen de la base de datos (seeder en despliegue). Use <span class="font-medium text-foreground">Editar plantilla</span> para cambiar pesos y puntajes; los cambios se envían al servidor al pulsar <span class="font-medium text-foreground">Guardar cambios</span>.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" as-child>
          <NuxtLink to="/parametrizacion/plantillas">
            <Icon name="i-lucide-layout-template" class="mr-2 h-4 w-4" />
            Plantillas
          </NuxtLink>
        </Button>
        <Button variant="outline" @click="router.push('/radicacion')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>

    <Separator class="mb-6" />

    <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
      Cargando matrices…
    </div>

    <Tabs v-else :default-value="defaultTab" class="w-full" :unmount-on-hide="false">
      <div class="overflow-x-auto pb-2">
        <TabsList
          class="inline-flex h-auto min-h-10 w-max flex-wrap justify-start gap-1 bg-muted p-1"
        >
          <TabsTrigger
            v-for="tab in SCORE_TEMPLATE_MATRIX_TABS"
            :key="tab.value"
            :value="tab.value"
            class="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="independiente" class="mt-4 w-full flex-none focus-visible:outline-none">
        <Card>
          <CardHeader class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1.5">
                <CardTitle class="text-base">
                  INDEPENDIENTE
                </CardTitle>
                <CardDescription>
                  Hoja Excel: <span class="font-mono">INDEPENDIENTE</span>
                  — Matriz de pesos, rangos y puntajes (total referencia 1000). Pesos 0–100 % por sección sin superar el 100 %; por sección la suma de los puntajes máximos por variable no puede superar el tope «Máx» (p. ej. 300 / 700).
                </CardDescription>
              </div>
              <div v-if="canEdit" class="flex flex-wrap items-center gap-2">
                <template v-if="!isEditingIndep">
                  <Button type="button" size="sm" variant="default" @click="startEditIndep">
                    <Icon name="i-lucide-pencil-line" class="mr-1.5 size-4" />
                    Editar plantilla
                  </Button>
                </template>
                <template v-else>
                  <Button type="button" size="sm" variant="outline" :disabled="savingIndep" @click="cancelEditIndep">
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" :disabled="savingIndep" @click="commitEditIndep">
                    <Icon
                      v-if="savingIndep"
                      name="i-lucide-loader-2"
                      class="mr-1.5 size-4 animate-spin"
                    />
                    <Icon v-else name="i-lucide-save" class="mr-1.5 size-4" />
                    Guardar cambios
                  </Button>
                </template>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AnalisisScoreMatrixTable
              key="score-matrix-independiente"
              sheet-title="INDEPENDIENTE"
              total-puntos="1000"
              :lines="linesIndep"
              :editable="canEdit && isEditingIndep"
              @update:lines="onUpdateIndep"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="empleado-pensionado" class="mt-4 w-full flex-none focus-visible:outline-none">
        <Card>
          <CardHeader class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1.5">
                <CardTitle class="text-base">
                  EMPLEADO y PENSIONADO
                </CardTitle>
                <CardDescription>
                  Hoja Excel: <span class="font-mono">EMPLEADO y PENSIONADO</span>
                  — Incluye tipo de contrato y antigüedad laboral (total referencia 1000). Mismas reglas que INDEPENDIENTE: pesos 0–100 % por sección y suma de puntajes máximos por variable acotada al «Máx» de cada sección.
                </CardDescription>
              </div>
              <div v-if="canEdit" class="flex flex-wrap items-center gap-2">
                <template v-if="!isEditingEmp">
                  <Button type="button" size="sm" variant="default" @click="startEditEmp">
                    <Icon name="i-lucide-pencil-line" class="mr-1.5 size-4" />
                    Editar plantilla
                  </Button>
                </template>
                <template v-else>
                  <Button type="button" size="sm" variant="outline" :disabled="savingEmp" @click="cancelEditEmp">
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" :disabled="savingEmp" @click="commitEditEmp">
                    <Icon
                      v-if="savingEmp"
                      name="i-lucide-loader-2"
                      class="mr-1.5 size-4 animate-spin"
                    />
                    <Icon v-else name="i-lucide-save" class="mr-1.5 size-4" />
                    Guardar cambios
                  </Button>
                </template>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AnalisisScoreMatrixTable
              key="score-matrix-empleado-pensionado"
              sheet-title="EMPLEADOS Y PENSIONADOS"
              total-puntos="1000"
              :lines="linesEmp"
              :editable="canEdit && isEditingEmp"
              @update:lines="onUpdateEmp"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
