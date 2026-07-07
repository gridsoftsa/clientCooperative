<script setup lang="ts">
import type { DocumentPreviewKind } from '~/utils/document-preview'

const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    title?: string
    loading?: boolean
    previewUrl?: string | null
    previewKind?: DocumentPreviewKind | null
  }>(),
  {
    title: 'Vista previa',
    loading: false,
    previewUrl: null,
    previewKind: null,
  },
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[min(92vh,920px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader class="shrink-0 border-b border-border px-5 py-4 text-left">
        <DialogTitle class="truncate pr-8 text-base">
          {{ title }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          Vista previa del documento adjunto
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-48 flex-1 overflow-auto bg-muted/20 p-4">
        <div
          v-if="loading"
          class="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
        >
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
          Cargando vista previa…
        </div>

        <iframe
          v-else-if="previewUrl && previewKind === 'pdf'"
          :src="previewUrl"
          :title="title"
          class="h-[min(72vh,760px)] w-full rounded-md border border-border bg-background"
        />

        <div
          v-else-if="previewUrl && previewKind === 'image'"
          class="flex min-h-[40vh] items-center justify-center"
        >
          <img
            :src="previewUrl"
            :alt="title"
            class="max-h-[min(72vh,760px)] max-w-full rounded-md border border-border bg-background object-contain shadow-sm"
          >
        </div>

        <div
          v-else-if="previewKind === 'zip'"
          class="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Icon name="i-lucide-file-archive" class="size-12 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            Los archivos ZIP no se pueden previsualizar aquí. Descárgalo o descomprímelo en tu equipo para revisarlo.
          </p>
        </div>

        <div
          v-else
          class="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Icon name="i-lucide-file-question" class="size-12 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            No hay vista previa disponible para este tipo de archivo.
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
