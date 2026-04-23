<script setup lang="ts">
import type { FormFieldSchema } from '~/types/credits'

defineProps<{
  field: FormFieldSchema
  forId: string
  showReadOnlyBadge: boolean
}>()
</script>

<template>
  <Label
    v-if="field.label"
    :for="forId"
    class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium"
  >
    <span>{{ field.label }}</span>
    <span
      v-if="field.meta"
      class="text-muted-foreground font-normal"
    >({{ field.meta }})</span>
    <span
      v-if="showReadOnlyBadge"
      class="inline-flex items-center gap-0.5 rounded-md border border-amber-600/40 bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/55 dark:text-amber-100"
    >
      <Icon name="i-lucide-lock" class="size-3 shrink-0 opacity-90" aria-hidden="true" />
      Solo lectura
    </span>
  </Label>
</template>
