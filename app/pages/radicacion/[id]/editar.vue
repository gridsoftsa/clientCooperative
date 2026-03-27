<script setup lang="ts">
/**
 * Compatibilidad: rutas antiguas /radicacion/:id/editar → /radicacion/editar/:id
 * (evita conflictos de enrutamiento y asegura que siempre cargue el editor correcto).
 */
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['radicacion_crear', 'radicacion_editar'],
})

const route = useRoute()
const rawId = route.params.id
const id = Array.isArray(rawId) ? rawId[0] : rawId
if (id != null && String(id).length) {
  await navigateTo(`/radicacion/editar/${String(id)}`, { replace: true })
} else {
  await navigateTo('/radicacion', { replace: true })
}
</script>

<template>
  <div class="flex min-h-[40vh] items-center justify-center">
    <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
  </div>
</template>
