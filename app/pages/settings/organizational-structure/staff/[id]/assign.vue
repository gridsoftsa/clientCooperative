<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const route = useRoute()

onMounted(() => {
  const id = route.params.id
  navigateTo(
    {
      path: `/settings/organizational-structure/staff/${id}/edit`,
      query: { tab: 'ubicacion' },
    },
    { replace: true },
  )
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex justify-center py-16 text-muted-foreground">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin" />
    </div>
  </SettingsLayout>
</template>
