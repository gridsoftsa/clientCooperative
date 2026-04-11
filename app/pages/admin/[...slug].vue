<script setup lang="ts">
/**
 * Rutas históricas /admin/* → /settings/*
 */
const route = useRoute()
const slug = route.params.slug
const path = Array.isArray(slug) ? slug.join('/') : (slug ?? '')

await navigateTo(`/settings/${path}`, { replace: true })
</script>

<template>
  <div class="flex justify-center py-12 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
