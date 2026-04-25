<script setup lang="ts">
import { sectorsForParametrizacionPlantillas } from '~/constants/credits-financial-templates'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver',
})

const sectors = sectorsForParametrizacionPlantillas()
</script>

<template>
  <ParametrizacionTemplateParametrizacionPlanoView
    :sectors="sectors"
    page-title="Plantillas (actividades)"
    page-description="Configuración de datos planos por sector y plantilla (agro, comercial, transporte, etc.). Usa la pestaña de categorías para cultivos con varios productos. Los catálogos del formulario de radicación están en la vista Radicación."
    breadcrumb-label="Plantillas"
    :show-categories-tab="true"
    :sister-link="{ to: '/parametrizacion/radicacion', label: 'Radicación' }"
    back-to="/radicacion"
  />
</template>
