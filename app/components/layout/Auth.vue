<script setup lang="ts">
defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex items-center justify-center px-4 h-dvh lg:max-w-none lg:px-0"
    :class="{ 'flex-row-reverse': reverse }"
  >
    <div class="relative hidden h-full flex-1 flex-col overflow-hidden rounded-r-2xl bg-muted p-10 text-white lg:flex dark:border-r">
      <img
        src="/images/Imagen-home.jpg"
        alt="Cooperativa"
        class="absolute inset-0 h-full w-full rounded-r-2xl object-cover object-center"
      />
      <div class="absolute inset-0 rounded-r-2xl bg-zinc-900/40" aria-hidden="true" />
      <div class="relative z-20 mt-auto">
        <blockquote class="space-y-2">
          <p class="text-lg">
            &ldquo;This library has saved me countless hours of work and
            helped me deliver stunning designs to my clients faster than
            ever before.&rdquo;
          </p>
          <footer class="text-sm">
            Sofia Davis
          </footer>
        </blockquote>
      </div>
    </div>
    <div class="mx-auto flex-1 lg:p-8">
      <slot />
    </div>
  </div>
</template>

<style scoped>

</style>
