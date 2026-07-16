<script setup lang="ts">
import type { InstitutionalLibraryDocument } from '~/types/institutional-library'

const props = defineProps<{
  document: InstitutionalLibraryDocument
  canDownload?: boolean
}>()

const emit = defineEmits<{
  view: [document: InstitutionalLibraryDocument]
  download: [document: InstitutionalLibraryDocument]
}>()

const archivalApi = useArchivalFileApi()

const categoryIcon = computed(() => {
  switch (props.document.institutional_category) {
    case 'policies': return 'i-lucide-shield'
    case 'procedures': return 'i-lucide-list-checks'
    case 'manuals': return 'i-lucide-book-open'
    case 'forms': return 'i-lucide-file-input'
    case 'instructions': return 'i-lucide-lightbulb'
    case 'regulations': return 'i-lucide-scale'
    case 'guidelines': return 'i-lucide-compass'
    default: return 'i-lucide-file-text'
  }
})

const downloadHref = computed(() => {
  if (!props.canDownload) {
    return null
  }

  return archivalApi.documentDownloadUrl(props.document.archival_file_id, props.document.id)
})

function formatDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString('es-CO')
}
</script>

<template>
  <Card class="flex h-full flex-col transition-shadow hover:shadow-md">
    <CardHeader class="space-y-3 pb-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon :name="categoryIcon" class="size-5" />
        </div>
        <Badge v-if="document.is_effective !== false" variant="secondary" class="bg-emerald-50 text-emerald-700">
          Vigente
        </Badge>
      </div>
      <div>
        <CardTitle class="line-clamp-2 text-base leading-snug">
          {{ document.title }}
        </CardTitle>
        <CardDescription class="mt-1">
          Versión {{ document.version_number }}
          <span v-if="document.effective_from"> · Vigente desde {{ formatDate(document.effective_from) }}</span>
        </CardDescription>
      </div>
    </CardHeader>

    <CardContent class="mt-auto space-y-3 pt-0">
      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge v-if="document.institutional_category_label" variant="outline">
          {{ document.institutional_category_label }}
        </Badge>
        <span v-if="document.org_unit">{{ document.org_unit.name }}</span>
      </div>

      <div class="flex items-center gap-1 border-t pt-3">
        <Button variant="ghost" size="sm" class="h-8 px-2" type="button" @click="emit('view', document)">
          <Icon name="i-lucide-eye" class="mr-1 size-4" />
          Ver
        </Button>
        <a
          v-if="downloadHref"
          :href="downloadHref"
          class="inline-flex h-8 items-center px-2 text-sm text-primary hover:underline"
        >
          <Icon name="i-lucide-download" class="mr-1 size-4" />
          Descargar
        </a>
      </div>
    </CardContent>
  </Card>
</template>
