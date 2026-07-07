<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  viewUrl: string | null
  mimeType?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isPdf = computed(() => (props.mimeType ?? '').includes('pdf'))
const isImage = computed(() => (props.mimeType ?? '').startsWith('image/'))
const canEmbed = computed(() => isPdf.value || isImage.value)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] max-w-4xl overflow-hidden">
      <DialogHeader>
        <DialogTitle class="truncate pr-8">
          {{ title }}
        </DialogTitle>
        <DialogDescription>
          Vista previa del documento.
        </DialogDescription>
      </DialogHeader>

      <div v-if="!viewUrl" class="py-12 text-center text-sm text-muted-foreground">
        No se pudo cargar la vista previa.
      </div>
      <div v-else-if="!canEmbed" class="space-y-3 py-6 text-center text-sm text-muted-foreground">
        <p>Este tipo de archivo no admite vista previa en el navegador.</p>
        <a
          :href="viewUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          Abrir en nueva pestaña
        </a>
      </div>
      <div v-else class="max-h-[70vh] overflow-auto rounded-md border bg-muted/20">
        <iframe
          v-if="isPdf"
          :src="viewUrl"
          class="h-[70vh] w-full"
          title="Vista previa PDF"
        />
        <img
          v-else-if="isImage"
          :src="viewUrl"
          :alt="title"
          class="mx-auto max-h-[70vh] w-auto object-contain p-4"
        >
      </div>
    </DialogContent>
  </Dialog>
</template>
