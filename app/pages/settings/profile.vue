<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'perfil_ver',
})
</script>

<template>
  <SettingsLayout>
    <SettingsProfileForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
