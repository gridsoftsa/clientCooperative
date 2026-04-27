<script setup lang="ts">
definePageMeta({
  middleware: [
    () => navigateTo('/settings/profile'),
  ],
})
</script>

<template>
  <SettingsLayout>
    <SettingsNotificationsForm />
  </SettingsLayout>
</template>

<style scoped>

</style>
