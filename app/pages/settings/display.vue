<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'display_ver',
})
</script>

<template>
  <SettingsLayout>
    <SettingsDisplayForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
