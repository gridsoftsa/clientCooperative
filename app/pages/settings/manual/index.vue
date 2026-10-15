<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'manual_ver',
})

type ManualTable = {
  columns: string[]
  rows: string[][]
}

type ManualSection = {
  heading: string
  paragraphs: string[]
  items: string[]
  note: string | null
  table: ManualTable | null
}

type ManualChapter = {
  id: string
  number: string
  title: string
  lead: string
  sections: ManualSection[]
}

type ManualDocument = {
  title: string
  subtitle: string
  chapters: ManualChapter[]
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const document = ref<ManualDocument | null>(null)
const loading = ref(true)
const exporting = ref(false)
const error = ref('')
const activeChapterId = ref('')
const shell = ref<HTMLElement | null>(null)
const reader = ref<HTMLElement | null>(null)
let chapterObserver: IntersectionObserver | null = null

function fitShell() {
  const el = shell.value
  if (!el) {
    return
  }
  if (window.innerWidth < 1024) {
    el.style.height = ''
    return
  }
  const top = el.getBoundingClientRect().top
  el.style.height = `${Math.max(280, window.innerHeight - top - 16)}px`
}

function watchChapters() {
  chapterObserver?.disconnect()
  const root = reader.value
  if (!root) {
    return
  }
  chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    const id = visible?.target.id
    if (id) {
      activeChapterId.value = id
    }
  }, {
    root,
    rootMargin: '-8% 0px -55% 0px',
    threshold: [0.15, 0.4],
  })
  root.querySelectorAll('article[id]').forEach(article => chapterObserver?.observe(article))
}

async function loadManual() {
  loading.value = true
  error.value = ''
  try {
    const res = await $api<{ data: ManualDocument }>('/manual')
    document.value = res.data
    activeChapterId.value = res.data.chapters[0]?.id ?? ''
  }
  catch {
    error.value = 'No se pudo cargar el manual.'
  }
  finally {
    loading.value = false
    await nextTick()
    fitShell()
    watchChapters()
  }
}

async function exportPdf() {
  exporting.value = true
  error.value = ''
  try {
    await downloadReportFile('/manual/pdf', {}, 'manual-de-operacion.pdf', 'application/pdf')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo generar el PDF.'
  }
  finally {
    exporting.value = false
  }
}

function selectChapter(id: string) {
  activeChapterId.value = id
  const root = reader.value
  const target = root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (!root || !target) {
    return
  }
  const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
  root.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' })
}

onMounted(() => {
  loadManual()
  window.addEventListener('resize', fitShell)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitShell)
  chapterObserver?.disconnect()
})
</script>

<template>
  <SettingsLayout :wide="true" class="!pb-0">
    <div ref="shell" class="flex w-full min-w-0 flex-col gap-4 lg:overflow-hidden">
      <div class="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ document?.title || 'Manual de operación' }}
          </h2>
          <p class="max-w-3xl text-sm text-muted-foreground">
            {{ document?.subtitle || 'Qué hace cada módulo, quién lo usa y cómo recorre un crédito.' }}
          </p>
        </div>
        <Button class="shrink-0" :disabled="loading || exporting || !document" @click="exportPdf">
          <Icon name="i-lucide-file-down" class="mr-2 h-4 w-4" />
          {{ exporting ? 'Generando PDF…' : 'Exportar PDF' }}
        </Button>
      </div>

      <p v-if="error" class="text-sm text-destructive">
        {{ error }}
      </p>

      <p v-if="loading" class="text-sm text-muted-foreground">
        Cargando el manual…
      </p>

      <div v-else-if="document" class="grid min-h-0 min-w-0 gap-6 lg:flex-1 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:overflow-hidden">
        <nav class="rounded-lg border bg-card p-3 lg:min-h-0 lg:overflow-y-auto">
          <p class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Capítulos
          </p>
          <div class="flex flex-col gap-0.5">
            <a
              v-for="chapter in document.chapters"
              :key="chapter.id"
              href="#"
              class="rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted hover:text-foreground"
              :class="activeChapterId === chapter.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'"
              @click.prevent="selectChapter(chapter.id)"
            >
              {{ chapter.number }}. {{ chapter.title }}
            </a>
          </div>
        </nav>

        <div ref="reader" class="min-w-0 space-y-8 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <article
            v-for="chapter in document.chapters"
            :id="chapter.id"
            :key="chapter.id"
            class="scroll-mt-6 space-y-4 border-b pb-8 last:border-b-0"
          >
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Capítulo {{ chapter.number }}
              </p>
              <h3 class="text-xl font-semibold tracking-tight">
                {{ chapter.title }}
              </h3>
              <p class="text-sm leading-relaxed text-muted-foreground">
                {{ chapter.lead }}
              </p>
            </div>
            <section
              v-for="section in chapter.sections"
              :key="section.heading"
              class="space-y-2"
            >
              <h4 class="text-base font-medium">
                {{ section.heading }}
              </h4>
              <p
                v-for="(paragraph, index) in section.paragraphs"
                :key="`${section.heading}-p-${index}`"
                class="text-sm leading-relaxed"
              >
                {{ paragraph }}
              </p>
              <ul v-if="section.items.length" class="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                <li v-for="item in section.items" :key="item">
                  {{ item }}
                </li>
              </ul>
              <div v-if="section.table" class="overflow-x-auto rounded-md border">
                <table class="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted/60">
                      <th
                        v-for="column in section.table.columns"
                        :key="column"
                        class="border-b px-3 py-2 text-left text-xs font-semibold"
                      >
                        {{ column }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, rowIndex) in section.table.rows"
                      :key="`${section.heading}-r-${rowIndex}`"
                      class="align-top"
                    >
                      <td
                        v-for="(cell, cellIndex) in row"
                        :key="`${section.heading}-r-${rowIndex}-c-${cellIndex}`"
                        class="border-b px-3 py-2 leading-relaxed"
                      >
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="section.note" class="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                <span class="font-medium">Para tener en cuenta. </span>{{ section.note }}
              </p>
            </section>
          </article>
        </div>
      </div>
    </div>
  </SettingsLayout>
</template>
