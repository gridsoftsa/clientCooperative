<script setup lang="ts">
const props = defineProps<{
  responseText: string
  closedAt?: string | null
  files?: Array<{
    id: number
    title: string
    original_name: string
  }>
}>()

const emit = defineEmits<{
  viewFile: [id: number]
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
    <ul v-if="props.files?.length" class="mt-3 space-y-2">
      <li
        v-for="file in props.files"
        :key="file.id"
        class="flex items-center justify-between gap-3 rounded-lg border border-emerald-200/80 bg-background/70 px-3 py-2 dark:border-emerald-900"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium">
            {{ file.title || file.original_name }}
          </p>
          <p v-if="file.original_name && file.original_name !== file.title" class="text-muted-foreground truncate text-xs">
            {{ file.original_name }}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="shrink-0"
          @click="emit('viewFile', file.id)"
        >
          <Icon name="i-lucide-eye" class="mr-1 size-4" />
          Ver
        </Button>
      </li>
    </ul>
    <p
      v-if="props.closedAt"
      class="mt-2 text-xs text-muted-foreground"
    >
      Cerrado el {{ formatDate(props.closedAt) }}
    </p>
  </div>
</template>
