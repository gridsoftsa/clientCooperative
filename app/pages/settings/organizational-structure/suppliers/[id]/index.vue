<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const route = useRoute()
const partyId = computed(() => Number(route.params.id))
</script>

<template>
  <SettingsLayout :wide="true">
    <TalentPartyDetail
      kind="supplier"
      :party-id="partyId"
    />
  </SettingsLayout>
</template>
