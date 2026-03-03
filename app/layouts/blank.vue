<script setup lang="ts">
</script>

<template>
  <div>
    <slot />
    <ClientOnly>
      <ScrollToTop />
    </ClientOnly>
  </div>
</template>

<style scoped>

</style>
