<script setup lang="ts">
/**
 * Ruta histórica: /admin → /settings
 */
await navigateTo('/settings', { replace: true })
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
