<script setup lang="ts">
import { sectorsForParametrizacionRadicacion } from '~/constants/credits-financial-templates'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'radicacion_catalogos_ver',
})

const sectors = sectorsForParametrizacionRadicacion()
</script>

<template>
  <ParametrizacionTemplateParametrizacionPlanoView
    :sectors="sectors"
    page-title="Radicación (catálogos del formulario)"
    page-description="Catálogos del formulario: solicitante (género, documento, vivienda, actividad, estado civil, documentos auxiliares), aprobadores (niveles parametrizables) y Análisis y Score (bancos, ING)."
    breadcrumb-label="Radicación"
    :show-categories-tab="false"
    :sister-link="{ to: '/parametrizacion/plantillas', label: 'Plantillas' }"
    back-to="/radicacion"
  />
</template>
