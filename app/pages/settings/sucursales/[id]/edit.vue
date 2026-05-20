<script setup lang="ts">
const route = useRoute()
const { $api } = useNuxtApp()

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'sucursales_editar'],
})

onMounted(async () => {
  const sid = String(route.params.id)
  try {
    const res = await $api<{ data: { org_office_id?: number | null } }>(`/sucursales/${sid}`)
    const oid = res.data?.org_office_id
    if (oid != null && oid > 0) {
      await navigateTo(`/settings/organizational-structure/offices/${oid}/edit`, { replace: true })
    }
    else {
      await navigateTo('/settings/organizational-structure/offices', { replace: true })
    }
  }
  catch {
    await navigateTo('/settings/organizational-structure/offices', { replace: true })
  }
})
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
