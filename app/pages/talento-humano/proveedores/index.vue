<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

await navigateTo('/settings/organizational-structure/suppliers', { replace: true })
</script>

<template>
  <div />
</template>
