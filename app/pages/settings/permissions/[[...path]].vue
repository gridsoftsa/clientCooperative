<script setup lang="ts">
/**
 * La gestión de permisos en UI quedó deshabilitada: se definen en código/migraciones
 * y se asignan a roles. Cualquier ruta bajo /settings/permissions redirige a Roles.
 */
definePageMeta({
  layout: 'default',
})

await navigateTo('/settings/roles', { replace: true, external: false })
</script>

<template>
  <div class="p-4 text-sm text-muted-foreground">
    Redirigiendo a roles…
  </div>
</template>
