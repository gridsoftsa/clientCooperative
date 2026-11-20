<script setup lang="ts">
/** Ruta antigua: redirige a /asociados/:id/archivo */
const route = useRoute()
const id = route.params.id as string
await navigateTo(`/asociados/${id}/archivo`, { replace: true, redirectCode: 301 })
</script>

<template>
  <div />
</template>
