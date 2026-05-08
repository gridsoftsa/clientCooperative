<script setup lang="ts">
/**
 * Contenedor de páginas bajo /settings/*.
 * La navegación lateral duplicada se eliminó: usa solo el menú principal (AppSidebar).
 */
withDefaults(
  defineProps<{
    /** Si true, el contenido usa todo el ancho disponible (sin max-w-2xl) */
    wide?: boolean
  }>(),
  { wide: false },
)
</script>

<template>
  <div class="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-16 pt-1 sm:px-6 lg:px-8">
    <div class="space-y-0.5">
      <h2 class="text-2xl font-bold tracking-tight">
        Configuración
      </h2>
      <p class="text-muted-foreground">
        Perfil, preferencias y administración de la cooperativa en un solo lugar.
      </p>
    </div>
    <Separator class="my-6" />
    <div
      class="min-w-0 w-full"
      :class="wide ? '' : 'mx-auto max-w-2xl'"
    >
      <div class="space-y-6">
        <slot />
      </div>
    </div>
  </div>
</template>
