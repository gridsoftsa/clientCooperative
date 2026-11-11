<script setup lang="ts">
/**
 * Contenedor de páginas bajo /settings/*.
 * La navegación lateral duplicada se eliminó: usa solo el menú principal (AppSidebar).
 */
withDefaults(
  defineProps<{
    /** Si true, el contenido usa todo el ancho disponible (sin max-w-2xl) */
    wide?: boolean
    /** Oculta el encabezado genérico «Configuración» cuando la página ya trae su título */
    hideIntro?: boolean
    /** Ocupa el alto disponible y deja el scroll en el contenido */
    fill?: boolean
  }>(),
  { wide: false, hideIntro: false, fill: false },
)
</script>

<template>
  <div
    class="mx-auto w-full max-w-[1600px] px-4 pt-1 sm:px-6 lg:px-8"
    :class="fill ? 'flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col overflow-hidden' : 'space-y-6 pb-16'"
  >
    <template v-if="!hideIntro">
      <div class="space-y-0.5">
        <h2 class="text-2xl font-bold tracking-tight">
          Configuración
        </h2>
        <p class="text-muted-foreground">
          Perfil, preferencias y administración de la cooperativa en un solo lugar.
        </p>
      </div>
      <Separator class="my-6" />
    </template>
    <div
      class="min-w-0 w-full"
      :class="[
        wide ? '' : 'mx-auto max-w-2xl',
        fill ? 'flex min-h-0 flex-1 flex-col' : '',
      ]"
    >
      <div :class="fill ? 'flex min-h-0 flex-1 flex-col' : 'space-y-6'">
        <slot />
      </div>
    </div>
  </div>
</template>
