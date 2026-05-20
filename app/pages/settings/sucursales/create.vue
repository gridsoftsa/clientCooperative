<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'sucursales_crear'],
})

await navigateTo('/settings/organizational-structure/offices/create', { replace: true })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirigiendo…
  </div>
</template>
