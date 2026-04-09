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
  ANALISIS_SCORE_IMPRIMIR_TABS,
  ANALISIS_SCORE_PERFIL_OPTIONS,
  type AnalisisScorePerfilValue,
} from '~/constants/analisis-score'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['radicacion_crear', 'radicacion_editar', 'radicacion_ver'],
})

const route = useRoute()
const router = useRouter()
const { hasPermission } = usePermissions()

const solicitudId = computed(() => {
  const q = route.query.solicitud
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
})

const perfilesSeleccionados = ref<AnalisisScorePerfilValue[]>([])
const perfilPopoverOpen = ref(false)

function togglePerfil(value: AnalisisScorePerfilValue, checked: boolean) {
  const set = new Set(perfilesSeleccionados.value)
  if (checked) {
    set.add(value)
  } else {
    set.delete(value)
  }
  perfilesSeleccionados.value = Array.from(set)
}

function isPerfilChecked(value: AnalisisScorePerfilValue): boolean {
  return perfilesSeleccionados.value.includes(value)
}

const perfilTriggerLabel = computed(() => {
  if (perfilesSeleccionados.value.length === 0) {
    return 'Selecciona uno o más perfiles…'
  }
  return perfilesSeleccionados.value
    .map((v) => ANALISIS_SCORE_PERFIL_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ')
})

const defaultTab = ANALISIS_SCORE_IMPRIMIR_TABS[0]?.value ?? 'imprimir-independiente'
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
          Selección múltiple: independiente, empleado y/o pensionado (según aplique al análisis).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Label class="text-sm font-medium">Perfiles</Label>
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
            <p class="mb-2 text-xs font-medium text-muted-foreground">
              Marca todos los que apliquen
            </p>
            <div class="space-y-3">
              <div
                v-for="opt in ANALISIS_SCORE_PERFIL_OPTIONS"
                :key="opt.value"
                class="flex items-center gap-2"
              >
                <Checkbox
                  :id="`perfil-${opt.value}`"
                  :model-value="isPerfilChecked(opt.value)"
                  @update:model-value="(v) => togglePerfil(opt.value, v === true)"
                />
                <Label
                  :for="`perfil-${opt.value}`"
                  class="cursor-pointer text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {{ opt.label }}
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>

    <Tabs :default-value="defaultTab" class="w-full" :unmount-on-hide="false">
      <div class="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList
          class="inline-flex h-auto min-h-10 w-max flex-wrap justify-start gap-1 bg-muted p-1"
        >
          <TabsTrigger
            v-for="tab in ANALISIS_SCORE_IMPRIMIR_TABS"
            :key="tab.value"
            :value="tab.value"
            class="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="imprimir-independiente" class="mt-4 w-full flex-none focus-visible:outline-none">
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
              variant="independiente"
              :meta="IMPRIMIR_INDEPENDIENTE_META"
              :variable-rows="IMPRIMIR_INDEPENDIENTE_VARIABLES"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="imprimir-empleado-pensionado" class="mt-4 w-full flex-none focus-visible:outline-none">
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
              variant="empleado"
              :meta="IMPRIMIR_EMPLEADO_META"
              :variable-rows="IMPRIMIR_EMPLEADO_VARIABLES"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
