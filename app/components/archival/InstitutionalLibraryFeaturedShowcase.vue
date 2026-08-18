<script setup lang="ts">
import type { InstitutionalLibraryDocument } from '~/types/institutional-library'

const props = defineProps<{
  documents: InstitutionalLibraryDocument[]
}>()

const emit = defineEmits<{
  'view-document': [document: InstitutionalLibraryDocument]
}>()

const activeIndex = ref(0)

const hasMultiple = computed(() => props.documents.length > 1)

watch(
  () => props.documents.map(document => document.id),
  () => {
    activeIndex.value = 0
  },
)

function circularOffset(index: number): number {
  const len = props.documents.length
  if (len <= 1) {
    return 0
  }

  let offset = index - activeIndex.value
  if (offset > len / 2) {
    offset -= len
  }
  if (offset < -len / 2) {
    offset += len
  }

  return offset
}

function slideStyle(index: number) {
  const offset = circularOffset(index)
  const abs = Math.abs(offset)

  if (abs > 2) {
    return {
      opacity: 0,
      transform: 'scale(0.65) translateX(0)',
      zIndex: 0,
      pointerEvents: 'none' as const,
    }
  }

  const scale = offset === 0 ? 1 : abs === 1 ? 0.88 : 0.76
  const translateX = offset * 14

  return {
    opacity: offset === 0 ? 1 : 0.72,
    transform: `scale(${scale}) translateX(${translateX}%)`,
    zIndex: 10 - abs,
  }
}

function goPrev() {
  const len = props.documents.length
  activeIndex.value = (activeIndex.value - 1 + len) % len
}

function goNext() {
  const len = props.documents.length
  activeIndex.value = (activeIndex.value + 1) % len
}

function selectSlide(index: number) {
  activeIndex.value = index
}
</script>

<template>
  <section class="space-y-4">
    <div
      v-if="!hasMultiple"
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-sky-700 px-6 py-8 text-primary-foreground shadow-lg sm:px-8 sm:py-10"
    >
      <ArchivalInstitutionalLibraryFeaturedBannerContent
        :document="documents[0]"
        @view-document="emit('view-document', $event)"
      />
    </div>

    <div v-else class="relative">
      <div class="flex items-center justify-center gap-2 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-10 shrink-0 rounded-full bg-background shadow-sm"
          aria-label="Documento destacado anterior"
          @click="goPrev"
        >
          <Icon name="i-lucide-chevron-left" class="size-5" />
        </Button>

        <div class="relative flex min-h-[16rem] w-full max-w-4xl items-center justify-center overflow-hidden px-2 sm:min-h-[18rem]">
          <article
            v-for="(document, index) in documents"
            :key="document.id"
            class="absolute inset-x-4 top-0 bottom-0 mx-auto w-full max-w-3xl transition-all duration-300 ease-out sm:inset-x-8"
            :style="slideStyle(index)"
            @click="selectSlide(index)"
          >
            <div
              class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-sky-700 px-5 py-7 text-primary-foreground shadow-lg sm:px-7 sm:py-8"
              :class="circularOffset(index) === 0 ? 'cursor-default' : 'cursor-pointer'"
            >
              <ArchivalInstitutionalLibraryFeaturedBannerContent
                :document="document"
                compact
                @view-document="emit('view-document', $event)"
              />
            </div>
          </article>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-10 shrink-0 rounded-full bg-background shadow-sm"
          aria-label="Siguiente documento destacado"
          @click="goNext"
        >
          <Icon name="i-lucide-chevron-right" class="size-5" />
        </Button>
      </div>

      <div class="mt-4 flex justify-center gap-2">
        <button
          v-for="(document, index) in documents"
          :key="`dot-${document.id}`"
          type="button"
          class="size-2.5 rounded-full transition-colors"
          :class="index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/35 hover:bg-muted-foreground/55'"
          :aria-label="`Ver destacado ${index + 1}`"
          @click="selectSlide(index)"
        />
      </div>
    </div>
  </section>
</template>
