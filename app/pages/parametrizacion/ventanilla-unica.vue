<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_configurar|plantillas_ver',
})
</script>

<template>
  <ParametrizacionVentanillaUnicaParametrizacionView
    page-title="Ventanilla única"
    page-description="Catálogos del formulario de radicación: tipo funcional y medio de recepción. Los valores activos se muestran en el campo correspondiente de Nuevo radicado."
    breadcrumb-label="Ventanilla única"
    :sister-link="{ to: '/parametrizacion/estructura', label: 'Estructura' }"
    back-to="/ventanilla/nueva"
  />
</template>
