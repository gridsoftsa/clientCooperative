<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'cuenta_ver',
})
</script>

<template>
  <SettingsLayout>
    <SettingsAccountForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
