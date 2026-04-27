<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'apariencia_ver',
})
</script>

<template>
  <SettingsLayout>
    <SettingsAppearanceForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
