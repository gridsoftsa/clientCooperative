<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_configurar|plantillas_ver',
})

await navigateTo('/parametrizacion/ventanilla-unica', { replace: true })
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
