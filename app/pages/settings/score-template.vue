<script setup lang="ts">
import AnalisisScoreMatrixTable from '~/components/radicacion/AnalisisScoreMatrixTable.vue'
import { EMPLEADO_PENSIONADO_MATRIX, INDEPENDIENTE_MATRIX } from '~/constants/analisis-score-matrix'
import { SCORE_TEMPLATE_MATRIX_TABS } from '~/constants/analisis-score'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissionsAll: ['settings_ver', 'plantillas_ver'],
})

const defaultTab = SCORE_TEMPLATE_MATRIX_TABS[0]?.value ?? 'independiente'
</script>

<template>
  <SettingsLayout wide>
    <div class="space-y-2">
      <h3 class="text-lg font-medium">
        Configurar plantilla Score
      </h3>
      <p class="text-muted-foreground text-sm">
        Matrices de pesos, rangos y puntajes (total referencia 1000) alineadas al Excel de análisis.
        Estas hojas definen la configuración que aplican las vistas «IMPRIMIR» en radicación.
      </p>
    </div>
    <Separator class="my-6" />

    <Tabs :default-value="defaultTab" class="w-full" :unmount-on-hide="false">
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
          <CardHeader>
            <CardTitle class="text-base">
              INDEPENDIENTE
            </CardTitle>
            <CardDescription>
              Hoja Excel: <span class="font-mono">INDEPENDIENTE</span>
              — Matriz de pesos, rangos y puntajes (total referencia 1000).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalisisScoreMatrixTable
              sheet-title="INDEPENDIENTE"
              total-puntos="1000"
              :lines="INDEPENDIENTE_MATRIX"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="empleado-pensionado" class="mt-4 w-full flex-none focus-visible:outline-none">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              EMPLEADO y PENSIONADO
            </CardTitle>
            <CardDescription>
              Hoja Excel: <span class="font-mono">EMPLEADO y PENSIONADO</span>
              — Incluye tipo de contrato y antigüedad laboral (total referencia 1000).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalisisScoreMatrixTable
              sheet-title="EMPLEADOS Y PENSIONADOS"
              total-puntos="1000"
              :lines="EMPLEADO_PENSIONADO_MATRIX"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </SettingsLayout>
</template>
