<script setup lang="ts">
/** Ruta antigua: redirige a /solicitantes/:id/edit */
const route = useRoute()
const id = route.params.id as string
await navigateTo(`/solicitantes/${id}/edit`, { replace: true, redirectCode: 301 })
</script>

<template>
  <div />
</template>
