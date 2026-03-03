<script setup lang="ts">
const showButton = ref(false)

function onScroll() {
  showButton.value = window.scrollY > 400
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Transition name="scroll-fade">
    <Button
      v-show="showButton"
      type="button"
      variant="secondary"
      size="icon"
      class="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full shadow-lg ring-1 ring-border hover:ring-primary/50 transition-all"
      aria-label="Ir arriba"
      @click="scrollToTop"
    >
      <Icon name="i-lucide-arrow-up" class="h-5 w-5" />
    </Button>
  </Transition>
</template>

<style scoped>
.scroll-fade-enter-active,
.scroll-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scroll-fade-enter-from,
.scroll-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
