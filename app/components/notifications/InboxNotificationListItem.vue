<script setup lang="ts">
withDefaults(defineProps<{
  unread?: boolean
}>(), {
  unread: false,
})
</script>

<template>
  <li
    class="relative cursor-pointer py-3 pr-4 pl-4 transition-colors hover:bg-muted/50"
    :class="unread ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/40'"
  >
    <span
      v-if="unread"
      class="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary"
      aria-hidden="true"
    />
    <div class="flex items-start gap-3">
      <span
        class="mt-1.5 size-2.5 shrink-0 rounded-full"
        :class="unread ? 'bg-primary ring-2 ring-primary/25' : 'bg-muted-foreground/25'"
        :aria-label="unread ? 'Sin leer' : 'Leída'"
      />
      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </li>
</template>
