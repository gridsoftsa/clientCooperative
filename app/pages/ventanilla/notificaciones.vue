<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_ver',
})

const route = useRoute()

await navigateTo({
  path: '/notificaciones',
  query: {
    ...route.query,
    module: typeof route.query.module === 'string' ? route.query.module : 'ventanilla',
  },
  replace: true,
})
</script>

<template>
  <div />
</template>
