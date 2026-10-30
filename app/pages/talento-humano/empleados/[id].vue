<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'talento_ver',
})

const route = useRoute()
const partyId = computed(() => Number(route.params.id))
</script>

<template>
  <TalentPartyDetail
    kind="employee"
    :party-id="partyId"
  />
</template>
