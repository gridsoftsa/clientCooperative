<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const route = useRoute()

await navigateTo(`/settings/organizational-structure/suppliers/${route.params.id}`, { replace: true })
</script>

<template>
  <div />
</template>
