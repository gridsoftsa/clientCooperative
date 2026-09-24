<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_configurar|plantillas_ver|workflow_tipos_funcionales_parametrizar',
})
</script>

<template>
  <ParametrizacionVentanillaUnicaParametrizacionView
    page-title="Ventanilla única"
    page-description="Opciones que aparecen al crear un radicado: el tipo de trámite y cómo llegó el documento."
    breadcrumb-label="Ventanilla única"
    :sister-link="{ to: '/parametrizacion/estructura', label: 'Estructura' }"
    back-to="/ventanilla/nueva"
  />
</template>
