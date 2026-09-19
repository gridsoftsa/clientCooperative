<script setup lang="ts">
import type { InstitutionalLibraryDocument } from '~/types/institutional-library'
import { institutionalLibraryCategoryIcon } from '~/utils/institutional-library-category'

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

function documentIcon(document: InstitutionalLibraryDocument): string {
  return institutionalLibraryCategoryIcon(document.institutional_category_icon)
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
            class="absolute top-1/2 left-1/2 w-[11.25rem] origin-center cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white transition-all duration-300 ease-out sm:w-[13.5rem] sm:p-5"
            :class="[
              faceClass(index),
              circularOffset(index) === 0 ? 'h-[15.5rem] sm:h-[17.75rem]' : 'h-[13.5rem] sm:h-[15.5rem]',
            ]"
            :style="slideStyle(index)"
            @click="openActive(document, index)"
          >
            <Icon
              name="i-lucide-sparkles"
              class="pointer-events-none absolute -right-3 -top-2 size-16 text-white/15 sm:size-20"
            />
            <Icon
              :name="documentIcon(document)"
              class="pointer-events-none absolute -bottom-4 -right-3 size-24 text-white/10 sm:size-28"
            />

            <div class="relative z-10 flex h-full flex-col">
              <div
                class="flex"
                :class="circularOffset(index) === 0 ? 'items-start justify-between gap-2' : 'justify-center'"
              >
                <div
                  class="flex items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25 backdrop-blur-sm"
                  :class="circularOffset(index) === 0 ? 'size-12 sm:size-14' : 'size-14 sm:size-16'"
                >
                  <Icon
                    :name="documentIcon(document)"
                    class="text-white"
                    :class="circularOffset(index) === 0 ? 'size-6 sm:size-7' : 'size-7 sm:size-8'"
                  />
                </div>
                <Badge
                  v-if="circularOffset(index) === 0"
                  class="bg-white/20 text-white hover:bg-white/20"
                >
                  <Icon name="i-lucide-star" class="mr-1 size-3.5 fill-current" />
                  Destacado
                </Badge>
              </div>

              <div
                class="flex min-h-0 flex-1 flex-col"
                :class="circularOffset(index) === 0 ? 'mt-3 justify-between' : 'mt-4 justify-center'"
              >
                <div :class="circularOffset(index) === 0 ? '' : 'text-center'">
                  <p
                    v-if="circularOffset(index) !== 0 && document.institutional_category_label"
                    class="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/70"
                  >
                    {{ document.institutional_category_label }}
                  </p>
                  <h3
                    class="font-semibold tracking-tight"
                    :class="circularOffset(index) === 0
                      ? 'line-clamp-2 text-lg leading-snug sm:text-xl'
                      : 'line-clamp-3 text-lg leading-tight sm:text-xl'"
                  >
                    {{ document.title }}
                  </h3>
                </div>

                <div v-if="circularOffset(index) === 0" class="mt-3 space-y-3">
                  <p class="text-xs text-white/80">
                    Versión {{ document.version_number }}
                    <span v-if="document.effective_from">
                      · {{ formatDate(document.effective_from) }}
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
                    <Icon name="i-lucide-eye" class="mr-1.5 size-4" />
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
