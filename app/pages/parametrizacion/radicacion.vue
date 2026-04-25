<script setup lang="ts">
import { sectorsForParametrizacionRadicacion } from '~/constants/credits-financial-templates'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver',
})

const sectors = sectorsForParametrizacionRadicacion()
</script>

<template>
  <ParametrizacionTemplateParametrizacionPlanoView
    :sectors="sectors"
    page-title="Radicación (catálogos del formulario)"
    page-description="Género, tipo de documento, vivienda, actividad económica y estado civil del solicitante. Misma parametrización plana que antes, separada de las plantillas de actividad."
    breadcrumb-label="Radicación"
    :show-categories-tab="false"
    :sister-link="{ to: '/parametrizacion/plantillas', label: 'Plantillas' }"
    back-to="/radicacion"
  />
</template>
