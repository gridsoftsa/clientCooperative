<script setup lang="ts">
/**
 * La sección Parametrización no tiene vista propia; el primer submenú es Plantillas.
 */
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'plantillas_ver',
})

await navigateTo('/parametrizacion/plantillas', { replace: true })
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
