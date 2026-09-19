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
  () => props.documents.map(document => document.id).join(','),
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
      transform: 'translate(-50%, -50%) scale(0.55)',
      zIndex: 0,
      pointerEvents: 'none' as const,
    }
  }

  const x = offset * 7.4
  const scale = offset === 0 ? 1.14 : abs === 1 ? 0.9 : 0.72
  const rotateY = offset * -18

  return {
    opacity: offset === 0 ? 1 : abs === 1 ? 0.95 : 0.8,
    transform: `translate(-50%, -50%) translateX(${x}rem) rotateY(${rotateY}deg) scale(${scale})`,
    zIndex: 20 - abs,
  }
}

function faceClass(index: number): string {
  const abs = Math.abs(circularOffset(index))

  if (abs === 0) {
    return 'from-sky-400 via-sky-500 to-primary shadow-xl shadow-sky-500/25'
  }

  if (abs === 1) {
    return 'from-indigo-500 via-blue-600 to-blue-800 shadow-lg'
  }

  return 'from-teal-800 via-slate-800 to-slate-900 shadow-md'
}

function goPrev() {
  if (!hasMultiple.value) {
    return
  }

  const len = props.documents.length
  activeIndex.value = (activeIndex.value - 1 + len) % len
}

function goNext() {
  if (!hasMultiple.value) {
    return
  }

  const len = props.documents.length
  activeIndex.value = (activeIndex.value + 1) % len
}

function selectSlide(index: number) {
  if (index === activeIndex.value) {
    return
  }

  activeIndex.value = index
}

function openActive(document: InstitutionalLibraryDocument, index: number) {
  if (circularOffset(index) !== 0) {
    selectSlide(index)
    return
  }

  emit('view-document', document)
}

function formatDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString('es-CO')
}

function onCarouselKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  }
}
</script>

<template>
  <section class="space-y-3" aria-roledescription="carrusel" aria-label="Documentos destacados">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      Destacados
    </h2>

    <div
      class="relative overflow-hidden rounded-3xl bg-teal-950/20 px-2 py-8 sm:px-6 sm:py-10 dark:bg-teal-950/35"
      tabindex="0"
      @keydown="onCarouselKeydown"
    >
      <div class="flex items-center justify-center gap-1 sm:gap-3">
        <Button
          v-if="hasMultiple"
          type="button"
          size="icon"
          class="z-30 size-11 shrink-0 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 hover:text-white"
          aria-label="Documento destacado anterior"
          @click="goPrev"
        >
          <Icon name="i-lucide-chevron-left" class="size-5" />
        </Button>

        <div
          class="relative h-[17.5rem] w-full max-w-5xl sm:h-[20rem]"
          style="perspective: 1100px"
        >
          <article
            v-for="(document, index) in documents"
            :key="document.id"
            class="absolute top-1/2 left-1/2 w-[11.25rem] origin-center cursor-pointer rounded-2xl bg-gradient-to-br p-4 text-white transition-all duration-300 ease-out sm:w-[13.5rem] sm:p-5"
            :class="[
              faceClass(index),
              circularOffset(index) === 0 ? 'h-[15.5rem] sm:h-[17.75rem]' : 'h-[13.5rem] sm:h-[15.5rem]',
            ]"
            :style="slideStyle(index)"
            @click="openActive(document, index)"
          >
            <div class="flex h-full flex-col">
              <Badge
                v-if="circularOffset(index) === 0"
                class="w-fit bg-white/20 text-white hover:bg-white/20"
              >
                Destacado
              </Badge>

              <div
                class="flex min-h-0 flex-1 flex-col"
                :class="circularOffset(index) === 0 ? 'mt-3 justify-between' : 'justify-center'"
              >
                <h3
                  class="font-semibold tracking-tight"
                  :class="circularOffset(index) === 0
                    ? 'line-clamp-3 text-lg leading-snug sm:text-xl'
                    : 'line-clamp-4 text-center text-xl leading-tight sm:text-2xl'"
                >
                  {{ document.title }}
                </h3>

                <div v-if="circularOffset(index) === 0" class="mt-3 space-y-3">
                  <p class="text-xs text-white/80">
                    Versión {{ document.version_number }}
                    <span v-if="document.effective_from">
                      · Vigente desde {{ formatDate(document.effective_from) }}
                    </span>
                  </p>
                  <p v-if="document.org_unit" class="text-xs text-white/70">
                    {{ document.org_unit.name }}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    class="bg-white text-primary hover:bg-white/90"
                    @click.stop="emit('view-document', document)"
                  >
                    Ver documento
                  </Button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <Button
          v-if="hasMultiple"
          type="button"
          size="icon"
          class="z-30 size-11 shrink-0 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 hover:text-white"
          aria-label="Siguiente documento destacado"
          @click="goNext"
        >
          <Icon name="i-lucide-chevron-right" class="size-5" />
        </Button>
      </div>

      <div v-if="hasMultiple" class="mt-6 flex justify-center gap-2">
        <button
          v-for="(document, index) in documents"
          :key="`dot-${document.id}`"
          type="button"
          class="size-2.5 rounded-full transition-colors"
          :class="index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'"
          :aria-label="`Ver destacado ${index + 1}`"
          @click="selectSlide(index)"
        />
      </div>
    </div>
  </section>
</template>
