<script setup lang="ts">
withDefaults(defineProps<{
  unread?: boolean
}>(), {
  unread: false,
})
</script>

<template>
  <li
    class="group relative cursor-pointer rounded-xl border px-4 py-3.5 transition-colors"
    :class="unread
      ? 'border-primary/20 bg-primary/10 hover:bg-primary/[0.14]'
      : 'border-transparent bg-card hover:border-border hover:bg-muted/40'"
  >
    <span
      v-if="unread"
      class="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <slot />
    </div>
  </li>
</template>
