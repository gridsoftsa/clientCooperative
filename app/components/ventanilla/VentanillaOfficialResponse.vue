<script setup lang="ts">
const props = defineProps<{
  responseText: string
  closedAt?: string | null
}>()

function formatDate(value?: string | null): string {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString('es-CO')
}
</script>

<template>
  <div class="rounded-xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
    <div class="flex items-center gap-2">
      <Icon
        name="i-lucide-message-square-reply"
        class="size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
      />
      <p class="text-xs font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-200">
        Respuesta oficial
      </p>
    </div>
    <p class="mt-2 whitespace-pre-wrap text-sm font-medium text-foreground">
      {{ props.responseText }}
    </p>
    <p
      v-if="props.closedAt"
      class="mt-2 text-xs text-muted-foreground"
    >
      Cerrado el {{ formatDate(props.closedAt) }}
    </p>
  </div>
</template>
