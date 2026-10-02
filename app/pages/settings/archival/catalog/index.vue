<script setup lang="ts">
definePageMeta({
  middleware: [
    () => navigateTo('/settings/archival/catalog/series', { replace: true }),
  ],
})
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
