<script setup lang="ts">
import type { InstitutionalLibraryDocument } from '~/types/institutional-library'

const props = defineProps<{
  document: InstitutionalLibraryDocument
  compact?: boolean
}>()

const emit = defineEmits<{
  'view-document': [document: InstitutionalLibraryDocument]
}>()

function formatDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString('es-CO')
}
</script>

<template>
  <div class="relative z-10 max-w-2xl space-y-4">
    <Badge class="bg-white/20 text-white hover:bg-white/20">
      Destacado
    </Badge>
    <div class="space-y-2">
      <h2
        class="font-semibold tracking-tight"
        :class="compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'"
      >
        {{ document.title }}
      </h2>
      <p class="text-sm text-primary-foreground/85">
        Versión {{ document.version_number }}
        <span v-if="document.effective_from"> · Vigente desde {{ formatDate(document.effective_from) }}</span>
        <span v-if="document.featured_until"> · Destacado hasta {{ formatDate(document.featured_until) }}</span>
      </p>
      <p v-if="document.org_unit" class="text-sm text-primary-foreground/75">
        {{ document.org_unit.name }}
      </p>
    </div>
    <Button
      variant="secondary"
      class="bg-white text-primary hover:bg-white/90"
      @click="emit('view-document', document)"
    >
      Ver documento
    </Button>
  </div>
  <div class="pointer-events-none absolute -right-6 -bottom-8 opacity-30 sm:right-4 sm:bottom-0 sm:opacity-40">
    <Icon name="i-lucide-shield-check" class="size-40 sm:size-52" />
  </div>
</template>
