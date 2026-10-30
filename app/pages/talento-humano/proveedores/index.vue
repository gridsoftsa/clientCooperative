<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'talento_ver',
})
</script>

<template>
  <TalentPartyList kind="supplier" />
</template>
