<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="cn('flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end sm:gap-3', props.class)"
  >
    <slot />
  </div>
</template>
