<script setup lang="ts">
definePageMeta({
  middleware: [
    () => navigateTo('/settings/profile', { replace: true }),
  ],
})
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
