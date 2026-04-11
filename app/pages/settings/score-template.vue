<script setup lang="ts">
/**
 * Ruta histórica: redirige a la vista directa de parametrización.
 */
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver',
})

await navigateTo('/parametrizacion/plantilla-score', { replace: true })
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
