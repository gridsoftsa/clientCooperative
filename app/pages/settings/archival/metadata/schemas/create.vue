<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_metadatos_ver',
})

await navigateTo('/settings/archival/metadata/schemas', { replace: true })
</script>

<template>
  <div />
</template>
