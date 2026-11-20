<script setup lang="ts">
/** Ruta antigua: redirige a /asociados/:id/edit */
const route = useRoute()
const id = route.params.id as string
await navigateTo(`/asociados/${id}/edit`, { replace: true, redirectCode: 301 })
</script>

<template>
  <div />
</template>
