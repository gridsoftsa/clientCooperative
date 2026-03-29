<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'settings_ver',
})
</script>

<template>
  <SettingsLayout>
    <SettingsAppearanceForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
