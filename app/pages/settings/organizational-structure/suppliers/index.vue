<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})
</script>

<template>
  <SettingsLayout :wide="true">
    <TalentPartyList
      kind="supplier"
      manage-permission="estructura_org_editar"
    />
  </SettingsLayout>
</template>
