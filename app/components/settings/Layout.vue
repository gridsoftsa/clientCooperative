<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Si true, el contenido usa todo el ancho disponible (sin max-w-2xl) */
    wide?: boolean
  }>(),
  { wide: false },
)
</script>

<template>
  <div class="pb-16">
    <div class="min-w-0" :class="wide ? 'w-full' : 'max-w-2xl'">
      <slot />
    </div>
  </div>
</template>
