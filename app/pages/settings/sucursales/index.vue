<script setup lang="ts">
/**
 * Las sedes operativas se administran en Estructura → Agencias (misma API y datos).
 * Radicación y usuarios siguen usando `sucursal_id` en backend; esta ruta evita pantallas duplicadas.
 */
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_ver', 'sucursales_ver'],
})

await navigateTo('/settings/organizational-structure/offices', { replace: true })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirigiendo a Agencias…
  </div>
</template>
